'use client';

import { useEffect } from 'react';

import { rememberRole, type UserRole } from '../model';

interface RememberRoleProps {
  role: UserRole | undefined;
}

/** Запоминает роль из серверной сессии для шапки статичных страниц. */
export const RememberRole = ({ role }: RememberRoleProps) => {
  useEffect(() => {
    rememberRole(role);
  }, [role]);
  return null;
};
