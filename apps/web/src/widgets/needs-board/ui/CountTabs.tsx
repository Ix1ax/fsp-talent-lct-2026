'use client';
import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
import { NEED_STATUS_LABELS, type NeedStatus } from '@/entities/employer-need';

interface CountTabsProps {
  value: NeedStatus;
  onChange: (status: NeedStatus) => void;
  disabled?: boolean;
  children: ReactNode;
}

export const CountTabs = ({
  value,
  onChange,
  disabled,
  children,
}: CountTabsProps) => {
  return (
    <Tabs
      className="gap-2"
      value={value}
      onValueChange={(v) => onChange(v as NeedStatus)}
    >
      <TabsList className="grid w-full grid-cols-3 gap-1">
        {(['active', 'draft', 'archived'] as const).map((status) => (
          <TabsTrigger
            key={status}
            value={status}
            disabled={disabled}
            className="h-full px-2 text-[0.8125rem]"
          >
            {NEED_STATUS_LABELS[status]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent
        value={value}
        className="m-0 flex flex-col gap-0.5 outline-none"
      >
        {children}
      </TabsContent>
    </Tabs>
  );
};
