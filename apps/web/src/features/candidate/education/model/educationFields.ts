export const EDUCATION_FIELDS = [
  {
    key: 'institution',
    label: 'Учебное заведение',
    placeholder: 'Название школы, колледжа или университета',
    type: 'text',
  },
  {
    key: 'specialty',
    label: 'Специальность (необязательно)',
    placeholder: 'Например, прикладная информатика',
    type: 'text',
  },
  {
    key: 'graduationYear',
    label: 'Год окончания',
    placeholder: 'Например, 2024',
    type: 'number',
  },
] as const;
