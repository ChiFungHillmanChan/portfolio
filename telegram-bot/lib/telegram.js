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
        { text: '\u2705 Execute', callback_data: 'confirm_execute' },
        { text: '\u274C Cancel', callback_data: 'cancel_job' },
      ]],
    },
  },
  confirmCommit: {
    reply_markup: {
      inline_keyboard: [[
        { text: '\u2705 Commit + PR', callback_data: 'confirm_commit' },
        { text: '\u274C Revert', callback_data: 'cancel_job' },
      ]],
    },
  },
};
