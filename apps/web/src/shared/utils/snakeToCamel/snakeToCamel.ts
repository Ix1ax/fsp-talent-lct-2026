/**
 * Converts a `snake_case` / `kebab-case` string to `camelCase`.
 * Characters after `-` or `_` are uppercased; separators are removed.
 *
 * @param value - Source string
 * @returns camelCase string
 *
 * @example
 * snakeToCamel('user_id') // 'userId'
 * snakeToCamel('created-at') // 'createdAt'
 */
export const snakeToCamel = (value: string): string =>
  value.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ''));
