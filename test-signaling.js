const { io } = require('./client/node_modules/socket.io-client');

async function testSignaling() {
  console.log('🧪 Starting Socket.IO matchmaking & WebRTC signaling integration test...');

  const socketA = io('http://localhost:5000', { transports: ['websocket'] });
  const socketB = io('http://localhost:5000', { transports: ['websocket'] });

  let sessionId = null;

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    socketA.on('connect', check);
    socketB.on('connect', check);
  });

  console.log('✅ Both sockets connected to signaling server');

  const matchPromise = new Promise((resolve, reject) => {
    let matchA = null;
    let matchB = null;

    socketA.on('match_found', (data) => {
      console.log('✅ Socket A received match_found:', data.sessionId, 'isInitiator:', data.isInitiator);
      matchA = data;
      if (matchA && matchB) resolve({ matchA, matchB });
    });

    socketB.on('match_found', (data) => {
      console.log('✅ Socket B received match_found:', data.sessionId, 'isInitiator:', data.isInitiator);
      matchB = data;
      if (matchA && matchB) resolve({ matchA, matchB });
    });

    setTimeout(() => reject(new Error('Match timeout')), 5000);
  });

  // User A joins queue
  socketA.emit('join_queue', {
    userId: 'user_1',
    username: 'Alice',
    displayName: 'Alice (Tokyo)',
    country: 'Japan',
  });

  // User B joins queue
  socketB.emit('join_queue', {
    userId: 'user_2',
    username: 'Bob',
    displayName: 'Bob (Paris)',
    country: 'France',
  });

  const { matchA, matchB } = await matchPromise;

  if (matchA.sessionId !== matchB.sessionId) {
    throw new Error('Session IDs do not match!');
  }
  sessionId = matchA.sessionId;
  console.log('✅ Session verified:', sessionId);

  // Test SDP offer from initiator (Socket A) to receiver (Socket B)
  const offerPromise = new Promise((resolve) => {
    socketB.on('signal_offer', (data) => {
      console.log('✅ Socket B received forwarded SDP offer for session:', data.sessionId);
      resolve(data);
    });
  });

  socketA.emit('signal_offer', {
    sessionId,
    sdp: { type: 'offer', sdp: 'v=0\r\no=alice 12345 12345 IN IP4 0.0.0.0' },
  });
  await offerPromise;

  // Test SDP answer from Socket B to Socket A
  const answerPromise = new Promise((resolve) => {
    socketA.on('signal_answer', (data) => {
      console.log('✅ Socket A received forwarded SDP answer for session:', data.sessionId);
      resolve(data);
    });
  });

  socketB.emit('signal_answer', {
    sessionId,
    sdp: { type: 'answer', sdp: 'v=0\r\no=bob 67890 67890 IN IP4 0.0.0.0' },
  });
  await answerPromise;

  // Test ICE Candidate forwarding
  const icePromise = new Promise((resolve) => {
    socketB.on('signal_ice_candidate', (data) => {
      console.log('✅ Socket B received forwarded ICE candidate');
      resolve(data);
    });
  });

  socketA.emit('signal_ice_candidate', {
    sessionId,
    candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 },
  });
  await icePromise;

  // Test in-call chat
  const chatPromise = new Promise((resolve) => {
    socketB.on('chat_message', (data) => {
      console.log('✅ Socket B received instant chat message:', data.text, 'from:', data.senderName);
      resolve(data);
    });
  });

  socketA.emit('send_chat_message', {
    sessionId,
    text: 'Hello from Tokyo!',
  });
  await chatPromise;

  // Test Next button (User A clicks next)
  const disconnectPromise = new Promise((resolve) => {
    socketB.on('peer_disconnected', (data) => {
      console.log('✅ Socket B received peer_disconnected notification:', data.message);
      resolve(data);
    });
  });

  socketA.emit('next');
  await disconnectPromise;

  socketA.disconnect();
  socketB.disconnect();

  console.log('🎉 ALL WEBRTC MATCHMAKING AND SIGNALING TESTS PASSED!');
}

testSignaling().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
