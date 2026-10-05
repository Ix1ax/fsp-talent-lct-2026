/**
 * Checks whether a value is a plain object (not `null`, array, Date, etc.).
 * Accepts objects with `Object.prototype` or no prototype (`Object.create(null)`).
 *
 * @param v - Value of any type
 * @returns `true` if `v` is a plain object
 *
 * @example
 * isObject({ a: 1 }) // true
 * isObject([]) // false
 * isObject(null) // false
 */
export const isObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);

  return proto === Object.prototype || proto === null;
};
