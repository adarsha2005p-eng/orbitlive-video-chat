// ============================================================
// LASYA TERMINAL CHAT (CLI)
// Chat directly with Lasya inside your terminal.
// Run with: node chat.js
// ============================================================

const readline = require('readline');
const prompts = require('./prompts');
const ollama = require('./ollama');
const storage = require('./storage');
const rel = require('./relationship');
const { getSmartReply } = require('./smartReplies');
const { extractMemories } = require('./memoryExtractor');

const USER_ID = 'terminal_user';

async function main() {
  console.log('\n============================================================');
  console.log('🌸 LASYA — TERMINAL CHAT');
  console.log('Type your message and press Enter.');
  console.log('Type "exit" or "quit" to leave.');
  console.log('============================================================\n');

  // Check Ollama reachability
  const ping = await ollama.ping();
  if (!ping.ok) {
    console.warn('⚠️  Warning: Ollama does not seem to be reachable at ' + (ollama.getHost ? ollama.getHost() : 'http://127.0.0.1:11434'));
    console.warn('   Make sure "ollama serve" is running.\n');
  }

  // Load or initialize profile
  let profile = await storage.getProfile(USER_ID);
  if (!profile) {
    profile = {
      id: USER_ID,
      name: 'Adarsha',
      character: { name: 'Lasya' },
      relationshipScore: 10,
      totalMessages: 0
    };
    await storage.saveProfile(USER_ID, profile);
  }

  // Get or create session
  let sessions = await storage.listSessions(USER_ID);
  let sessionId = sessions && sessions.length ? sessions[0] : 'cli_session';
  let session = await storage.getSession(USER_ID, sessionId);
  if (!session) {
    sessionId = (await storage.createSession(USER_ID, { title: 'Terminal Chat' })).id;
  }

  const memory = await storage.getMemory(USER_ID);
  const stage = rel.getStage(profile.relationshipScore || 10);
  console.log(`👤 User: ${profile.name} | 💕 Stage: ${stage.emoji} ${stage.label} (Score: ${profile.relationshipScore || 10})`);
  console.log(`🤖 Model: ${ollama.MODEL || ollama.getModel() || 'qwen2.5:7b'}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('\nYou: ', async (input) => {
      const text = String(input || '').trim();
      if (!text) {
        promptUser();
        return;
      }

      if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
        console.log('\nLasya: Byee 😌 Take care!\n');
        rl.close();
        process.exit(0);
      }

      try {
        // 1. Check Smart Reply first
        const mem = await storage.getMemory(USER_ID);
        let reply = getSmartReply(text, mem?.facts || []);

        if (reply) {
          console.log(`\nLasya: ${reply}`);
        } else {
          // 2. Normal AI chat with streaming tokens
          const currentProfile = await storage.getProfile(USER_ID);
          const currentStage = rel.getStage(currentProfile.relationshipScore || 10);
          const currentMem = await storage.getMemory(USER_ID);

          const systemPrompt = prompts.buildSystemPrompt({
            character: currentProfile.character,
            userName: currentProfile.name,
            memory: currentMem.facts || []
          });

          const history = (await storage.getMessages(USER_ID, sessionId)) || [];
          const messages = prompts.buildMessages(systemPrompt, history, text);

          process.stdout.write('\nLasya: ');
          reply = await ollama.chatStream({
            messages,
            temperature: 0.85,
            onToken: (token) => process.stdout.write(token)
          });
          console.log(); // Newline after stream
        }

        // Save conversation history
        await storage.appendMessage(USER_ID, sessionId, { role: 'user', content: text });
        await storage.appendMessage(USER_ID, sessionId, { role: 'assistant', content: reply });

        // Update relationship score
        const scoreUpdate = rel.applyPoints(profile.relationshipScore || 10, text);
        profile.relationshipScore = scoreUpdate.score;
        profile.totalMessages = (profile.totalMessages || 0) + 1;
        await storage.saveProfile(USER_ID, profile);

        // Memory extraction in background
        extractMemories(text, reply)
          .then(async (facts) => {
            if (facts && facts.length) {
              for (const f of facts) {
                await storage.updateMemory(USER_ID, f);
              }
            }
          })
          .catch(() => {});

      } catch (err) {
        console.error(`\n⚠️  Error: ${err.message}`);
      }

      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
