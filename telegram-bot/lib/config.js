import 'dotenv/config';

const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_USER_ID', 'OPENAI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramUserId: parseInt(process.env.TELEGRAM_USER_ID, 10),
  openaiApiKey: process.env.OPENAI_API_KEY,
  repoPath: '/Users/hillmanchan/Desktop/HillmanChan_portfolio',
  worktreeBase: '/tmp/telegram-bot-worktree',
  tempBase: '/tmp/telegram-bot',
  executionTimeoutMs: 5 * 60 * 1000,       // 5 minutes
  confirmationTimeoutMs: 30 * 60 * 1000,   // 30 minutes
};
