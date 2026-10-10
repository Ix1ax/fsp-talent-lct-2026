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

import type { EmployerGateway } from '../lib/gateway';

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
    <div className="mx-auto grid w-full max-w-4xl items-stretch gap-5 md:grid-cols-2">
      <Card className="min-w-0 justify-center py-6 sm:py-8">
        <CardHeader className="justify-items-center gap-3 px-6 text-center">
          <span
            className="mb-1 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Building2Icon className="size-6" />
          </span>
          <CardTitle className="text-lg">Начнём с компании</CardTitle>
          <CardDescription className="max-w-sm text-balance">
            Создайте компанию, чтобы публиковать потребности, приглашать коллег
            и подбирать специалистов.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center px-6 pt-2">
          <Button
            size="lg"
            disabled={busy}
            onClick={onCreate}
            className="w-full sm:w-auto"
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
