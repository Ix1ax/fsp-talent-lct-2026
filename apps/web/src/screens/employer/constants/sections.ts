export const EMPLOYER_SECTIONS = [
  {
    id: 'tasks',
    title: 'Задания компании',
    description:
      'Просматривайте решения кандидатов, оценивайте работы и оставляйте комментарии.',
  },
  {
    id: 'profile',
    title: 'Профиль компании',
    description: 'Название, описание, реквизиты и контакты компании.',
  },
  {
    id: 'documents',
    title: 'Документы и проверка',
    description:
      'Загрузите документы и логотип, отправьте компанию на проверку.',
  },
  {
    id: 'team',
    title: 'Сотрудники',
    description: 'Приглашайте коллег и управляйте доступом к компании.',
  },
  {
    id: 'vacancies',
    title: 'Потребности',
    description:
      'Создавайте потребности, сохраняйте черновики и подбирайте кандидатов.',
  },
  {
    id: 'candidates',
    title: 'Банк соискателей',
    description:
      'Изучайте опыт, навыки и подтверждённую квалификацию соискателей.',
  },
  {
    id: 'offers',
    title: 'Предложения',
    description: 'Следите за ответами и открывайте контакты после принятия.',
  },
] as const;
export type EmployerSection =
  (typeof EMPLOYER_SECTIONS)[number]['id'] | 'overview' | 'invitation';
export const getEmployerSection = (value: string): EmployerSection => {
  if (value === 'invitation') return value;
  return (
    EMPLOYER_SECTIONS.find((section) => section.id === value)?.id ?? 'overview'
  );
};
