import { Building2Icon, LayersIcon } from 'lucide-react';

import { Button } from '@/shared/ui';

interface EmployerBottomNavProps {
  onShowNeeds: () => void;
  company: boolean;
  pending: boolean;
  onSettings: () => void;
}

export const EmployerBottomNav = ({
  onShowNeeds,
  company,
  pending,
  onSettings,
}: EmployerBottomNavProps) => {
  return (
    <nav
      aria-label="Разделы работодателя на мобильном"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-border bg-card px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <Button
        onClick={onShowNeeds}
        disabled={pending}
        aria-current="page"
        variant="ghost"
        className="h-12 flex-col gap-0.5 bg-accent text-xs font-semibold text-brand-text hover:bg-accent"
      >
        <LayersIcon className="size-4" />
        Потребности
      </Button>
      <Button
        variant="ghost"
        disabled={!company || pending}
        onClick={onSettings}
        className="h-12 flex-col gap-0.5 text-xs text-muted-foreground disabled:bg-transparent"
      >
        <Building2Icon className="size-4" />
        Компания
      </Button>
    </nav>
  );
};
