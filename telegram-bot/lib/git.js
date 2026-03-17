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
