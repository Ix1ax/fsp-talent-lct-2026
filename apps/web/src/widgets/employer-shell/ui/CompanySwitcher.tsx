import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import type { Company } from '@/entities/company';
interface CompanySwitcherProps {
  companies: Company[];
  company: Company | null;
  pending: boolean;
  onCompany: (id: string) => void;
  onSettings: () => void;
  onCreateCompany: () => void;
}
const labels = {
  owner: 'Владелец',
  recruiter: 'Рекрутер',
  viewer: 'Наблюдатель',
};
export const CompanySwitcher = ({
  companies,
  company,
  pending,
  onCompany,
  onSettings,
  onCreateCompany,
}: CompanySwitcherProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        aria-label={`Компания: ${company?.name ?? 'выбрать компанию'}`}
        variant="outline"
        disabled={pending}
        className="min-w-0 gap-2.5 border-border pr-3 pl-1.5 max-sm:pr-2"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[11px] text-primary-foreground">
          {company?.name
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0])
            .join('') || '+'}
        </span>
        <span className="max-w-44 truncate max-sm:hidden md:max-xl:hidden">
          {company?.name ?? 'Выбрать компанию'}
        </span>
        <ChevronDownIcon className="size-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      className="w-72 max-w-[calc(100vw-2rem)] shadow-popover"
    >
      <DropdownMenuLabel>
        <MetaLabel>Компании</MetaLabel>
      </DropdownMenuLabel>
      {companies.map((c) => (
        <DropdownMenuItem
          key={c.id}
          className={cn('min-h-11', c.id === company?.id && 'bg-accent')}
          onSelect={() => onCompany(c.id)}
        >
          <span className="grid flex-1 gap-1">
            <span>{c.name}</span>
            <span className="text-xs text-muted-foreground">
              {labels[c.memberRole]}
            </span>
          </span>
          {c.id === company?.id && '✓'}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      {company && (
        <DropdownMenuItem onSelect={onSettings}>
          Профиль компании
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={onCreateCompany}>
        + Создать компанию
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
