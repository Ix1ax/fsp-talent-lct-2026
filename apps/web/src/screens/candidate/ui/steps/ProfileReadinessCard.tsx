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
    <CardHeader>
      <CardTitle>Готовность профиля</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <p className="text-2xl font-semibold">{readiness.percent}%</p>
      <progress
        className="h-2 w-full accent-primary"
        aria-label="Готовность профиля по данным сервера"
        max={100}
        value={readiness.percent}
      />
      {readiness.readyToPublish ? (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 justify-start whitespace-normal text-left"
          disabled={busy || refreshing}
          onClick={() => onSelectItem('search_status')}
        >
          Условия публикации выполнены. Выберите статус поиска на шаге
          «Профиль».
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Проверьте обязательные пункты перед публикацией профиля.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {readiness.items.map((item) => (
          <li key={item.code}>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || refreshing}
              onClick={() => onSelectItem(item.code)}
              className="h-auto min-h-11 w-full flex-wrap justify-between rounded-md px-2 py-2 text-left font-normal whitespace-normal"
            >
              <span className="min-w-0 wrap-anywhere">
                {item.title}
                {item.required && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · обязательный
                  </span>
                )}
              </span>
              <Badge variant={item.done ? 'secondary' : 'outline'}>
                {item.done ? 'Выполнено' : 'Не выполнено'}
              </Badge>
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
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={busy || refreshing}
          className="min-h-11"
          onClick={onGoToProfile}
        >
          {readiness.readyToPublish
            ? 'Изменить статус поиска'
            : 'Проверить профиль'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || refreshing}
          className="min-h-11"
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
        className="min-h-11 self-start"
      >
        {refreshing ? 'Обновление…' : 'Обновить данные'}
      </Button>
    </CardContent>
  </Card>
);
