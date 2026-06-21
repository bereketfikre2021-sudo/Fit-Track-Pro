import { formatSessionDuration } from './workoutSession'

/** Recent finished workout sessions, newest first. */
export function getSessionHistory(completedSessions, { limit = 20 } = {}) {
  return [...(completedSessions || [])]
    .filter((s) => s?.endedAt && s?.day)
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
    .slice(0, limit)
    .map((session) => ({
      ...session,
      durationLabel: formatSessionDuration((session.endedAt || 0) - (session.startedAt || 0)),
      completionLabel:
        session.totalCount > 0
          ? `${session.completedCount}/${session.totalCount} exercises`
          : `${session.completedCount} exercises`,
    }))
}
