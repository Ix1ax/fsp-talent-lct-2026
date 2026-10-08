export const CONTACT_FIELDS = [
  {
    name: 'fullName',
    label: 'ФИО',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Иван Иванов',
  },
  {
    name: 'email',
    label: 'Email для связи',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'name@example.com',
  },
  {
    name: 'phone',
    label: 'Телефон',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '+7 999 123-45-67',
  },
  {
    name: 'telegram',
    label: 'Telegram',
    type: 'text',
    autoComplete: 'off',
    placeholder: '@username',
  },
] as const;
