export type PendingQuickLogRoute = 'food' | 'activity';

interface PendingNotificationQuickLog {
  route: PendingQuickLogRoute;
  token: string;
  expiresAt: number;
}

const PENDING_NOTIFICATION_QUICK_LOG_TTL_MS = 30000;

let pendingNotificationQuickLog: PendingNotificationQuickLog | null = null;

export const setPendingNotificationQuickLog = (route: PendingQuickLogRoute, token: string) => {
  pendingNotificationQuickLog = {
    route,
    token,
    expiresAt: Date.now() + PENDING_NOTIFICATION_QUICK_LOG_TTL_MS,
  };
};

export const getPendingNotificationQuickLog = (): PendingNotificationQuickLog | null => {
  if (!pendingNotificationQuickLog) {
    return null;
  }

  if (pendingNotificationQuickLog.expiresAt <= Date.now()) {
    pendingNotificationQuickLog = null;
    return null;
  }

  return pendingNotificationQuickLog;
};

export const isPendingNotificationQuickLogValid = (
  route: PendingQuickLogRoute,
  token?: string,
): boolean => {
  const pending = getPendingNotificationQuickLog();
  if (!pending) {
    return false;
  }

  if (pending.route !== route) {
    return false;
  }

  if (token && pending.token !== token) {
    return false;
  }

  return true;
};

export const clearPendingNotificationQuickLog = () => {
  pendingNotificationQuickLog = null;
};