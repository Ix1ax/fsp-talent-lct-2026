'use client';

import { useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { AccountAvatar } from '@/shared/ui/AccountAvatar';
import { EmployerHomePage } from '@/screens/employer';

import { createEmployerDemoGateway } from './createEmployerDemoGateway';

interface EmployerDemoProps {
  scenario: string;
}

export const EmployerDemo = ({ scenario }: EmployerDemoProps) => {
  const [gateway] = useState(() => createEmployerDemoGateway(scenario));

  return (
    <EmployerHomePage
      homeHref="/demo/employer"
      gateway={gateway}
      banner={
        <p className="border-b border-border bg-accent px-4 py-2 text-xs text-muted-foreground">
          Демо кабинета работодателя · данные вымышленные · изменения
          сбрасываются при перезагрузке
        </p>
      }
      accountMenu={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Демо-профиль: Елена Смирнова"
            >
              <AccountAvatar name="Елена Смирнова" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Елена Смирнова · демо-профиль</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      user={{
        id: 'demo',
        sub: 'demo',
        email: 'demo@example.org',
        name: 'Елена Смирнова',
        emailVerified: true,
        role: 'employer',
        status: 'active',
      }}
    />
  );
};
