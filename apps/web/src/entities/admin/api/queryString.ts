export const queryString = (
  params: Record<string, string | number | undefined>,
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') query.set(key, String(value));
  return query.toString();
};
