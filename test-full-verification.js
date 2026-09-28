const { io } = require('./client/node_modules/socket.io-client');
const http = require('http');

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postJson(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const url = new URL(path, SERVER_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(path, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING ORBITLIVE FINAL DEPLOYMENT-READINESS TEST');
  console.log('====================================================');

  const results = {};

  // 1. Health Endpoint Test
  console.log('\n--- 1. Testing Health Endpoint ---');
  try {
    const health = await getJson('/api/health');
    if (health.status === 200 && health.data.status === 'ok') {
      console.log('✅ GET /api/health: PASS', health.data);
      results['API_Health'] = 'PASS';
    } else {
      throw new Error(`Unexpected health status: ${health.status}`);
    }
  } catch (err) {
    console.error('❌ GET /api/health: FAIL', err.message);
    results['API_Health'] = 'FAIL';
  }

  // 2. REST Auth & Profile Test
  console.log('\n--- 2. Testing REST Authentication & Profile ---');
  let userToken = null;
  try {
    const guest = await postJson('/api/auth/guest', {});
    if (guest.status === 200 && guest.data.token && guest.data.user) {
      userToken = guest.data.token;
      console.log('✅ Guest Auth: PASS, user:', guest.data.user.username);
    } else {
      throw new Error('Guest login failed');
    }

    const me = await getJson('/api/auth/me', userToken);
    if (me.status === 200 && me.data.user) {
      console.log('✅ GET /api/auth/me: PASS, user verified');
    } else {
      throw new Error('GET /api/auth/me failed');
    }

    results['API_Auth'] = 'PASS';
  } catch (err) {
    console.error('❌ REST Auth: FAIL', err.message);
    results['API_Auth'] = 'FAIL';
  }

  // 3. Socket.IO & Two-User Matchmaking Flow
  console.log('\n--- 3. Testing Socket.IO & Two-User Matchmaking ---');
  const socketA = io(SERVER_URL, { transports: ['websocket'] });
  const socketB = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    socketA.on('connect', check);
    socketB.on('connect', check);
  });
  console.log('✅ Sockets connected successfully');

  let activeSessionId = null;
  let matchPromise = new Promise((resolve, reject) => {
    let matchA = null;
    let matchB = null;
    const timeout = setTimeout(() => reject(new Error('Match timeout')), 5000);

    socketA.on('match_found', (data) => {
      matchA = data;
      if (matchA && matchB) {
        clearTimeout(timeout);
        resolve({ matchA, matchB });
      }
    });

    socketB.on('match_found', (data) => {
      matchB = data;
      if (matchA && matchB) {
        clearTimeout(timeout);
        resolve({ matchA, matchB });
      }
    });
  });

  socketA.emit('join_queue', {
    userId: 'verified_user_A',
    username: 'Alice',
    displayName: 'Alice (Tokyo)',
    country: 'Japan',
  });

  socketB.emit('join_queue', {
    userId: 'verified_user_B',
    username: 'Bob',
    displayName: 'Bob (Paris)',
    country: 'France',
  });

  try {
    const { matchA, matchB } = await matchPromise;
    if (matchA.sessionId === matchB.sessionId && matchA.isInitiator !== matchB.isInitiator) {
      activeSessionId = matchA.sessionId;
      console.log('✅ Two-User Matchmaking: PASS, Session:', activeSessionId);
      console.log('   User A isInitiator:', matchA.isInitiator, 'User B isInitiator:', matchB.isInitiator);
      results['Two_User_Matchmaking'] = 'PASS';
    } else {
      throw new Error('Mismatch in session IDs or roles');
    }
  } catch (err) {
    console.error('❌ Two-User Matchmaking: FAIL', err.message);
    results['Two_User_Matchmaking'] = 'FAIL';
  }

  // 4. WebRTC Signaling Relay (Offer, Answer, ICE)
  console.log('\n--- 4. Testing WebRTC Signaling Relay ---');
  try {
    const initiator = socketA;
    const receiver = socketB;

    const offerPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Offer timeout')), 3000);
      receiver.on('signal_offer', (d) => {
        clearTimeout(timeout);
        resolve(d);
      });
    });

    initiator.emit('signal_offer', {
      sessionId: activeSessionId,
      sdp: { type: 'offer', sdp: 'v=0\r\no=alice 1 1 IN IP4 0.0.0.0' },
    });
    const offerData = await offerPromise;
    console.log('✅ SDP Offer relay: PASS, session:', offerData.sessionId);

    const answerPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Answer timeout')), 3000);
      initiator.on('signal_answer', (d) => {
        clearTimeout(timeout);
        resolve(d);
      });
    });

    receiver.emit('signal_answer', {
      sessionId: activeSessionId,
      sdp: { type: 'answer', sdp: 'v=0\r\no=bob 2 2 IN IP4 0.0.0.0' },
    });
    const answerData = await answerPromise;
    console.log('✅ SDP Answer relay: PASS, session:', answerData.sessionId);

    const icePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ICE candidate timeout')), 3000);
      receiver.on('signal_ice_candidate', (d) => {
        clearTimeout(timeout);
        resolve(d);
      });
    });

    initiator.emit('signal_ice_candidate', {
      sessionId: activeSessionId,
      candidate: { candidate: 'candidate:1 1 UDP 1 127.0.0.1 50000 typ host', sdpMid: '0' },
    });
    await icePromise;
    console.log('✅ ICE Candidate relay: PASS');

    results['WebRTC_Signaling'] = 'PASS';
  } catch (err) {
    console.error('❌ WebRTC Signaling: FAIL', err.message);
    results['WebRTC_Signaling'] = 'FAIL';
  }

  // 5. In-Call Chat Test
  console.log('\n--- 5. Testing In-Call Chat ---');
  try {
    const chatPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chat timeout')), 3000);
      socketB.on('chat_message', (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
    });

    socketA.emit('send_chat_message', {
      sessionId: activeSessionId,
      text: 'Verified P2P call active!',
    });

    const receivedMsg = await chatPromise;
    if (receivedMsg.text === 'Verified P2P call active!') {
      console.log('✅ Chat relay: PASS, received message:', receivedMsg.text);
      results['Chat'] = 'PASS';
    } else {
      throw new Error('Message content mismatch');
    }
  } catch (err) {
    console.error('❌ Chat: FAIL', err.message);
    results['Chat'] = 'FAIL';
  }

  // 6. Next / Session Termination & Stale Session Protection
  console.log('\n--- 6. Testing Next & Stale Session Protection ---');
  try {
    const nextNoticePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Next notice timeout')), 3000);
      socketB.on('peer_disconnected', (d) => {
        clearTimeout(timeout);
        resolve(d);
      });
    });

    // User A clicks next
    socketA.emit('next');
    const notice = await nextNoticePromise;
    console.log('✅ User B received peer_disconnected: PASS, notice:', notice.message);

    // Stale session test: Try sending offer with old sessionId; server must reject
    let staleNoticePromise = new Promise((resolve) => {
      socketB.once('signal_offer', () => resolve('SHOULD_NOT_HAPPEN'));
      socketA.once('session_stale', (d) => resolve('STALE_DETECTED'));
      setTimeout(() => resolve('IGNORED_SAFELY'), 600);
    });

    socketA.emit('signal_offer', {
      sessionId: activeSessionId,
      sdp: { type: 'offer', sdp: 'stale' },
    });

    const staleResult = await staleNoticePromise;
    if (staleResult === 'STALE_DETECTED' || staleResult === 'IGNORED_SAFELY') {
      console.log('✅ Stale session protection: PASS (old session cannot interfere)');
      results['Next_And_Stale_Protection'] = 'PASS';
    } else {
      throw new Error('Old session offer was improperly forwarded!');
    }

    // Disconnect initial test sockets so queue is clean for next tests
    socketA.disconnect();
    socketB.disconnect();
    await wait(300);
  } catch (err) {
    console.error('❌ Next / Stale Session: FAIL', err.message);
    results['Next_And_Stale_Protection'] = 'FAIL';
  }

  // 7. Anti-Self Matching Test
  console.log('\n--- 7. Testing Anti-Self Matching ---');
  const socketSelf1 = io(SERVER_URL, { transports: ['websocket'] });
  const socketSelf2 = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let c = 0;
    const ok = () => {
      c++;
      if (c === 2) resolve();
    };
    socketSelf1.on('connect', ok);
    socketSelf2.on('connect', ok);
  });

  let selfMatched = false;
  socketSelf1.on('match_found', (d) => {
    if (d.peer.userId === 'clone_user_X') selfMatched = true;
  });
  socketSelf2.on('match_found', (d) => {
    if (d.peer.userId === 'clone_user_X') selfMatched = true;
  });

  socketSelf1.emit('join_queue', {
    userId: 'clone_user_X',
    username: 'CloneX_Tab1',
  });
  await wait(100);
  socketSelf2.emit('join_queue', {
    userId: 'clone_user_X',
    username: 'CloneX_Tab2',
  });

  await wait(800);
  if (!selfMatched) {
    console.log('✅ Anti-Self Matching: PASS (User with same userId cannot match with themselves)');
    results['Anti_Self_Match'] = 'PASS';
  } else {
    console.error('❌ Anti-Self Matching: FAIL (Matched with self!)');
    results['Anti_Self_Match'] = 'FAIL';
  }

  socketSelf1.disconnect();
  socketSelf2.disconnect();
  await wait(300);

  // 8. Block & Anti-Rematch Test
  console.log('\n--- 8. Testing User Blocking & Rematch Prevention ---');
  const socketBlkA = io(SERVER_URL, { transports: ['websocket'] });
  const socketBlkB = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let c = 0;
    const ok = () => {
      c++;
      if (c === 2) resolve();
    };
    socketBlkA.on('connect', ok);
    socketBlkB.on('connect', ok);
  });

  // User A blocks User B
  socketBlkA.emit('block_user', {
    blockerUserId: 'blocker_user',
    blockedUserId: 'blocked_target_user',
  });
  await wait(300);

  // Both join queue
  let blockedPairMatched = false;
  socketBlkA.on('match_found', (d) => {
    if (d.peer.userId === 'blocked_target_user') blockedPairMatched = true;
  });
  socketBlkB.on('match_found', (d) => {
    if (d.peer.userId === 'blocker_user') blockedPairMatched = true;
  });

  socketBlkA.emit('join_queue', {
    userId: 'blocker_user',
    username: 'Blocker',
  });
  socketBlkB.emit('join_queue', {
    userId: 'blocked_target_user',
    username: 'BlockedTarget',
  });

  await wait(1000);
  if (!blockedPairMatched) {
    console.log('✅ Block & Anti-Rematch: PASS (Blocked users cannot be matched)');
    results['Block'] = 'PASS';
  } else {
    console.error('❌ Block & Anti-Rematch: FAIL (Blocked users were matched!)');
    results['Block'] = 'FAIL';
  }

  socketBlkA.disconnect();
  socketBlkB.disconnect();
  await wait(200);

  // 9. Report Submission Test
  console.log('\n--- 9. Testing User Report Submission ---');
  try {
    const reportRes = await postJson(
      '/api/moderation/report',
      {
        reportedUserId: 'bad_actor_123',
        reason: 'Inappropriate video feed',
        details: 'Automated test report verification',
      },
      userToken
    );

    if (reportRes.status === 201 && reportRes.data.message) {
      console.log('✅ User Report submission: PASS');
      results['Report'] = 'PASS';
    } else {
      throw new Error(`Report submission returned status: ${reportRes.status}`);
    }
  } catch (err) {
    console.error('❌ User Report: FAIL', err.message);
    results['Report'] = 'FAIL';
  }

  console.log('\n====================================================');
  console.log('📊 FINAL TEST RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');

  const failed = Object.entries(results).filter(([_, status]) => status === 'FAIL');
  if (failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
