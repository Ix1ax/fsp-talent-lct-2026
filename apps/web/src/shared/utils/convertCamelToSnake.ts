import { isObject } from './isObject';
import { camelToSnake } from './camelToSnake';

const processPair = ([key, value]: [string, unknown]) => [
  camelToSnake(key),
  convertCamelToSnake(value),
];

/**
 * Recursively converts object keys from `camelCase` to `snake_case`.
 * Arrays are mapped item by item; primitives, `null`, and non-plain objects are returned as-is.
 *
 * @typeParam T - Expected result type after conversion
 * @param value - Value (object, array, or primitive)
 * @returns The same value with snake_case keys (for objects/arrays)
 *
 * @example
 * convertCamelToSnake({ userId: 1, metaData: { createdAt: 'x' } })
 * // { user_id: 1, meta_data: { created_at: 'x' } }
 */
export const convertCamelToSnake = <T>(value: unknown): T => {
  if (Array.isArray(value)) return value.map(convertCamelToSnake) as T;

  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(processPair)) as T;
  }

  return value as T;
};
