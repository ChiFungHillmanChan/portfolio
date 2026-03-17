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
