/**
 * Sequential mutation queue.
 * All enqueued operations run one after another.
 * Each caller gets its own promise for error handling.
 */

let pending = Promise.resolve()

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = pending.then(fn)
  pending = result.then(() => {}, () => {})  // chain continues even if this one fails
  return result
}
