const STORAGE_KEY = "evolvexi-offline-queue";

export type QueuedSaveType = "rating" | "pillarNotes" | "standoutMoment";

export type QueuedSave = {
  id: string;
  type: QueuedSaveType;
  args: unknown[];
  queuedAt: string;
};

function readQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSave[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSave[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full/unavailable - nothing more we can do here; the save
    // attempt this session still runs and reports its own result.
  }
}

export function enqueue(type: QueuedSaveType, args: unknown[]): void {
  const queue = readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    args,
    queuedAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

export function getQueueLength(): number {
  return readQueue().length;
}

// Retries queued saves in the order they were queued, stopping at the
// first failure so a later save never lands before an earlier one - the
// remaining queue (including the failed entry) is preserved for the next
// drain attempt. Returns the number of entries still left afterward.
export async function drainQueue(
  handlers: Record<QueuedSaveType, (...args: unknown[]) => Promise<void>>,
): Promise<number> {
  const queue = readQueue();
  while (queue.length > 0) {
    const next = queue[0];
    try {
      await handlers[next.type](...next.args);
      queue.shift();
    } catch {
      break;
    }
  }
  writeQueue(queue);
  return queue.length;
}
