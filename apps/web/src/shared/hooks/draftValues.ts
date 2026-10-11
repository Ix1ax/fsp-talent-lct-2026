export const normalizeDraftValues = (value: unknown): unknown => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(normalizeDraftValues);
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalizeDraftValues(item)]),
    );
  return value;
};

export const serializeDraftValues = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) =>
    typeof item === 'number' && !Number.isFinite(item)
      ? { invalidNumber: String(item) }
      : item,
  );

export const areDraftValuesEqual = (left: unknown, right: unknown) =>
  serializeDraftValues(normalizeDraftValues(left)) ===
  serializeDraftValues(normalizeDraftValues(right));
