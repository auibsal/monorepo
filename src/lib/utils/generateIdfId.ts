export function generateIdfId(userCount: number): string {
  // Assuming userCount is the total number of players currently in the DB
  // We pad the number with leading zeros to ensure a 6-digit standard.
  const numericId = (userCount + 1).toString().padStart(6, '0');
  return `IDF-${numericId}`;
}
