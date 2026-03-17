# Telegram Claude Code Bot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram bot that accepts text, voice, image, and documents, passes them to Claude Code CLI to update the system-design portfolio, shows diffs, and creates PRs on confirmation.

**Architecture:** Node.js long-running process on local Mac. Telegram Bot API for user interaction, OpenAI Whisper for voice-to-text, Claude Code CLI (`claude -p`) for code changes, git worktrees for isolation. Two-phase confirmation flow: plan → confirm → execute → review diff → confirm → commit + PR.

**Tech Stack:** Node.js 22, `node-telegram-bot-api`, `openai` (Whisper), `child_process` (Claude CLI + git), `dotenv`, `uuid`

**Spec:** `docs/superpowers/specs/2026-03-17-telegram-claude-code-bot-design.md`

---

## File Structure

```
telegram-bot/
├── index.js              # Entry point — bot startup, cleanup, message routing
├── lib/
│   ├── config.js         # Load .env, validate required vars, export constants
│   ├── state.js          # In-memory job state management (isBusy, currentJob)
│   ├── auth.js           # Telegram user ID check — reject unauthorized users
│   ├── input.js          # Process text/voice/image/document inputs
│   ├── claude.js         # Spawn claude CLI, parse stream-json output
│   ├── git.js            # Worktree create/remove, diff, commit, push, PR
│   └── telegram.js       # Message formatting, diff chunking, inline keyboards
├── package.json
├── .env                  # TELEGRAM_BOT_TOKEN, TELEGRAM_USER_ID, OPENAI_API_KEY
└── .gitignore            # .env, node_modules
```

---

## Chunk 1: Project Setup + Core Infrastructure

### Task 1: Project Scaffold

**Files:**
- Create: `telegram-bot/package.json`
- Create: `telegram-bot/.gitignore`
- Create: `telegram-bot/.env.example`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "telegram-claude-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "openai": "^4.73.0",
    "dotenv": "^16.4.0",
    "uuid": "^11.1.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.env
```

- [ ] **Step 3: Create .env.example**

```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_USER_ID=your-telegram-user-id
OPENAI_API_KEY=your-openai-api-key
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot && npm install`
Expected: `node_modules/` created, no errors

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/package.json telegram-bot/.gitignore telegram-bot/.env.example telegram-bot/package-lock.json
git commit -m "feat(telegram-bot): scaffold project with dependencies"
```

---

### Task 2: Config Module

**Files:**
- Create: `telegram-bot/lib/config.js`

- [ ] **Step 1: Write config.js**

```js
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
```

- [ ] **Step 2: Verify config loads**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot && node -e "import('./lib/config.js').then(m => console.log('OK', Object.keys(m.config)))"`
Expected: Error about missing env vars (no .env yet), confirming validation works

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/lib/config.js
git commit -m "feat(telegram-bot): add config module with env validation"
```

---

### Task 3: State Management

**Files:**
- Create: `telegram-bot/lib/state.js`

- [ ] **Step 1: Write state.js**

```js
import { v4 as uuidv4 } from 'uuid';

const state = {
  isBusy: false,
  currentJob: null,
};

export function createJob(userMessage) {
  const id = uuidv4().slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const slug = userMessage
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff ]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .toLowerCase()
    .slice(0, 30) || 'update';
  const branchName = `telegram/${today}-${slug}-${id}`;

  state.currentJob = {
    id,
    userMessage,
    phase: 'planning',
    plannedChanges: null,
    worktreePath: null,
    branchName,
    startedAt: new Date(),
    claudeProcess: null,
    confirmationTimer: null,
  };
  state.isBusy = true;
  return state.currentJob;
}

export function getJob() {
  return state.currentJob;
}

export function updateJob(updates) {
  if (state.currentJob) {
    Object.assign(state.currentJob, updates);
  }
}

export function clearJob() {
  if (state.currentJob?.confirmationTimer) {
    clearTimeout(state.currentJob.confirmationTimer);
  }
  state.currentJob = null;
  state.isBusy = false;
}

export function isBusy() {
  return state.isBusy;
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/state.js
git commit -m "feat(telegram-bot): add in-memory job state management"
```

---

### Task 4: Auth Module

**Files:**
- Create: `telegram-bot/lib/auth.js`

- [ ] **Step 1: Write auth.js**

```js
import { config } from './config.js';

export function isAuthorized(msg) {
  return msg.from?.id === config.telegramUserId;
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/auth.js
git commit -m "feat(telegram-bot): add telegram user auth check"
```

---

## Chunk 2: Input Processing

### Task 5: Input Processor

**Files:**
- Create: `telegram-bot/lib/input.js`

- [ ] **Step 1: Write input.js**

```js
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export async function processInput(bot, msg) {
  const jobId = Date.now().toString(36);
  const tempDir = path.join(config.tempBase, jobId);
  await fs.mkdir(tempDir, { recursive: true });

  const parts = [];
  const filePaths = [];

  // Text
  if (msg.text && !msg.text.startsWith('/')) {
    parts.push(msg.text);
  }

  // Caption (for photos/documents with text)
  if (msg.caption) {
    parts.push(msg.caption);
  }

  // Voice
  if (msg.voice || msg.audio) {
    const fileId = (msg.voice || msg.audio).file_id;
    const text = await transcribeVoice(bot, fileId, tempDir);
    parts.push(text);
  }

  // Photo (take highest resolution)
  if (msg.photo) {
    const photo = msg.photo[msg.photo.length - 1];
    const filePath = await downloadFile(bot, photo.file_id, tempDir, 'photo.jpg');
    filePaths.push(filePath);
  }

  // Document
  if (msg.document) {
    const doc = msg.document;
    const filePath = await downloadFile(bot, doc.file_id, tempDir, doc.file_name || 'document');
    const textExts = ['.md', '.json', '.txt', '.csv', '.jsx', '.js', '.ts', '.py'];
    if (textExts.some(ext => filePath.endsWith(ext))) {
      const content = await fs.readFile(filePath, 'utf-8');
      parts.push(`\n--- File: ${doc.file_name} ---\n${content}\n---`);
    } else {
      filePaths.push(filePath);
    }
  }

  return { text: parts.join('\n'), filePaths, tempDir };
}

async function transcribeVoice(bot, fileId, tempDir) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const audioPath = path.join(tempDir, 'voice.oga');
  await fs.writeFile(audioPath, buffer);

  const { createReadStream } = await import('fs');
  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: 'whisper-1',
  });

  return transcription.text;
}

async function downloadFile(bot, fileId, tempDir, filename) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const filePath = path.join(tempDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTempDir(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/input.js
git commit -m "feat(telegram-bot): add input processor for text/voice/image/document"
```

---

## Chunk 3: Claude Code + Git Integration

### Task 6: Claude Code Runner

**Files:**
- Create: `telegram-bot/lib/claude.js`

- [ ] **Step 1: Write claude.js**

```js
import { spawn } from 'child_process';
import { config } from './config.js';

/**
 * Spawn claude CLI and return { promise, process }.
 * Caller should store `process` on the job for cancellation support.
 */
export function runClaude(prompt, { cwd, allowedTools }) {
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
  ];

  if (allowedTools) {
    args.push('--allowedTools', allowedTools);
  }

  const proc = spawn('claude', args, {
    cwd: cwd || config.repoPath,
    env: { ...process.env, HOME: process.env.HOME },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const promise = new Promise((resolve, reject) => {
    let stderr = '';
    let resultText = '';
    let lineBuffer = ''; // buffer for partial JSON lines

    proc.stdout.on('data', (data) => {
      lineBuffer += data.toString();
      const lines = lineBuffer.split('\n');
      // Keep the last (possibly incomplete) line in buffer
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'result' && parsed.result) {
            resultText = parsed.result;
          }
        } catch {
          // partial or non-JSON line, skip
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Execution timeout (5 minutes)'));
    }, config.executionTimeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      // Process any remaining buffered line
      if (lineBuffer.trim()) {
        try {
          const parsed = JSON.parse(lineBuffer);
          if (parsed.type === 'result' && parsed.result) {
            resultText = parsed.result;
          }
        } catch { /* ignore */ }
      }
      if (code !== 0 && !resultText) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve({ text: resultText });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  return { promise, process: proc };
}

export function runClaudePlanning(userText, filePaths = []) {
  let prompt = `You are working in ${config.repoPath}.
The user sent the following instruction via Telegram:

${userText}`;

  if (filePaths.length > 0) {
    prompt += `\n\nAttached files:\n${filePaths.map(f => `- ${f}`).join('\n')}`;
  }

  prompt += `\n\nList what changes you plan to make. Be specific about which files you will create or modify. Do NOT execute any changes yet.`;

  return runClaude(prompt, {
    allowedTools: 'Read,Glob,Grep',
  });
}

export function runClaudeExecute(plannedChanges, userText, worktreePath) {
  const prompt = `You are working in ${worktreePath}.
The user's original instruction was:

${userText}

Execute the following planned changes:

${plannedChanges}

IMPORTANT:
- Only modify files within portfolio/src/game/system-design/ and related data files
- Do NOT touch .env files, service account keys, or credential files
- After making all changes, suggest a git commit message on a line starting with "COMMIT_MSG:"`;

  return runClaude(prompt, {
    cwd: worktreePath,
    allowedTools: 'Edit,Write,Bash,Read,Glob,Grep',
  });
}

export function extractCommitMessage(claudeOutput) {
  const match = claudeOutput.match(/COMMIT_MSG:\s*(.+)/);
  return match ? match[1].trim() : 'feat: update via telegram bot';
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/claude.js
git commit -m "feat(telegram-bot): add claude code CLI runner with planning and execution"
```

---

### Task 7: Git Manager

**Files:**
- Create: `telegram-bot/lib/git.js`

- [ ] **Step 1: Write git.js**

```js
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

const exec = promisify(execFile);

function git(args, cwd) {
  return exec('git', args, { cwd: cwd || config.repoPath, maxBuffer: 10 * 1024 * 1024 });
}

export async function startupCleanup() {
  // Clean stale worktrees
  try {
    const entries = await fs.readdir(config.worktreeBase).catch(() => []);
    for (const entry of entries) {
      const worktreePath = path.join(config.worktreeBase, entry);
      try {
        await git(['worktree', 'remove', '--force', worktreePath]);
      } catch {
        // force remove directory if git worktree remove fails
        await fs.rm(worktreePath, { recursive: true, force: true });
      }
    }
  } catch {
    // worktreeBase doesn't exist yet, that's fine
  }

  // Clean orphaned telegram/* branches
  try {
    const { stdout } = await git(['branch', '--list', 'telegram/*']);
    const branches = stdout.split('\n').map(b => b.trim()).filter(Boolean);
    for (const branch of branches) {
      try {
        await git(['branch', '-D', branch]);
      } catch {
        // ignore
      }
    }
  } catch {
    // no branches to clean
  }

  // Clean temp files
  try {
    const entries = await fs.readdir(config.tempBase).catch(() => []);
    for (const entry of entries) {
      await fs.rm(path.join(config.tempBase, entry), { recursive: true, force: true });
    }
  } catch {
    // tempBase doesn't exist yet
  }
}

export async function createWorktree(jobId, branchName) {
  await fs.mkdir(config.worktreeBase, { recursive: true });
  const worktreePath = path.join(config.worktreeBase, jobId);

  await git(['fetch', 'origin', 'main']);
  await git(['worktree', 'add', worktreePath, '-b', branchName, 'origin/main']);

  return worktreePath;
}

export async function getDiff(worktreePath) {
  // Get diff of all changes (staged and unstaged)
  const { stdout: untrackedOut } = await git(['ls-files', '--others', '--exclude-standard'], worktreePath);
  const untracked = untrackedOut.split('\n').filter(Boolean);

  // Stage everything to get a clean diff
  await git(['add', '-A'], worktreePath);
  const { stdout: diff } = await git(['diff', '--cached', '--stat'], worktreePath);
  const { stdout: diffFull } = await git(['diff', '--cached'], worktreePath);

  // Unstage so user can review before final commit
  await git(['reset', 'HEAD'], worktreePath);

  return { summary: diff, full: diffFull, newFiles: untracked };
}

export async function commitAndPush(worktreePath, branchName, commitMessage) {
  await git(['add', '-A'], worktreePath);
  await git(['commit', '-m', commitMessage], worktreePath);
  await git(['push', 'origin', branchName], worktreePath);
}

export async function createPR(branchName, title, body) {
  const { stdout } = await exec('gh', [
    'pr', 'create',
    '--base', 'main',
    '--head', branchName,
    '--title', title,
    '--body', body,
  ], { cwd: config.repoPath });
  return stdout.trim();
}

export async function cleanupWorktree(worktreePath, branchName) {
  try {
    await git(['worktree', 'remove', '--force', worktreePath]);
  } catch {
    await fs.rm(worktreePath, { recursive: true, force: true });
  }
  try {
    await git(['branch', '-D', branchName]);
  } catch {
    // branch may not exist or already deleted
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/git.js
git commit -m "feat(telegram-bot): add git worktree, diff, commit, and PR manager"
```

---

## Chunk 4: Telegram Formatting + Main Bot

### Task 8: Telegram Message Formatter

**Files:**
- Create: `telegram-bot/lib/telegram.js`

- [ ] **Step 1: Write telegram.js**

```js
const MAX_MSG_LENGTH = 4000; // slightly under 4096 to leave room for formatting

export function chunkDiff(diffOutput) {
  if (!diffOutput || diffOutput.length <= MAX_MSG_LENGTH) {
    return [formatDiffBlock(diffOutput || 'No changes detected.')];
  }

  const chunks = [];
  let current = '';

  const lines = diffOutput.split('\n');
  for (const line of lines) {
    if (current.length + line.length + 1 > MAX_MSG_LENGTH) {
      chunks.push(formatDiffBlock(current));
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) {
    chunks.push(formatDiffBlock(current));
  }

  return chunks;
}

function formatDiffBlock(text) {
  return `<pre>${escapeHtml(text)}</pre>`;
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatPlan(planText) {
  if (planText.length <= MAX_MSG_LENGTH) {
    return [planText];
  }
  const chunks = [];
  let current = '';
  const lines = planText.split('\n');
  for (const line of lines) {
    if (current.length + line.length + 1 > MAX_MSG_LENGTH) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export const keyboards = {
  confirmExecute: {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Execute', callback_data: 'confirm_execute' },
        { text: '❌ Cancel', callback_data: 'cancel_job' },
      ]],
    },
  },
  confirmCommit: {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Commit + PR', callback_data: 'confirm_commit' },
        { text: '❌ Revert', callback_data: 'cancel_job' },
      ]],
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/lib/telegram.js
git commit -m "feat(telegram-bot): add telegram message formatting and keyboards"
```

---

### Task 9: Main Bot Entry Point

**Files:**
- Create: `telegram-bot/index.js`

- [ ] **Step 1: Write index.js**

```js
import TelegramBot from 'node-telegram-bot-api';
import { config } from './lib/config.js';
import { isAuthorized } from './lib/auth.js';
import { processInput, cleanupTempDir } from './lib/input.js';
import { runClaudePlanning, runClaudeExecute, extractCommitMessage } from './lib/claude.js';
import { startupCleanup, createWorktree, getDiff, commitAndPush, createPR, cleanupWorktree } from './lib/git.js';
import { chunkDiff, formatPlan, keyboards, escapeHtml } from './lib/telegram.js';
import { createJob, getJob, updateJob, clearJob, isBusy } from './lib/state.js';

const bot = new TelegramBot(config.telegramToken, { polling: true });

// Startup cleanup
console.log('Starting Telegram Claude Code Bot...');
await startupCleanup();
console.log('Startup cleanup complete.');

// --- Commands ---

bot.onText(/\/start/, (msg) => {
  if (!isAuthorized(msg)) return;
  bot.sendMessage(msg.chat.id, 'Telegram Claude Code Bot ready.\n\nSend me text, voice, images, or documents to update the system-design project.\n\n/status — check current job\n/cancel — abort current operation\n/help — show this message');
});

bot.onText(/\/help/, (msg) => {
  if (!isAuthorized(msg)) return;
  bot.sendMessage(msg.chat.id, '/status — check current job\n/cancel — abort current operation\n/help — show commands');
});

bot.onText(/\/status/, (msg) => {
  if (!isAuthorized(msg)) return;
  const job = getJob();
  if (!job) {
    bot.sendMessage(msg.chat.id, 'No active job. Ready for new instructions.');
    return;
  }
  bot.sendMessage(msg.chat.id, `Active job:\n- Phase: ${job.phase}\n- Branch: ${job.branchName}\n- Started: ${job.startedAt.toLocaleTimeString()}`);
});

bot.onText(/\/cancel/, async (msg) => {
  if (!isAuthorized(msg)) return;
  await cancelCurrentJob(msg.chat.id);
});

// --- Callback Queries (inline keyboard buttons) ---

bot.on('callback_query', async (query) => {
  // Answer immediately to prevent Telegram timeout
  await bot.answerCallbackQuery(query.id);

  // Auth check on callback queries
  if (query.from?.id !== config.telegramUserId) return;

  const job = getJob();
  if (!job) {
    bot.sendMessage(query.message.chat.id, 'No active job.');
    return;
  }

  if (query.data === 'confirm_execute') {
    await handleExecute(query.message.chat.id);
  } else if (query.data === 'confirm_commit') {
    await handleCommit(query.message.chat.id);
  } else if (query.data === 'cancel_job') {
    await cancelCurrentJob(query.message.chat.id);
  }
});

// --- Message Handler (text, voice, photo, document) ---

bot.on('message', async (msg) => {
  if (!isAuthorized(msg)) return;
  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;

  // If confirming, treat text as refinement
  const job = getJob();
  if (job && job.phase === 'confirming' && msg.text) {
    await handleRefinement(msg.chat.id, msg.text);
    return;
  }

  // Reject if busy
  if (isBusy()) {
    bot.sendMessage(msg.chat.id, 'Busy — use /status to check or /cancel to abort.');
    return;
  }

  // Process input
  try {
    const { text, filePaths, tempDir } = await processInput(bot, msg);
    if (!text && filePaths.length === 0) {
      bot.sendMessage(msg.chat.id, 'Could not extract any input. Send text, voice, image, or a document.');
      return;
    }

    const newJob = createJob(text || 'process attached files');
    updateJob({ tempDir, filePaths });

    bot.sendMessage(msg.chat.id, 'Analyzing your instruction...');

    // Phase 1: Planning — runClaudePlanning returns { promise, process }
    const { promise, process: proc } = runClaudePlanning(text, filePaths);
    updateJob({ claudeProcess: proc });
    const result = await promise;
    updateJob({ phase: 'confirming', plannedChanges: result.text, claudeProcess: null });

    // Send plan and ask for confirmation
    const planChunks = formatPlan(result.text);
    for (const chunk of planChunks) {
      await bot.sendMessage(msg.chat.id, chunk);
    }
    await bot.sendMessage(msg.chat.id, 'Confirm execute?\n(Or reply with text to refine)', keyboards.confirmExecute);

    // Set confirmation timeout
    const timer = setTimeout(async () => {
      const currentJob = getJob();
      if (currentJob && currentJob.phase === 'confirming') {
        if (currentJob.worktreePath) {
          await cleanupWorktree(currentJob.worktreePath, currentJob.branchName);
        }
        if (currentJob.tempDir) {
          await cleanupTempDir(currentJob.tempDir);
        }
        clearJob();
        bot.sendMessage(msg.chat.id, 'Confirmation timed out (30 min). Job cancelled.');
      }
    }, config.confirmationTimeoutMs);
    updateJob({ confirmationTimer: timer });

  } catch (err) {
    console.error('Planning error:', err);
    clearJob();
    bot.sendMessage(msg.chat.id, `Error during planning: ${err.message}`);
  }
});

// --- Shared cancel logic ---

async function cancelCurrentJob(chatId) {
  const job = getJob();
  if (!job) {
    bot.sendMessage(chatId, 'No active job to cancel.');
    return;
  }
  if (job.claudeProcess) {
    try { job.claudeProcess.kill('SIGTERM'); } catch {}
  }
  if (job.worktreePath) {
    await cleanupWorktree(job.worktreePath, job.branchName);
  }
  if (job.tempDir) {
    await cleanupTempDir(job.tempDir);
  }
  clearJob();
  bot.sendMessage(chatId, 'Job cancelled and cleaned up.');
}

// --- Phase Handlers ---

async function handleRefinement(chatId, refinementText) {
  const job = getJob();
  const updatedMessage = `${job.userMessage}\n\nRefinement: ${refinementText}`;
  updateJob({ userMessage: updatedMessage, phase: 'planning' });

  bot.sendMessage(chatId, 'Re-analyzing with your refinement...');

  try {
    const { promise, process: proc } = runClaudePlanning(updatedMessage, job.filePaths || []);
    updateJob({ claudeProcess: proc });
    const result = await promise;
    updateJob({ phase: 'confirming', plannedChanges: result.text, claudeProcess: null });

    const planChunks = formatPlan(result.text);
    for (const chunk of planChunks) {
      await bot.sendMessage(chatId, chunk);
    }
    await bot.sendMessage(chatId, 'Updated plan. Confirm?', keyboards.confirmExecute);
  } catch (err) {
    console.error('Refinement error:', err);
    clearJob();
    bot.sendMessage(chatId, `Error: ${err.message}`);
  }
}

async function handleExecute(chatId) {
  const job = getJob();
  updateJob({ phase: 'executing' });

  try {
    bot.sendMessage(chatId, 'Executing...');
    const worktreePath = await createWorktree(job.id, job.branchName);
    updateJob({ worktreePath });

    // Phase 2: Execute — store process for cancellation
    const { promise, process: proc } = runClaudeExecute(job.plannedChanges, job.userMessage, worktreePath);
    updateJob({ claudeProcess: proc });
    const result = await promise;
    updateJob({ claudeProcess: null });

    const commitMsg = extractCommitMessage(result.text);
    updateJob({ phase: 'reviewing', commitMessage: commitMsg });

    // Get and display diff
    const { summary, full, newFiles } = await getDiff(worktreePath);

    if (!summary.trim() && newFiles.length === 0) {
      bot.sendMessage(chatId, 'No changes were made. Cleaning up...');
      await cleanupWorktree(worktreePath, job.branchName);
      clearJob();
      return;
    }

    await bot.sendMessage(chatId, `Changes summary:\n<pre>${escapeHtml(summary)}</pre>`, { parse_mode: 'HTML' });

    const diffChunks = chunkDiff(full);
    for (const chunk of diffChunks) {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'HTML' });
    }

    await bot.sendMessage(chatId, `Commit message: "${commitMsg}"\n\nConfirm commit + PR?`, keyboards.confirmCommit);

  } catch (err) {
    console.error('Execution error:', err);
    if (job.worktreePath) {
      await cleanupWorktree(job.worktreePath, job.branchName);
    }
    clearJob();
    bot.sendMessage(chatId, `Execution failed: ${err.message}`);
  }
}

async function handleCommit(chatId) {
  const job = getJob();

  try {
    bot.sendMessage(chatId, 'Committing and creating PR...');

    await commitAndPush(job.worktreePath, job.branchName, job.commitMessage);

    const prBody = `Triggered via Telegram.\n\n**Original instruction:**\n${job.userMessage}\n\n**Planned changes:**\n${job.plannedChanges?.slice(0, 500) || 'N/A'}`;
    const prUrl = await createPR(job.branchName, job.commitMessage, prBody);

    // Cleanup worktree but keep remote branch (PR needs it)
    try {
      await cleanupWorktree(job.worktreePath, job.branchName);
    } catch { /* worktree cleanup is best-effort after PR */ }
    if (job.tempDir) {
      await cleanupTempDir(job.tempDir);
    }
    clearJob();

    bot.sendMessage(chatId, `Done!\n\nPR: ${prUrl}`);

  } catch (err) {
    console.error('Commit error:', err);
    bot.sendMessage(chatId, `Commit/PR failed: ${err.message}\n\nBranch ${job.branchName} preserved for manual recovery.`);
    clearJob();
  }
}

console.log('Bot is running. Waiting for messages...');
```

- [ ] **Step 2: Test bot starts without errors (requires .env)**

Create `telegram-bot/.env` with real credentials, then:

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot && timeout 5 node index.js 2>&1 || true`
Expected: "Starting Telegram Claude Code Bot..." and "Bot is running." before timeout kills it

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/index.js
git commit -m "feat(telegram-bot): add main bot with full two-phase flow"
```

---

## Chunk 5: Final Setup + Testing

### Task 10: Create .env and Manual Test

- [ ] **Step 1: Create .env file with real credentials**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot
cat > .env << 'EOF'
TELEGRAM_BOT_TOKEN=<get from @BotFather>
TELEGRAM_USER_ID=<get from @userinfobot>
OPENAI_API_KEY=<your openai key>
EOF
```

- [ ] **Step 2: Start bot and send test message**

Run: `cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot && node index.js`

Then in Telegram, send to your bot:
- Text: "Show me the list of topics in topics.json"
- Verify: Bot replies with a plan of what it would do
- Press ❌ Cancel to abort without making changes

- [ ] **Step 3: Test voice input**

Send a voice message to the bot saying "Add a new topic called GraphQL Basics"
- Verify: Bot transcribes and shows a plan

- [ ] **Step 4: Test full flow end-to-end**

Send: "Add WebSocket topic to the roadmap.json under Network category"
1. Verify: Bot shows planned changes
2. Press ✅ Execute
3. Verify: Bot shows diff
4. Press ✅ Commit + PR
5. Verify: PR created, URL returned

- [ ] **Step 5: Test /status and /cancel commands**

- Send a new instruction, then immediately send `/status` — should show active job
- Send `/cancel` — should clean up and confirm cancellation

### Task 11: Setup pm2

- [ ] **Step 1: Install pm2 globally if not installed**

Run: `npm install -g pm2`

- [ ] **Step 2: Start bot with pm2**

```bash
cd /Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot
pm2 start index.js --name telegram-bot
pm2 save
pm2 startup  # follow the printed command to enable auto-start
```

- [ ] **Step 3: Verify pm2 keeps it running**

Run: `pm2 status telegram-bot`
Expected: Status "online"

- [ ] **Step 4: Final commit**

```bash
git add telegram-bot/
git commit -m "feat(telegram-bot): complete telegram claude code bot"
```
