export const operationSections = [
  'companies',
  'users',
  'needs',
  'offers',
  'tasks',
  'attempts',
] as const;
export type OperationSection = (typeof operationSections)[number];
export const operationConfig = {
  companies: {
    title: 'Компании',
    description: 'Подтверждение и доступ компаний, документы и участники.',
    endpoint: '/companies',
    statuses: ['unverified', 'pending', 'verified', 'rejected'],
    search: true,
    company: false,
    candidate: false,
    category: false,
  },
  users: {
    title: 'Пользователи',
    description:
      'Поиск по имени, почте и ID; доступ кандидатов и работодателей.',
    endpoint: '/users',
    statuses: ['active', 'blocked', 'deleted'],
    search: true,
    company: false,
    candidate: false,
    category: false,
  },
  needs: {
    title: 'Потребности',
    description:
      'Потребности компаний, условия подбора и модерация публикаций.',
    endpoint: '/needs',
    statuses: ['draft', 'active', 'archived'],
    search: true,
    company: true,
    candidate: false,
    category: true,
  },
  offers: {
    title: 'Предложения',
    description: 'Отправленные предложения и решения кандидатов.',
    endpoint: '/offers',
    statuses: ['sent', 'viewed', 'accepted', 'rejected', 'expired'],
    search: false,
    company: true,
    candidate: true,
    category: false,
  },
  tasks: {
    title: 'Задания компаний',
    description: 'Файловые задания, сроки приёма решений и модерация.',
    endpoint: '/tasks',
    statuses: ['published', 'hidden'],
    search: true,
    company: true,
    candidate: false,
    category: true,
  },
  attempts: {
    title: 'Попытки тестирования',
    description: 'Ход тестирования и итоговые результаты кандидатов.',
    endpoint: '/assessments/attempts',
    statuses: ['active', 'passed', 'failed', 'expired'],
    search: false,
    company: false,
    candidate: true,
    category: true,
  },
} as const;
export const isOperationSection = (
  section: string,
): section is OperationSection =>
  operationSections.some((value) => value === section);
export const operationStatusLabels: Record<string, string> = {
  unverified: 'Не подтверждена',
  pending: 'Ожидает проверки',
  verified: 'Подтверждена',
  rejected: 'Отклонено',
  active: 'Активен',
  blocked: 'Заблокирован',
  deleted: 'Удалён',
  draft: 'Черновик',
  archived: 'Архив',
  sent: 'Отправлено',
  viewed: 'Просмотрено',
  accepted: 'Принято',
  published: 'Опубликовано',
  hidden: 'Скрыто',
  passed: 'Тест пройден',
  failed: 'Тест не пройден',
  expired: 'Истекло',
  open: 'Приём открыт',
  closed: 'Приём закрыт',
  ready: 'Готов',
  deleting: 'Удаляется',
  inactive: 'Неактивен',
  passive: 'Рассматривает предложения',
};
export const userRoleLabels: Record<string, string> = {
  candidate: 'Кандидат',
  employer: 'Работодатель',
  admin: 'Администратор',
};
export const memberRoleLabels: Record<string, string> = {
  owner: 'Владелец',
  recruiter: 'Рекрутер',
  viewer: 'Наблюдатель',
};
export const auditSourceLabels: Record<string, string> = {
  operations: 'Операции',
  catalogs: 'Справочники',
  assessments: 'Тестирование',
  admins: 'Администраторы',
  activity: 'Активность',
};
