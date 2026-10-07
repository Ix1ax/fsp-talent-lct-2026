import { Building2Icon, LayersIcon, SendIcon, UsersIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
interface EmployerBottomNavProps {
  company: boolean;
  pending: boolean;
  onSettings: () => void;
}
const navigation = [
  { label: 'Потребности', icon: LayersIcon },
  { label: 'Банк', icon: UsersIcon },
  { label: 'Приглашения', icon: SendIcon },
  { label: 'Компания', icon: Building2Icon },
];
export const EmployerBottomNav = ({
  company,
  pending,
  onSettings,
}: EmployerBottomNavProps) => (
  <nav
    aria-label="Разделы работодателя на мобильном"
    className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    {navigation.map((item, i) => (
      <button
        type="button"
        key={item.label}
        disabled={i === 1 || i === 2 || (i === 3 && !company) || pending}
        onClick={i === 3 ? onSettings : undefined}
        aria-current={i === 0 ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-1 border-t-2 border-transparent text-[10px] text-muted-foreground disabled:text-caption',
          i === 0 && 'border-primary text-brand-text',
        )}
        title={i === 1 || i === 2 ? 'Следующий этап разработки' : undefined}
      >
        <item.icon className="size-4" />
        {item.label}
      </button>
    ))}
  </nav>
);
