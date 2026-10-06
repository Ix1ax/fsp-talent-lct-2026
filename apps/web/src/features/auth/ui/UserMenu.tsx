'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon, LogOutIcon, UserIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { getRoleHomeRoute, type SessionUser } from '@/entities/session';

import { logoutSession } from '../api';

interface UserMenuProps {
  user: SessionUser;
}

const getInitials = (email: string): string => email.slice(0, 1).toUpperCase();

export const UserMenu = ({ user }: UserMenuProps) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setPending(true);
    setError(null);

    try {
      await logoutSession();
      router.push(STATIC_ROUTES.HOME);
      router.refresh();
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
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={pending}
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
          </Avatar>
          <span className="max-w-[160px] truncate">{user.email}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.email}</p>
          {user.role ? (
            <p className="text-xs text-muted-foreground">{user.role}</p>
          ) : null}
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
