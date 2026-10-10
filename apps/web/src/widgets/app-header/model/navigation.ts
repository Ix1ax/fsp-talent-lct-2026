import {
  BookOpenTextIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  GraduationCapIcon,
  InboxIcon,
  ListTodoIcon,
  type LucideIcon,
  SendIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import type { HeaderNavBreakpoint } from '@/shared/ui';
import { USER_ROLES, type UserRole } from '@/entities/session';

export type HeaderNavItem = {
  id: string;
  href: string;
  label: string;
  /** Короткая подпись в шапке до 2xl; в меню-бургере — всегда полная. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Вложенные маршруты со своим пунктом: при них пункт не активен. */
  exclude?: string[];
  /** Маршруты, при которых пункт тоже активен. */
  include?: string[];
  /** Второстепенный пункт: на узких экранах только в меню, не в нижней панели. */
  secondary?: boolean;
};

const GUIDES_ITEM: HeaderNavItem = {
  id: 'guides',
  href: STATIC_ROUTES.GUIDES,
  label: 'Справочник',
  icon: BookOpenTextIcon,
};

const CANDIDATE_ITEMS: HeaderNavItem[] = [
  {
    id: 'profile',
    href: STATIC_ROUTES.CANDIDATE,
    label: 'Профиль',
    icon: UserRoundIcon,
    exclude: [
      STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
      STATIC_ROUTES.CANDIDATE_TASKS,
      STATIC_ROUTES.OFFERS,
    ],
  },
  {
    id: 'assessments',
    href: STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
    label: 'Тестирование',
    shortLabel: 'Тесты',
    icon: GraduationCapIcon,
  },
  {
    id: 'offers',
    href: STATIC_ROUTES.OFFERS,
    label: 'Предложения',
    icon: InboxIcon,
  },
  {
    id: 'tasks',
    href: STATIC_ROUTES.CANDIDATE_TASKS,
    label: 'Задания компаний',
    shortLabel: 'Задания',
    icon: ListTodoIcon,
    secondary: true,
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
    icon: UsersRoundIcon,
  },
  {
    id: 'offers',
    href: STATIC_ROUTES.EMPLOYER_OFFERS,
    label: 'Предложения',
    icon: SendIcon,
  },
  {
    id: 'tasks',
    href: STATIC_ROUTES.EMPLOYER_TASKS,
    label: 'Задания',
    icon: ListTodoIcon,
    secondary: true,
  },
];

/**
 * Рабочие разделы шапки по роли. Справочник сюда не входит: он доступен всем,
 * включая гостей, и показан кнопкой в действиях шапки и в меню-бургере.
 */
export const getHeaderNavItems = (role?: UserRole): HeaderNavItem[] => {
  if (role === USER_ROLES.CANDIDATE) return CANDIDATE_ITEMS;
  if (role === USER_ROLES.EMPLOYER) return EMPLOYER_NAV_ITEMS;
  return [];
};

/** С какой ширины разделы роли помещаются в шапку одной строкой. */
export const EMPLOYER_NAV_FROM: HeaderNavBreakpoint = 'xl';
export const getHeaderNavFrom = (role?: UserRole): HeaderNavBreakpoint =>
  role === USER_ROLES.EMPLOYER ? EMPLOYER_NAV_FROM : 'lg';

export const GUIDES_NAV_ITEM = GUIDES_ITEM;
