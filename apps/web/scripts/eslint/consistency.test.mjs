import assert from 'node:assert/strict';
import test from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();
const cases = [
  [
    'empty inherited interface',
    "interface SampleProps extends ComponentProps<'div'> {}",
    'consistency/props-interface',
  ],
  [
    'inherited intersection props',
    "type SampleProps = ComponentProps<'div'> & ExtraProps;",
    null,
  ],
  [
    'raw template color',
    'const Sample = () => { return <div className={`text-violet-500 ${value}`} />; };',
    'consistency/semantic-colors',
  ],
  [
    'response promise chain',
    'const load = () => clientApi.get("/test").then(response => response.data);',
    'consistency/api-response',
  ],
  [
    'inherited props alias',
    "type SampleProps = ComponentProps<'div'>; const Sample = (props: SampleProps) => { return <div {...props} />; };",
    null,
  ],
  [
    'raw color',
    'const Sample = () => { return <div className="text-red-500" />; };',
    'consistency/semantic-colors',
  ],
  [
    'semantic color',
    'const Sample = () => { return <div className="text-destructive" />; };',
    null,
  ],
  [
    'arrow declaration',
    'function helper() { return 1; }',
    'consistency/arrow-functions',
  ],
  [
    'arrow expression',
    'const helper = function () { return 1; };',
    'consistency/arrow-functions',
  ],
  ['arrow valid', 'const helper = () => 1;', null],
  ['class method', 'class Helper { run() { return 1; } }', null],
  [
    'inline props',
    'const Sample = ({ title }: { title: string }) => { return <h1>{title}</h1>; };',
    'consistency/props-interface',
  ],
  [
    'props alias',
    'type SampleProps = { title: string };',
    'consistency/props-interface',
  ],
  [
    'domain interface',
    'interface Sample { title: string; }',
    'consistency/props-interface',
  ],
  [
    'props valid',
    'interface SampleProps { title: string; } const Sample = ({ title }: SampleProps) => { return <h1>{title}</h1>; };',
    null,
  ],
  [
    'generic props',
    'interface SampleProps<T> { value: T; } const Sample = <T,>({ value }: SampleProps<T>) => { return <span>{String(value)}</span>; };',
    null,
  ],
  [
    'response access',
    'const load = async () => (await clientApi.get("/test")).data;',
    'consistency/api-response',
  ],
  [
    'response variable',
    'const load = async () => { const response = await serverApi.get("/test"); return response.data; };',
    'consistency/api-response',
  ],
  [
    'response valid',
    'const load = async () => { const { data } = await publicServerApi.get("/test"); return data; };',
    null,
  ],
  [
    'response void',
    'const remove = async () => { await clientApi.delete("/test"); };',
    null,
  ],
  [
    'empty catch comment',
    'try { run(); } catch { /* ignored */ }',
    'no-restricted-syntax',
  ],
  ['empty promise catch', 'request().catch(() => {});', 'no-restricted-syntax'],
  [
    'nested ternary',
    'const text = first ? "a" : second ? "b" : "c";',
    'no-nested-ternary',
  ],
  [
    'implicit component return',
    'const Sample = () => <div />;',
    'no-restricted-syntax',
  ],
  [
    'native control',
    'const Sample = () => { return <input />; };',
    'consistency/shared-controls',
  ],
];

for (const [name, code, expected] of cases) {
  test(name, async () => {
    const [result] = await eslint.lintText(code, {
      filePath: 'src/features/example/ui/Sample.tsx',
    });
    const messages = result.messages.filter(
      (message) =>
        message.ruleId?.startsWith('consistency/') ||
        ['no-nested-ternary', 'no-restricted-syntax'].includes(message.ruleId),
    );
    if (expected)
      assert.ok(
        messages.some((message) => message.ruleId === expected),
        JSON.stringify(result.messages),
      );
    else assert.deepEqual(messages, []);
  });
}

test('native control inside shared primitive is allowed', async () => {
  const [result] = await eslint.lintText(
    'const Radio = () => { return <input type="radio" />; };',
    {
      filePath: 'src/shared/ui/Radio.tsx',
    },
  );
  assert.ok(
    !result.messages.some(
      (message) => message.ruleId === 'consistency/shared-controls',
    ),
  );
});

test('App Router handlers are not components', async () => {
  const [result] = await eslint.lintText(
    'export const POST = async (request: Request) => { return new Response(await request.text()); };',
    {
      filePath: 'src/app/api/example/route.ts',
    },
  );
  assert.ok(
    !result.messages.some(
      (message) => message.ruleId === 'consistency/props-interface',
    ),
  );
});
