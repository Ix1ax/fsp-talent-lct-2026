// Тексты документов предоставляет заказчик. Здесь только перечень и место в интерфейсе.
export const LEGAL_DOCUMENTS = [
  {
    slug: 'terms',
    title: 'Пользовательское соглашение',
    description:
      'Условия использования сервиса для кандидатов и работодателей.',
  },
  {
    slug: 'privacy',
    title: 'Политика обработки персональных данных',
    description: 'Какие данные обрабатываются, зачем и как они защищены.',
  },
  {
    slug: 'consent',
    title: 'Согласие на обработку персональных данных',
    description: 'Текст согласия, которое кандидат даёт в разделе «Согласия».',
  },
  {
    slug: 'cookies',
    title: 'Политика использования cookie',
    description: 'Какие cookie использует сервис и как ими управлять.',
  },
  {
    slug: 'recommendations',
    title: 'Правила рекомендаций и подбора',
    description: 'Как формируется подборка кандидатов.',
  },
] as const;

export type LegalDocumentSlug = (typeof LEGAL_DOCUMENTS)[number]['slug'];

export const LEGAL_OPERATOR_PLACEHOLDER =
  'Реквизиты оператора персональных данных предоставит заказчик';
