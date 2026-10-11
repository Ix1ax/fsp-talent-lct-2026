const rule = (message, create) => ({
  meta: { type: 'suggestion', schema: [], messages: { inconsistent: message } },
  create,
});

const isApiRequest = (node) =>
  node?.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  ['clientApi', 'serverApi', 'publicServerApi'].includes(
    node.callee.object.name,
  );

const hasRawColor = (value) =>
  /^#[\da-f]{3,8}$/i.test(value) ||
  /(?:bg|text|border|ring|fill|stroke)-(?:red|green|blue|amber|yellow|orange|slate|gray|zinc|neutral|stone|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-|\/|\b)/.test(
    value,
  ) ||
  /(?:bg|text|border|ring)-\[#[\da-f]+\]/i.test(value);

const consistency = {
  rules: {
    'semantic-colors': rule(
      'Используйте семантический цвет из globals.css. Фирменная графика и специальные визуализации имеют отдельные компоненты.',
      (context) => ({
        Literal: (node) => {
          if (typeof node.value !== 'string') return;
          if (hasRawColor(node.value))
            context.report({ node, messageId: 'inconsistent' });
        },
        TemplateElement: (node) => {
          if (hasRawColor(node.value.raw))
            context.report({ node, messageId: 'inconsistent' });
        },
      }),
    ),
    'arrow-functions': rule('Используйте стрелочную функцию.', (context) => ({
      FunctionDeclaration: (node) =>
        context.report({ node, messageId: 'inconsistent' }),
      FunctionExpression: (node) => {
        // Методы объектов и классов сохраняют собственную семантику this.
        if (node.parent.type === 'MethodDefinition' || node.parent.method)
          return;
        context.report({ node, messageId: 'inconsistent' });
      },
    })),
    'props-interface': rule(
      'Props именуются ComponentNameProps: interface для собственных полей, type для наследования без дополнительных полей. Остальные данные — type.',
      (context) => ({
        TSInterfaceDeclaration: (node) => {
          if (!node.id.name.endsWith('Props') || node.body.body.length === 0)
            context.report({ node, messageId: 'inconsistent' });
        },
        TSTypeAliasDeclaration: (node) => {
          const inheritedOnly =
            node.typeAnnotation.type === 'TSTypeReference' ||
            (node.typeAnnotation.type === 'TSIntersectionType' &&
              node.typeAnnotation.types.every(
                (type) => type.type === 'TSTypeReference',
              ));
          if (node.id.name.endsWith('Props') && !inheritedOnly)
            context.report({ node, messageId: 'inconsistent' });
        },
        VariableDeclarator: (node) => {
          if (
            !context.filename.endsWith('.tsx') ||
            !/^[A-Z]/.test(node.id.name ?? '') ||
            node.init?.type !== 'ArrowFunctionExpression'
          )
            return;
          const parameter = node.init.params[0];
          if (!parameter) return;
          let type = parameter.typeAnnotation?.typeAnnotation;
          if (
            type?.type === 'TSTypeReference' &&
            type.typeName.name === 'Readonly'
          ) {
            type = (type.typeArguments ?? type.typeParameters)?.params[0];
          }
          if (
            type?.type !== 'TSTypeReference' ||
            type.typeName.name !== `${node.id.name}Props`
          ) {
            context.report({ node: parameter, messageId: 'inconsistent' });
          }
        },
      }),
    ),
    'api-response': rule(
      'Извлекайте ответ API через const { data } = await api.method(...). Не возвращайте объект ответа или доступ к .data/.body через await.',
      (context) => ({
        CallExpression: (node) => {
          if (isApiRequest(node) && node.parent.type !== 'AwaitExpression') {
            context.report({ node, messageId: 'inconsistent' });
          }
        },
        AwaitExpression: (node) => {
          if (!isApiRequest(node.argument)) return;
          const declaration = node.parent;
          if (declaration.type === 'ExpressionStatement') return; // Операция без тела ответа.
          if (
            declaration.type === 'VariableDeclarator' &&
            declaration.id.type === 'ObjectPattern' &&
            declaration.id.properties.some(
              (property) => property.key?.name === 'data',
            )
          )
            return;
          context.report({ node, messageId: 'inconsistent' });
        },
      }),
    ),
    'shared-controls': rule(
      'Используйте Input, Checkbox, Radio, OptionSelect, FileInput или Textarea из shared/ui. Специальные интерактивы размещайте в отдельном компоненте.',
      (context) => ({
        JSXOpeningElement: (node) => {
          if (['input', 'select', 'textarea'].includes(node.name.name)) {
            context.report({ node, messageId: 'inconsistent' });
          }
        },
      }),
    ),
  },
};

export default consistency;
