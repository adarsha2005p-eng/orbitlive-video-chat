// ============================================================
// CONTEXTUAL REPLIES FOCUSED REGRESSION TEST
// Tests natural, contextual answering without filler or pronoun echo.
// ============================================================

const prompts = require('./prompts');
const ollama = require('./ollama');

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

const MALFORMED_FILLERS = [
  'normal toh chl rhi',
  'kuch khaakar sunkar',
  'aisa hi laga',
  'kuch duniya ki sahayat',
  'kuch duniya ke saath khel'
];

function hasNoMalformedFiller(text) {
  const lower = String(text || '').toLowerCase();
  return !MALFORMED_FILLERS.some(f => lower.includes(f));
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING CONTEXTUAL REPLIES FOCUSED REGRESSION TEST');
  console.log('============================================================\n');

  const sys = prompts.buildSystemPrompt({ userName: 'Adarsha' });

  // 1. "aaj kya kar rahi ho?"
  console.log('--- 1. "aaj kya kar rahi ho?" ---');
  const msgs1 = prompts.buildMessages(sys, [], 'aaj kya kar rahi ho?');
  const r1 = await ollama.chatOnce({ messages: msgs1, temperature: 0.85 });
  console.log(`  Reply: "${r1}"`);
  assert(r1 && r1.trim().length > 0, '1. Response is non-empty');
  assert(hasNoMalformedFiller(r1), '1. Does not contain malformed filler');
  assert(
    r1.toLowerCase().includes('chill') || r1.toLowerCase().includes('phone') || r1.toLowerCase().includes('baithi') || r1.toLowerCase().includes('aaram'),
    '1. Answers current activity naturally'
  );

  // History for subsequent contextual follow-ups
  const hist = [
    { role: 'user', content: 'aaj kya kar rahi ho?' },
    { role: 'assistant', content: 'Bas aise hi chill kar rahi hu 😌 thoda phone chala rahi hu. Tum kya kar rahe ho?' }
  ];

  // 2. "akeli?"
  console.log('\n--- 2. "akeli?" ---');
  const msgs2 = prompts.buildMessages(sys, hist, 'akeli?');
  const r2 = await ollama.chatOnce({ messages: msgs2, temperature: 0.85 });
  console.log(`  Reply: "${r2}"`);
  assert(r2 && r2.trim().length > 0, '2. Response is non-empty');
  assert(hasNoMalformedFiller(r2), '2. Does not contain malformed filler');
  assert(!r2.toLowerCase().includes('akela'), '2. Does not use wrong masculine gender ("akela")');
  assert(r2.toLowerCase().includes('akeli') || r2.toLowerCase().includes('haan') || r2.toLowerCase().includes('ghar'), '2. Contextually answers question about being alone');

  // 3. "bore nahi ho rahi?"
  console.log('\n--- 3. "bore nahi ho rahi?" ---');
  const msgs3 = prompts.buildMessages(sys, hist, 'bore nahi ho rahi?');
  const r3 = await ollama.chatOnce({ messages: msgs3, temperature: 0.85 });
  console.log(`  Reply: "${r3}"`);
  assert(r3 && r3.trim().length > 0, '3. Response is non-empty');
  assert(hasNoMalformedFiller(r3), '3. Does not contain malformed filler');
  assert(
    r3.toLowerCase().includes('nahi') || r3.toLowerCase().includes('tumse') || r3.toLowerCase().includes('baat'),
    '3. Answers boredom check directly and warmly'
  );

  // 4. "mere saath baat karke acha lag raha hai?"
  console.log('\n--- 4. "mere saath baat karke acha lag raha hai?" ---');
  const msgs4 = prompts.buildMessages(sys, hist, 'mere saath baat karke acha lag raha hai?');
  const r4 = await ollama.chatOnce({ messages: msgs4, temperature: 0.85 });
  console.log(`  Reply: "${r4}"`);
  assert(r4 && r4.trim().length > 0, '4. Response is non-empty');
  assert(hasNoMalformedFiller(r4), '4. Does not contain malformed filler');
  assert(!r4.toLowerCase().includes('mere saath baat karke'), '4. Does not echo user pronoun phrase ("mere saath baat karke")');
  assert(
    r4.toLowerCase().includes('haan') || r4.toLowerCase().includes('bilkul') || r4.toLowerCase().includes('acha') || r4.toLowerCase().includes('tumse'),
    '4. Warmly and naturally confirms feeling good talking to user'
  );

  // 5. "ky kar rahi ho?"
  console.log('\n--- 5. "ky kar rahi ho?" ---');
  const msgs5 = prompts.buildMessages(sys, [], 'ky kar rahi ho?');
  const r5 = await ollama.chatOnce({ messages: msgs5, temperature: 0.85 });
  console.log(`  Reply: "${r5}"`);
  assert(r5 && r5.trim().length > 0, '5. Response is non-empty');
  assert(hasNoMalformedFiller(r5), '5. Does not contain malformed filler');
  assert(
    r5.toLowerCase().includes('chill') || r5.toLowerCase().includes('baithi') || r5.toLowerCase().includes('kuch khaas nahi'),
    '5. Standard current activity inquiry answered smoothly'
  );

  // History for "kese" tests
  const chillHist = [
    { role: 'user', content: 'ky kar rahi ho?' },
    { role: 'assistant', content: 'Bas chill kar rahi hu 😌' }
  ];

  // 6. "kese"
  console.log('\n--- 6. "kese" ---');
  const msgs6 = prompts.buildMessages(sys, chillHist, 'kese');
  const r6 = await ollama.chatOnce({ messages: msgs6, temperature: 0.85 });
  console.log(`  Reply: "${r6}"`);
  assert(r6 && r6.trim().length > 0, '6. Response is non-empty');
  assert(hasNoMalformedFiller(r6), '6. Does not contain malformed filler');
  assert(!r6.toLowerCase().includes('mujhe kaise pata'), '6. Does not deflect with "Mujhe kaise pata"');

  // 7. "tum kese chill kar rahi ho"
  console.log('\n--- 7. "tum kese chill kar rahi ho" ---');
  const msgs7 = prompts.buildMessages(sys, chillHist, 'tum kese chill kar rahi ho');
  const r7 = await ollama.chatOnce({ messages: msgs7, temperature: 0.85 });
  console.log(`  Reply: "${r7}"`);
  assert(r7 && r7.trim().length > 0, '7. Response is non-empty');
  assert(hasNoMalformedFiller(r7), '7. Does not contain malformed filler');
  assert(!r7.toLowerCase().includes('mujhe kaise pata'), '7. Does not deflect with "Mujhe kaise pata"');

  console.log('\n============================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('============================================================');
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total:   ${total}`);
  const score = Math.round((passed / total) * 100);
  console.log(`Score:   ${score}%`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
