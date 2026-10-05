import { isObject } from '../isObject';
import { snakeToCamel } from '../snakeToCamel';

const processPair = ([key, value]: [string, unknown]) => [
  snakeToCamel(key),
  convertSnakeToCamel(value),
];

/**
 * Recursively converts object keys from `snake_case` / `kebab-case` to `camelCase`.
 * Arrays are mapped item by item; primitives, `null`, and non-plain objects are returned as-is.
 *
 * @typeParam T - Expected result type after conversion
 * @param value - Value (object, array, or primitive)
 * @returns The same value with camelCase keys (for objects/arrays)
 *
 * @example
 * convertSnakeToCamel({ user_id: 1, meta_data: { created_at: 'x' } })
 * // { userId: 1, metaData: { createdAt: 'x' } }
 */
export const convertSnakeToCamel = <T>(value: unknown): T => {
  if (Array.isArray(value)) return value.map(convertSnakeToCamel) as T;

  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(processPair));
  }

  return value as T;
};
