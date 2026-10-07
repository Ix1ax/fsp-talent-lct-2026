import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import {
  type CandidateConsents,
  getConsentPermissions,
} from '@/entities/candidate-consent';
import type { CandidateContacts } from '@/entities/candidate-contacts';

import { CandidateContactsForm } from './CandidateContactsForm';

interface CandidateContactsCardProps {
  contacts: CandidateContacts | null;
  consents: CandidateConsents;
  defaultName?: string;
  defaultEmail: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onContactsChange: (contacts: CandidateContacts) => void;
  onConsentRequired: () => Promise<void>;
}

export const CandidateContactsCard = ({
  consents,
  ...props
}: CandidateContactsCardProps) => {
  const { processing } = getConsentPermissions(consents);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Приватные контакты</CardTitle>
        <CardDescription>
          Контакты не публикуются в карточке кандидата. Работодатель получает их
          только после принятия предложения.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {processing ? (
          <CandidateContactsForm {...props} processing={processing} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Для просмотра и сохранения контактов дайте согласие на обработку
              персональных данных.
            </p>
            <Button asChild variant="outline" className="self-start">
              <a href="#consents">Перейти к согласиям</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
