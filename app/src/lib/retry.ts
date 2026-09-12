// ponytail: satu helper retry untuk semua panggil GAS; backoff eksponensial,
// cukup untuk 10–50 penulis bersamaan. Upgrade ke antrean bila volume naik 10x.
export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  isRetryable?: (error: unknown, attempt: number) => boolean;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    baseMs = 400,
    maxMs = 5000,
    sleep = defaultSleep,
    isRetryable = () => true,
  } = opts;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isRetryable(err, attempt)) throw err;
      await sleep(Math.min(maxMs, baseMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
