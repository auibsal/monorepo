/**
 * Generates a secure, non-predictable identifier for IDF players.
 * Replaces the previous sequential generation to prevent enumeration attacks.
 *
 * @param _userCount - Deprecated: No longer used for ID generation
 * @returns A string prefixed with 'IDF-' followed by a secure UUID
 */
export function generateIdfId(_userCount?: number): string {
  // We use a cryptographically secure random identifier (UUID)
  // to prevent predictable sequential ID generation.
  const randomId = crypto.randomUUID();
  return `IDF-${randomId}`;
}
