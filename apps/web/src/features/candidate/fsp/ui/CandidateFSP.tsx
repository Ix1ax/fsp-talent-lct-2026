'use client';
import Link from 'next/link';
import {
  LinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  UnlinkIcon,
} from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  FadeIn,
  RemoteState,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import { formatDate } from '@/shared/utils';

import { useCandidateFSP } from '../model';
import { FSPAchievements } from './FSPAchievements';

export const CandidateFSP = () => {
  const {
    profile,
    profileExists,
    processing,
    query,
    mutation,
    confirm,
    setConfirm,
    save,
    unlink,
  } = useCandidateFSP();
  const link = query.data?.link;
  const busy = mutation.pending;
  let ActionIcon = link ? RefreshCwIcon : LinkIcon;
  if (busy) ActionIcon = LoaderCircleIcon;
  let actionLabel = link ? 'Обновить достижения' : 'Привязать тестовый ФСП ID';
  if (busy) actionLabel = 'Обрабатываем…';
  return (
    <div className="grid gap-6">
      <p className="rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        Сейчас используется тестовый реестр ФСП. Привязка не подтверждает
        реальный ФСП ID.
      </p>
      <RemoteState
        loading={profile.loading}
        error={profile.error}
        retry={profile.retry}
      />
      {profile.data && !profileExists && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Сначала создайте профиль кандидата.
          </p>
          <Button asChild>
            <Link href={STATIC_ROUTES.CANDIDATE_PROFILE}>
              Заполнить профиль
            </Link>
          </Button>
        </div>
      )}
      {profileExists && !processing && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Для просмотра, привязки и обновления достижений нужно согласие на
            обработку данных. Удалить прежнюю привязку можно и без согласия.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={STATIC_ROUTES.CANDIDATE_CONSENTS}>
                Настроить согласия
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                mutation.clearError();
                setConfirm(true);
              }}
            >
              <UnlinkIcon aria-hidden="true" />
              Удалить прежнюю привязку
            </Button>
          </div>
        </div>
      )}
      {profileExists && processing && (
        <>
          <RemoteState
            loading={query.loading}
            error={query.error}
            retry={query.retry}
          />
          {query.data && (
            <FadeIn className="grid gap-6">
              <section
                className="rounded-xl border bg-card p-5 sm:p-6"
                aria-labelledby="fsp-link-title"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="fsp-link-title" className="text-xl font-semibold">
                      {link ? 'ФСП привязан' : 'Привяжите ФСП'}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {link
                        ? 'Достижения дополняют профиль. Подтверждённый тестом грейд сохраняется отдельно.'
                        : 'Импортируйте достижения из тестового реестра в свой профиль.'}
                    </p>
                  </div>
                  {link && <Badge variant="outline">Тестовый реестр</Badge>}
                </div>
                {link && (
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">
                        Идентификатор участника
                      </dt>
                      <dd
                        className="mt-1 truncate font-medium"
                        title={link.participantId}
                      >
                        {link.participantId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Последнее обновление
                      </dt>
                      <dd className="mt-1 font-medium">
                        {link.syncedAt
                          ? formatDate(link.syncedAt)
                          : 'Ещё не обновлялось'}
                      </dd>
                    </div>
                  </dl>
                )}
                {link?.syncStatus === 'unavailable' && (
                  <p
                    role="status"
                    className="mt-4 text-sm text-muted-foreground"
                  >
                    Источник временно недоступен. Ранее импортированные
                    достижения сохранены.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        disabled={busy}
                        onClick={() => void save(link ? 'sync' : 'link')}
                        className="min-h-11"
                      >
                        <ActionIcon
                          aria-hidden="true"
                          className={
                            busy
                              ? 'animate-spin motion-reduce:animate-none'
                              : undefined
                          }
                        />
                        {actionLabel}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      sideOffset={6}
                      className="motion-reduce:animate-none"
                    >
                      {link
                        ? 'Запросить новые данные. При ошибке прежние достижения сохранятся.'
                        : 'Аккаунт определяется автоматически по вашему входу.'}
                    </TooltipContent>
                  </Tooltip>
                  {link && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            mutation.clearError();
                            setConfirm(true);
                          }}
                        >
                          <UnlinkIcon aria-hidden="true" />
                          Удалить привязку
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={6}
                        className="motion-reduce:animate-none"
                      >
                        Удалятся привязка и импортированные достижения.
                        Подтверждённый грейд сохранится.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Если обновление временно ограничено, дождитесь окончания паузы
                  перед повторным запросом. Достижения сохраняются.
                </p>
              </section>
              {link && <FSPAchievements items={query.data.items} />}
            </FadeIn>
          )}
        </>
      )}
      {mutation.error && !confirm && (
        <FadeIn>
          <p role="alert" className="text-sm text-destructive">
            {mutation.error}
          </p>
        </FadeIn>
      )}
      {confirm && (
        <ConfirmDeleteDialog
          title="Удалить привязку ФСП?"
          description="Привязка и импортированные достижения будут удалены. Подтверждённый тестом грейд сохранится. Позже вы сможете привязать ФСП снова."
          confirmLabel="Удалить привязку"
          busy={busy}
          error={mutation.error}
          onConfirm={unlink}
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        />
      )}
    </div>
  );
};
