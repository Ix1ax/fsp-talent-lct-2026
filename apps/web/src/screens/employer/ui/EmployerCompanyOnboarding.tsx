import { Building2Icon, PlusIcon } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { AcceptInvitation } from '@/features/company';

import type { EmployerGateway } from '../lib';

const ONBOARDING_STEPS = [
  {
    title: 'Профиль компании',
    text: 'Название, ИНН и документы для проверки.',
  },
  { title: 'Потребность', text: 'Специализация, грейд, стек и условия.' },
  { title: 'Подбор', text: 'Анонимные профили и предложения кандидатам.' },
];

interface EmployerCompanyOnboardingProps {
  api: EmployerGateway;
  onDirtyChange?: (dirty: boolean) => void;
  busy: boolean;
  onCreate: () => void;
  onAccepted: (companyId: string) => Promise<void>;
  onBusyChange: (value: boolean) => void;
}

export const EmployerCompanyOnboarding = ({
  api,
  onDirtyChange,
  busy,
  onCreate,
  onAccepted,
  onBusyChange,
}: EmployerCompanyOnboardingProps) => {
  return (
    <div className="grid w-full items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="min-w-0 py-6 sm:py-8">
        <CardHeader className="gap-3 px-6">
          <span
            className="mb-1 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Building2Icon className="size-6" />
          </span>
          <CardTitle className="text-lg">Начнём с компании</CardTitle>
          <CardDescription className="max-w-xl">
            Создайте компанию, чтобы публиковать потребности, приглашать коллег
            и подбирать специалистов.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-6">
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            {ONBOARDING_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-1 rounded-lg bg-muted/60 p-3"
              >
                <span className="text-xs text-brand-text">0{index + 1}</span>
                <span className="font-medium">{step.title}</span>
                <span className="text-muted-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
          <Button
            size="lg"
            disabled={busy}
            onClick={onCreate}
            className="w-full sm:w-auto sm:justify-self-start lg:justify-self-end"
          >
            <PlusIcon />
            Создать компанию
          </Button>
        </CardContent>
      </Card>
      <AcceptInvitation
        onDirtyChange={onDirtyChange}
        api={api}
        onBusyChange={onBusyChange}
        onAccepted={onAccepted}
      />
    </div>
  );
};
