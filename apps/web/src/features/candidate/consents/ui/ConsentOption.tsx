import { Badge, Button } from '@/shared/ui';

import { CONSENT_LABELS } from '../model';

interface ConsentOptionProps {
  kind: 'processing' | 'publication';
  active: boolean;
  disabled: boolean;
  policyAvailable: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}

export const ConsentOption = ({
  kind,
  active,
  disabled,
  policyAvailable,
  onGrant,
  onRevoke,
}: ConsentOptionProps) => {
  const processing = kind === 'processing';
  const titleId = `consent-${kind}-title`;
  let status = processing ? 'Нужно для профиля' : 'По желанию';

  if (active) status = 'Действует';

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-4 border border-border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={titleId} className="min-w-0 text-base font-medium">
          {CONSENT_LABELS[kind]}
        </h3>
        <Badge
          variant={active ? 'success' : 'outline'}
          className="h-auto min-h-6 whitespace-normal"
        >
          {status}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {processing
          ? 'Позволяет сохранять профиль, контакты и навыки. Без этого согласия заполнение профиля недоступно.'
          : 'Разрешает показывать профиль работодателям. Можно дать позже: для публикации также нужно выбрать статус поиска на шаге «Профиль».'}
      </p>
      {active ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full self-start sm:w-auto"
          disabled={disabled}
          onClick={onRevoke}
          aria-label={`Отозвать согласие: ${CONSENT_LABELS[kind]}`}
        >
          Отозвать
        </Button>
      ) : (
        <Button
          type="button"
          variant={processing ? 'default' : 'outline'}
          className="h-auto min-h-11 w-full self-start py-2 whitespace-normal sm:w-auto"
          disabled={disabled || !policyAvailable}
          onClick={onGrant}
        >
          Ознакомиться и дать согласие
        </Button>
      )}
    </section>
  );
};
