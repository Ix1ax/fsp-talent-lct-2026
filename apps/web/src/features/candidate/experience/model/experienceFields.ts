export const EXPERIENCE_FIELDS = [
  {
    key: 'company',
    label: 'Компания',
    type: 'text',
    placeholder: 'Название компании',
  },
  {
    key: 'position',
    label: 'Должность',
    type: 'text',
    placeholder: 'Например, PHP-программист',
  },
  {
    key: 'startedOn',
    label: 'Месяц начала',
    type: 'month',
    placeholder: 'ГГГГ-ММ',
  },
  {
    key: 'endedOn',
    label: 'Месяц окончания',
    type: 'month',
    placeholder: 'ГГГГ-ММ',
  },
] as const;
