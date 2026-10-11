import { USER_ROLES, type UserRole } from './types';

// Роль последнего входа — только она, без имени и почты. Статичные страницы
// рисуют по ней шапку сразу, не дожидаясь ответа /v1/me, — шапка не прыгает.
const STORAGE_KEY = 'fsp-last-role';
const ROLES: string[] = Object.values(USER_ROLES);
let storageUnavailable = false;

export const readLastKnownRole = (): UserRole | null => {
  if (storageUnavailable) return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && ROLES.includes(value) ? (value as UserRole) : null;
  } catch {
    return null;
  }
};

/** Запомнить роль вошедшего пользователя; без роли — забыть (выход, гость). */
export const rememberRole = (role: UserRole | undefined): void => {
  try {
    if (role) window.localStorage.setItem(STORAGE_KEY, role);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Хранилище недоступно — шапка просто дождётся ответа сервера.
    storageUnavailable = true;
  }
};
