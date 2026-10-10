'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, LogOutIcon, UserIcon } from 'lucide-react';

import { STATIC_ROUTES, USER_ROLE_LABELS } from '@/shared/contants';
import { confirmUnsavedChanges } from '@/shared/hooks';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { AccountAvatar } from '@/shared/ui/AccountAvatar';
import { getRoleHomeRoute, type SessionUser } from '@/entities/session';

import { logoutSession } from '../api';
import { useAccountAvatar } from '../model';

interface UserMenuProps {
  user: SessionUser;
  compact?: boolean;
}

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const UserMenu = ({ user, compact = false }: UserMenuProps) => {
  const avatarUrl = useAccountAvatar(user);
  const displayName = user.name?.trim() || user.email;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    if (pending || !confirmUnsavedChanges()) return;
    setPending(true);
    setError(null);

    try {
      await logoutSession();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось выйти');
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={compact ? 'ghost' : 'outline'}
          className={compact ? 'size-10 p-0' : 'h-10 gap-2 pr-3 pl-1.5'}
          aria-label={`Аккаунт: ${displayName}`}
          disabled={pending}
        >
          {compact ? (
            <AccountAvatar name={displayName} src={avatarUrl} />
          ) : (
            <>
              <Avatar size="sm">
                <AvatarImage src={avatarUrl} alt="" />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <span className="max-w-40 truncate max-xl:hidden">
                {displayName}
              </span>
              <ChevronDownIcon className="size-3.5 opacity-60" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <Avatar size="lg">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium [overflow-wrap:anywhere]">
              {displayName}
            </p>
            {user.name?.trim() && (
              <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {user.email}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {user.role ? USER_ROLE_LABELS[user.role] : 'Роль не выбрана'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={
              user.role ? getRoleHomeRoute(user.role) : STATIC_ROUTES.CABINET
            }
          >
            <UserIcon />
            Личный кабинет
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            void onLogout();
          }}
        >
          <LogOutIcon />
          {pending ? 'Выход…' : 'Выйти'}
        </DropdownMenuItem>
        {error && (
          <p role="alert" className="px-2 py-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
