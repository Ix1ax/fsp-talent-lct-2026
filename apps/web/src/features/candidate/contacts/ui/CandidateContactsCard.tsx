import type { FormDraftBridge } from '@/shared/hooks';
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
  type CandidateContacts,
  getConsentPermissions,
} from '@/entities/candidate';

import type { ContactsFormValues } from '../model';
import { CandidateContactsForm } from './CandidateContactsForm';

interface CandidateContactsCardProps extends FormDraftBridge<ContactsFormValues> {
  contacts: CandidateContacts | null;
  consents: CandidateConsents;
  defaultName?: string;
  defaultEmail: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onContactsChange: (contacts: CandidateContacts) => void;
  onConsentRequired: () => Promise<void>;
  onGoToConsents?: () => void;
  onSaved?: () => void;
}

export const CandidateContactsCard = ({
  consents,
  onGoToConsents,
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
        {!processing && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Для просмотра и сохранения контактов дайте согласие на обработку
              персональных данных.
            </p>
            <Button asChild variant="outline" className="self-start">
              <a
                href="#consents"
                onClick={(event) => {
                  if (onGoToConsents) {
                    event.preventDefault();
                    onGoToConsents();
                  }
                }}
              >
                Перейти к согласиям
              </a>
            </Button>
          </div>
        )}
        {(processing || props.importedDraft) && (
          <CandidateContactsForm {...props} processing={processing} />
        )}
      </CardContent>
    </Card>
  );
};
