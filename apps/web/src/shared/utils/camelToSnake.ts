/**
 * Converts a `camelCase` string to `snake_case`.
 *
 * @param value - Source string
 * @returns snake_case string
 *
 * @example
 * camelToSnake('userId') // 'user_id'
 * camelToSnake('createdAt') // 'created_at'
 */
export const camelToSnake = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
