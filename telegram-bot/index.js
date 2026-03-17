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
