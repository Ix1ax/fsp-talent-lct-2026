/** @type {import('lint-staged').Configuration} */
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  '*.{js,jsx,mjs,cjs,ts,tsx}': [
    'eslint --fix --max-warnings 0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,css,md}': ['prettier --write'],
};
