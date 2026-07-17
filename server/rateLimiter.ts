type Attempt = {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const attempts = new Map<string, Attempt>();

function cleanup(now: number) {
  attempts.forEach((attempt, key) => {
    const expired = attempt.lockedUntil
      ? now > attempt.lockedUntil
      : now - attempt.firstAttemptAt > WINDOW_MS;
    if (expired) attempts.delete(key);
  });
}

export function isLoginLocked(key: string): boolean {
  const now = Date.now();
  cleanup(now);
  const attempt = attempts.get(key);
  return !!attempt?.lockedUntil && now < attempt.lockedUntil;
}

export function registerLoginFailure(key: string): void {
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt || now - attempt.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }

  attempt.count += 1;
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_MS;
  }
}

export function registerLoginSuccess(key: string): void {
  attempts.delete(key);
}
