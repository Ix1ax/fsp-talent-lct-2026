import {
  BookOpen,
  FileQuestion,
  Layers,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const ADMIN_LINKS = [
  {
    path: 'catalogs',
    mobileLabel: 'Каталоги',
    label: 'Справочники',
    icon: BookOpen,
  },
  {
    path: 'moderation',
    mobileLabel: 'Модерация',
    label: 'Модерация навыков',
    icon: ShieldCheck,
  },
  {
    path: 'questions',
    mobileLabel: 'Задания',
    label: 'Банк заданий',
    icon: FileQuestion,
  },
  {
    path: 'templates',
    mobileLabel: 'Тесты',
    label: 'Шаблоны тестов',
    icon: Layers,
  },
  {
    path: 'admins',
    mobileLabel: 'Админы',
    label: 'Администраторы',
    icon: Users,
  },
] as const;
