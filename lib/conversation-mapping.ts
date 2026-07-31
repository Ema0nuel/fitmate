/**
 * FitMate — Conversation UUID Mapping
 *
 * Maps backend numeric conversation IDs to random UUIDs for use in URLs.
 * This prevents sequential ID enumeration in the browser address bar.
 *
 * Storage: localStorage under key "fitmate-conversation-uuids"
 * Format: { "uuid-to-id": { [uuid]: numericId }, "id-to-uuid": { [numericId]: uuid } }
 */

const STORAGE_KEY = "fitmate-conversation-uuids";

interface MappingStore {
  "uuid-to-id": Record<string, number>;
  "id-to-uuid": Record<string, string>;
}

function getStore(): MappingStore {
  if (typeof window === "undefined") return { "uuid-to-id": {}, "id-to-uuid": {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { "uuid-to-id": {}, "id-to-uuid": {} };
  } catch {
    return { "uuid-to-id": {}, "id-to-uuid": {} };
  }
}

function saveStore(store: MappingStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Generate a random UUIDv4 (crypto-safe).
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Register a numeric conversation ID and return its UUID.
 * If already registered, returns the existing UUID.
 */
export function registerConversation(numericId: number): string {
  const store = getStore();

  // Already mapped — return existing UUID
  const existing = store["id-to-uuid"][String(numericId)];
  if (existing) return existing;

  // Generate new UUID and store both directions
  const uuid = generateUUID();
  store["uuid-to-id"][uuid] = numericId;
  store["id-to-uuid"][String(numericId)] = uuid;
  saveStore(store);

  return uuid;
}

/**
 * Resolve a UUID from the URL to its backend numeric ID.
 * Returns null if the UUID is not found.
 */
export function resolveConversationId(uuid: string): number | null {
  const store = getStore();
  const numericId = store["uuid-to-id"][uuid];
  return numericId ?? null;
}

/**
 * Get the UUID for a numeric conversation ID (for URL construction).
 * Returns null if not registered.
 */
export function getConversationUuid(numericId: number): string | null {
  const store = getStore();
  return store["id-to-uuid"][String(numericId)] ?? null;
}

/**
 * Get or create a UUID for a numeric conversation ID.
 * Always returns a UUID — creates one if it doesn't exist yet.
 */
export function getOrCreateUuid(numericId: number): string {
  const existing = getConversationUuid(numericId);
  if (existing) return existing;
  return registerConversation(numericId);
}
