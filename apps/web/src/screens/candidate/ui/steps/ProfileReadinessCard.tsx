import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import type { CandidateReadiness } from '@/entities/candidate-profile';

interface ProfileReadinessCardProps {
  readiness: CandidateReadiness;
  busy: boolean;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
}
export const ProfileReadinessCard = ({
  readiness,
  busy,
  refreshing,
  error,
  onRefresh,
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
      <p className="text-sm text-muted-foreground">
        {readiness.readyToPublish
          ? 'Условия публикации выполнены. Выберите статус поиска на шаге «Профиль».'
          : 'Проверьте обязательные пункты перед публикацией профиля.'}
      </p>
      <ul className="flex flex-col gap-3">
        {readiness.items.map((item) => (
          <li
            key={item.code}
            className="flex flex-wrap items-center justify-between gap-2"
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
      <Button
        type="button"
        variant="outline"
        disabled={busy || refreshing}
        onClick={onRefresh}
        className="self-start"
      >
        {refreshing ? 'Обновление…' : 'Обновить данные'}
      </Button>
    </CardContent>
  </Card>
);
