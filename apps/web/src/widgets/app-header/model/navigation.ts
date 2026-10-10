import {
  BookOpenIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  ClipboardCheckIcon,
  type LucideIcon,
  MailIcon,
  SearchIcon,
  UserRoundIcon,
} from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { USER_ROLES, type UserRole } from '@/entities/session';

export type HeaderNavItem = {
  id: string;
  href: string;
  label: string;
  /** Короткая подпись для второй строки шапки на телефоне. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Вложенные маршруты со своим пунктом: при них пункт не активен. */
  exclude?: string[];
  /** Маршруты, при которых пункт тоже активен. */
  include?: string[];
};

const GUIDES_ITEM: HeaderNavItem = {
  id: 'guides',
  href: STATIC_ROUTES.GUIDES,
  label: 'Справочник',
  icon: BookOpenIcon,
};

const CANDIDATE_ITEMS: HeaderNavItem[] = [
  {
    id: 'profile',
    href: STATIC_ROUTES.CANDIDATE,
    label: 'Профиль',
    icon: UserRoundIcon,
    exclude: [STATIC_ROUTES.CANDIDATE_ASSESSMENTS, STATIC_ROUTES.OFFERS],
  },
  {
    id: 'assessments',
    href: STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
    label: 'Тестирование',
    shortLabel: 'Тесты',
    icon: ClipboardCheckIcon,
  },
  {
    id: 'offers',
    href: STATIC_ROUTES.OFFERS,
    label: 'Предложения',
    icon: MailIcon,
  },
];

/** id совпадают с разделами кабинета работодателя. */
export const EMPLOYER_NAV_ITEMS: HeaderNavItem[] = [
  {
    id: 'overview',
    href: STATIC_ROUTES.EMPLOYER,
    label: 'Компании',
    icon: Building2Icon,
    exclude: [
      STATIC_ROUTES.EMPLOYER_VACANCIES,
      STATIC_ROUTES.EMPLOYER_CANDIDATES,
      STATIC_ROUTES.EMPLOYER_OFFERS,
      STATIC_ROUTES.EMPLOYER_TASKS,
    ],
  },
  {
    id: 'vacancies',
    href: STATIC_ROUTES.EMPLOYER_VACANCIES,
    label: 'Потребности',
    icon: BriefcaseBusinessIcon,
  },
  {
    id: 'candidates',
    href: STATIC_ROUTES.EMPLOYER_CANDIDATES,
    label: 'Банк соискателей',
    shortLabel: 'Соискатели',
    icon: SearchIcon,
  },
  {
    id: 'offers',
    href: STATIC_ROUTES.EMPLOYER_OFFERS,
    label: 'Предложения',
    icon: MailIcon,
  },
  {
    id: 'tasks',
    href: STATIC_ROUTES.EMPLOYER_TASKS,
    label: 'Задания',
    icon: ClipboardCheckIcon,
  },
];

/** Пункты шапки по роли. Справочник доступен всем, включая гостей. */
export const getHeaderNavItems = (role?: UserRole): HeaderNavItem[] => {
  if (role === USER_ROLES.CANDIDATE) return [...CANDIDATE_ITEMS, GUIDES_ITEM];
  if (role === USER_ROLES.EMPLOYER) return [...EMPLOYER_NAV_ITEMS, GUIDES_ITEM];
  return [GUIDES_ITEM];
};

export const GUIDES_NAV_ITEM = GUIDES_ITEM;
