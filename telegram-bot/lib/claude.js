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
