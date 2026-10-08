import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import type { CandidateReadiness } from '@/entities/candidate';

interface ProfileReadinessCardProps {
  readiness: CandidateReadiness;
  busy: boolean;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
  onGoToProfile: () => void;
  onGoToConsents: () => void;
  onSelectItem: (code: string) => void;
}
export const ProfileReadinessCard = ({
  readiness,
  busy,
  refreshing,
  error,
  onRefresh,
  onGoToProfile,
  onGoToConsents,
  onSelectItem,
}: ProfileReadinessCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between gap-4">
      <CardTitle>Готовность профиля</CardTitle>
      <p className="shrink-0 text-2xl font-semibold tabular-nums">
        {readiness.percent}%
      </p>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <progress
        className="h-2 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
        aria-label="Готовность профиля по данным сервера"
        max={100}
        value={readiness.percent}
      />
      {readiness.readyToPublish ? (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full min-w-0 justify-between gap-3 px-3 py-3 text-left whitespace-normal"
          disabled={busy || refreshing}
          onClick={() => onSelectItem('search_status')}
        >
          <span className="min-w-0">
            <span className="block font-medium">Выберите статус поиска</span>
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              Условия публикации выполнены.
            </span>
          </span>
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Проверьте обязательные пункты перед публикацией профиля.
        </p>
      )}
      <ul className="divide-y divide-border">
        {readiness.items.map((item) => (
          <li key={item.code}>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || refreshing}
              onClick={() => onSelectItem(item.code)}
              className="grid h-auto min-h-11 w-full min-w-0 grid-cols-[minmax(0,1fr)_16px] items-center gap-3 rounded-md px-2 py-3 text-left text-base font-normal whitespace-normal sm:text-sm"
            >
              <span className="min-w-0">
                <span className="block wrap-anywhere leading-relaxed">
                  {item.title}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={item.done ? 'success' : 'outline'}>
                    {item.done ? 'Выполнено' : 'Не выполнено'}
                  </Badge>
                  {item.required && (
                    <span className="text-xs text-muted-foreground">
                      Обязательный пункт
                    </span>
                  )}
                </span>
              </span>
              <ChevronRightIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Учитываются сохранённые данные на сервере. Пропущенные шаги и черновики
        не означают выполнение чек-листа.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button
          type="button"
          disabled={busy || refreshing}
          variant={readiness.readyToPublish ? 'outline' : 'default'}
          className="h-auto min-h-11 min-w-0 whitespace-normal"
          onClick={onGoToProfile}
        >
          {readiness.readyToPublish
            ? 'Редактировать профиль'
            : 'Проверить профиль'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || refreshing}
          className="h-auto min-h-11 min-w-0 whitespace-normal"
          onClick={onGoToConsents}
        >
          Проверить согласия
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy || refreshing}
        onClick={onRefresh}
        className="h-auto min-h-11 w-full whitespace-normal sm:w-auto sm:self-start"
      >
        {refreshing ? 'Обновление…' : 'Обновить данные'}
      </Button>
    </CardContent>
  </Card>
);
import { ChevronRightIcon } from 'lucide-react';
