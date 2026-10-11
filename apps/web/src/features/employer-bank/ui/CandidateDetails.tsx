'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useRemoteData } from '@/shared/hooks/useRemoteData';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  RemoteState,
} from '@/shared/ui';
import {
  formatCalendarDate,
  formatMonthYear,
  formatPercent,
  pluralizeRu,
} from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerBankApi } from '@/entities/employer-bank';
import type { Recommendation } from '@/entities/employer-need';

import { CandidateSummary } from './CandidateSummary';
import { RecommendationCard } from './RecommendationCard';

interface CandidateDetailsProps {
  company: Company;
  catalogs: Catalogs;
  candidateId: string;
  recommendation?: Recommendation;
  api: EmployerBankApi;
  busy: boolean;
  onClose: () => void;
  onOffer: () => void;
  onViewed?: () => void;
}

const EDUCATION: Record<string, string> = {
  secondary: 'Среднее',
  vocational: 'Среднее профессиональное',
  incomplete_higher: 'Неоконченное высшее',
  higher: 'Высшее',
  bachelor: 'Бакалавриат',
  master: 'Магистратура',
  phd: 'Кандидат наук',
  doctor: 'Доктор наук',
};

export const CandidateDetails = ({
  company,
  catalogs,
  candidateId,
  recommendation,
  api,
  busy,
  onClose,
  onOffer,
  onViewed,
}: CandidateDetailsProps) => {
  const load = useCallback(
    (signal: AbortSignal) =>
      api.getBankCandidate(company.id, candidateId, signal),
    [api, company.id, candidateId],
  );
  const remote = useRemoteData(load);

  const candidate = remote.data;
  const onViewedRef = useRef(onViewed);
  useEffect(() => {
    onViewedRef.current = onViewed;
  }, [onViewed]);
  const recordView = useCallback(
    async (signal: AbortSignal) => {
      signal.throwIfAborted();
      const interaction = await api.viewBankCandidate(company.id, candidateId);
      onViewedRef.current?.();
      return interaction;
    },
    [api, company.id, candidateId],
  );
  const view = useRemoteData(recordView, 0, !!candidate);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 [overflow-wrap:anywhere] sm:max-w-4xl"
        showCloseButton={!busy}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>Профиль кандидата</DialogTitle>
          <DialogDescription>
            Обезличенный профиль. Контакты доступны после принятия предложения.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <RemoteState {...remote} />
          {candidate && (
            <div className="grid min-w-0 gap-5">
              {view.loading && (
                <p role="status" className="sr-only">
                  Сохраняем просмотр кандидата…
                </p>
              )}
              {view.error && (
                <div
                  role="alert"
                  className="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <p className="text-sm text-destructive">
                    Не удалось сохранить просмотр. {view.error}
                  </p>
                  <Button
                    variant="outline"
                    className="justify-self-start"
                    onClick={view.retry}
                  >
                    Повторить
                  </Button>
                </div>
              )}
              {recommendation && (
                <RecommendationCard
                  candidate={recommendation}
                  catalogs={catalogs}
                  position={0}
                  heading="Соответствие потребности"
                />
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Профиль и условия поиска</CardTitle>
                </CardHeader>
                <CardContent>
                  <CandidateSummary candidate={candidate} catalogs={catalogs} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Подтверждение квалификации</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm">
                    {candidate.assessment
                      ? `Результат теста: ${formatPercent(candidate.assessment.scorePercent)} · ${formatCalendarDate(candidate.assessment.confirmedAt)}`
                      : 'Нет подтверждённого результата теста'}
                  </p>
                  {candidate.qualifications.map((item, i) => (
                    <p key={i} className="text-sm">
                      {item.specialization} · {item.grade} ·{' '}
                      {item.stackName ?? 'Стек не указан'}
                    </p>
                  ))}
                  {candidate.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="grid gap-1 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_2fr] sm:items-center"
                    >
                      <p className="font-medium">{skill.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Заявленный уровень: {skill.claimedLevel ?? 'не указан'}{' '}
                        · Подтверждённый:{' '}
                        {skill.verifiedLevel ?? 'нет подтверждения'}
                      </p>
                    </div>
                  ))}
                  {!candidate.skills.length && (
                    <p className="text-sm text-muted-foreground">
                      Навыки не указаны
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Опыт и образование</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm">
                    Опыт:{' '}
                    {pluralizeRu(
                      Math.round((candidate.experienceMonths / 12) * 10) / 10,
                      ['год', 'года', 'лет'],
                    )}
                  </p>
                  {candidate.experience.map((item, i) => (
                    <p key={i} className="text-sm">
                      {formatMonthYear(item.startedOn)} —{' '}
                      {item.endedOn
                        ? formatMonthYear(item.endedOn)
                        : 'по настоящее время'}
                    </p>
                  ))}
                  {candidate.education.map((item, i) => (
                    <p key={i} className="text-sm">
                      {EDUCATION[item.level] ?? item.level} ·{' '}
                      {item.graduationYear}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Достижения ФСП</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {candidate.achievements.length ? (
                    candidate.achievements.map((item) => (
                      <div key={item.id}>
                        <p className="font-medium">{item.eventName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.discipline} · {item.result} ·{' '}
                          {formatCalendarDate(item.occurredOn)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Достижений пока нет
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        {candidate && company.memberRole !== 'viewer' && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Контакты откроются после принятия предложения
            </p>
            <Button disabled={busy} onClick={onOffer}>
              Предложить работу
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
