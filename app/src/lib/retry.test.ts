import { expect, test } from "bun:test";
import { withRetry } from "./retry";

test("berhasil tanpa retry bila langsung sukses", async () => {
  const sleeps: number[] = [];
  const out = await withRetry(async () => "ok", {
    sleep: async (ms) => void sleeps.push(ms),
  });
  expect(out).toBe("ok");
  expect(sleeps).toEqual([]);
});

test("retry dengan backoff eksponensial lalu sukses", async () => {
  const sleeps: number[] = [];
  let calls = 0;
  const out = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("timeout");
      return "ok";
    },
    { attempts: 3, baseMs: 400, sleep: async (ms) => void sleeps.push(ms) },
  );
  expect(out).toBe("ok");
  expect(sleeps).toEqual([400, 800]);
});

test("menyerah setelah attempts habis", async () => {
  let calls = 0;
  await expect(
    withRetry(
      async () => {
        calls++;
        throw new Error("gagal");
      },
      { attempts: 2, baseMs: 1 },
    ),
  ).rejects.toThrow("gagal");
  expect(calls).toBe(2);
});

test("isRetryable=false langsung lempar tanpa retry", async () => {
  let calls = 0;
  await expect(
    withRetry(
      async () => {
        calls++;
        throw new Error("unauthorized");
      },
      { attempts: 3, baseMs: 1, isRetryable: () => false },
    ),
  ).rejects.toThrow("unauthorized");
  expect(calls).toBe(1);
});
