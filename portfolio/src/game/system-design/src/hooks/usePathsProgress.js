import { useMemo } from 'react';
import { useProgress } from '../context/ProgressContext';
import pathsData from '../data/paths.json';

const STATUS_KEY = 'sd_challenge_status';
const COACHING_KEY = 'sd_coaching_sessions_count';

function loadChallengeStatus() {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}'); } catch { return {}; }
}

export default function usePathsProgress() {
  const { isViewed } = useProgress();

  return useMemo(() => {
    const challengeStatus = loadChallengeStatus();
    const coachingCount = parseInt(localStorage.getItem(COACHING_KEY) || '0', 10);
    const result = {};

    for (const path of pathsData) {
      const topicsViewed = path.topics.filter((slug) => isViewed(slug)).length;
      const topicsTotal = path.topics.length;
      const projectsPassed = path.requiredProjects.filter((id) => challengeStatus[id] === 'passed').length;
      const projectsRequired = path.requiredProjects.length;
      const coachingRequired = path.requiredCoachingSessions || 0;
      const coachingDone = Math.min(coachingCount, coachingRequired);

      const totalSteps = topicsTotal + projectsRequired + coachingRequired;
      const doneSteps = topicsViewed + projectsPassed + coachingDone;
      const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const isComplete = doneSteps >= totalSteps;

      result[path.id] = {
        topicsViewed,
        topicsTotal,
        projectsPassed,
        projectsRequired,
        coachingDone,
        coachingRequired,
        isComplete,
        percent,
      };
    }

    return result;
  }, [isViewed]);
}
