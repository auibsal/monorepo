/**
 * Check-in keeps working without a connection (decisions.md, Events): a
 * scan or a tap the database can't take now is kept on this device and
 * sent when the connection is back. Each check-in is safe to send twice
 * (events.check_in answers "already").
 */

export type DoorTarget =
  | { ticket_code: string }
  | { target_user: string }
  | { card_code: string; digits: string };

const KEY = "sal-door-queue";

const keyOf = (eventId: string) => `${KEY}:${eventId}`;

/** The same check-in, however it was asked. */
const sameTarget = (a: DoorTarget, b: DoorTarget) =>
  JSON.stringify(a) === JSON.stringify(b);

/** What waits to be sent for an event, oldest first. */
export const readQueue = (storage: Storage, eventId: string): DoorTarget[] => {
  try {
    const raw = storage.getItem(keyOf(eventId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DoorTarget[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (storage: Storage, eventId: string, queue: DoorTarget[]) => {
  try {
    if (queue.length === 0) {
      storage.removeItem(keyOf(eventId));
    } else {
      storage.setItem(keyOf(eventId), JSON.stringify(queue));
    }
  } catch {
    // Storage full or blocked: the check-in stays on the screen's count only.
  }
};

/** Keeps a check-in to send later; the same one twice is kept once. */
export const enqueue = (
  storage: Storage,
  eventId: string,
  target: DoorTarget
) => {
  const queue = readQueue(storage, eventId);
  if (!queue.some((t) => sameTarget(t, target))) {
    writeQueue(storage, eventId, [...queue, target]);
  }
  return readQueue(storage, eventId).length;
};

/**
 * Sends what waits, in order, stopping at the first that can't go yet (the
 * connection is still down). A check-in the database refuses (an unknown
 * ticket, a card that isn't live) is dropped: sending it again won't help.
 * Returns how many still wait.
 */
export const flush = async (
  storage: Storage,
  eventId: string,
  send: (target: DoorTarget) => Promise<"sent" | "refused" | "offline">
) => {
  const queue = readQueue(storage, eventId);
  let index = 0;
  for (const target of queue) {
    // biome-ignore lint/performance/noAwaitInLoops: one at a time, in the order they were scanned
    const result = await send(target);
    if (result === "offline") {
      break;
    }
    index += 1;
  }
  const left = queue.slice(index);
  writeQueue(storage, eventId, left);
  return left.length;
};

/** A failure that means "no connection", not "the database said no". */
export const isOffline = (error: unknown) =>
  (typeof navigator !== "undefined" && navigator.onLine === false) ||
  error instanceof TypeError;
