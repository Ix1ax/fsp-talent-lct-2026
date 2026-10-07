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
      className="gap-0"
      value={value}
      onValueChange={(v) => onChange(v as NeedStatus)}
    >
      <TabsList
        variant="line"
        className="grid group-data-horizontal/tabs:h-auto w-full grid-cols-3 gap-0 rounded-none border-y border-border bg-transparent p-0"
      >
        {(['active', 'draft', 'archived'] as const).map((status) => (
          <TabsTrigger
            key={status}
            value={status}
            disabled={disabled}
            className="h-14 min-h-14 rounded-none border-r border-border px-4 font-mono text-[11px] uppercase tracking-widest shadow-none after:bg-primary data-[state=active]:after:opacity-100 after:bottom-0! dark:data-active:bg-transparent dark:data-active:text-brand-text data-active:text-brand-text data-[state=active]:bg-transparent data-[state=active]:text-brand-text"
          >
            {NEED_STATUS_LABELS[status]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={value} className="m-0 outline-none">
        {children}
      </TabsContent>
    </Tabs>
  );
};
