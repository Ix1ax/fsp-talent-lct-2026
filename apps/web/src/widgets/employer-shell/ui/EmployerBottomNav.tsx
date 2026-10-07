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
}: EmployerBottomNavProps) => (
  <nav
    aria-label="Разделы работодателя на мобильном"
    className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <Button
      onClick={onShowNeeds}
      disabled={pending}
      aria-current="page"
      variant="ghost"
      className="h-16 flex-col gap-1 rounded-none border-t-2 border-primary text-brand-text"
    >
      <LayersIcon className="size-5" />
      Потребности
    </Button>
    <Button
      variant="ghost"
      disabled={!company || pending}
      onClick={onSettings}
      className="h-16 flex-col gap-1 rounded-none text-muted-foreground disabled:bg-transparent"
    >
      <Building2Icon className="size-5" />
      Компания
    </Button>
  </nav>
);
