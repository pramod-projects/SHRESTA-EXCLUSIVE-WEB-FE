export function selectedStoreKeyAfterSearch(
  query: string,
  filteredStoreKeys: string[],
  selectedStoreKey: string | null
): string | null {
  const normalizedQuery = query.trim();
  if (normalizedQuery && filteredStoreKeys.length === 1) {
    return filteredStoreKeys[0] ?? null;
  }

  if (selectedStoreKey && !filteredStoreKeys.includes(selectedStoreKey)) {
    return null;
  }

  return selectedStoreKey;
}
