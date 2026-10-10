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
import { formatDate } from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerBankApi } from '@/entities/employer-bank';

import { CandidateSummary } from './CandidateSummary';

interface CandidateDetailsProps {
  company: Company;
  catalogs: Catalogs;
  candidateId: string;
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
      // Уже открытый профиль должен учитываться, даже если диалог сразу закрыли.
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
        className="max-h-[85dvh] overflow-y-auto [overflow-wrap:anywhere] sm:max-w-2xl"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>Кандидат · {candidateId.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Обезличенный профиль. Контакты доступны после принятия предложения.
          </DialogDescription>
        </DialogHeader>
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
                    ? `Результат теста: ${candidate.assessment.scorePercent}% · ${formatDate(candidate.assessment.confirmedAt)}`
                    : 'Нет подтверждённого результата теста'}
                </p>
                {candidate.qualifications.map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.specialization} · {item.grade} ·{' '}
                    {item.stackName ?? 'Стек не указан'}
                  </p>
                ))}
                {candidate.skills.map((skill) => (
                  <div key={skill.id} className="border-t pt-3">
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Заявленный уровень: {skill.claimedLevel ?? 'не указан'} ·
                      Подтверждённый:{' '}
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
                  {Math.round((candidate.experienceMonths / 12) * 10) / 10} лет
                </p>
                {candidate.experience.map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.startedOn} — {item.endedOn ?? 'по настоящее время'}
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
                        {formatDate(item.occurredOn)}
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
            {company.memberRole !== 'viewer' && (
              <Button size="lg" disabled={busy} onClick={onOffer}>
                Предложить работу
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
