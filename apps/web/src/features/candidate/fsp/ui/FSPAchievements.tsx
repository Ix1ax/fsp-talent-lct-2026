import { TrophyIcon } from 'lucide-react';

import { Badge, Stagger, StaggerItem } from '@/shared/ui';
import type { FSPAchievement } from '@/entities/candidate/fsp';
interface FSPAchievementsProps {
  items: FSPAchievement[];
}
export const FSPAchievements = ({ items }: FSPAchievementsProps) => (
  <section aria-labelledby="fsp-achievements-title" className="space-y-4">
    <div className="flex items-center gap-3">
      <h2 id="fsp-achievements-title" className="text-xl font-semibold">
        Достижения
      </h2>
      <Badge variant="secondary">{items.length}</Badge>
    </div>
    {items.length === 0 ? (
      <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
        Достижений пока нет. Обновите данные, чтобы проверить новые результаты.
      </p>
    ) : (
      <Stagger className="grid gap-3">
        {items.map((item) => (
          <StaggerItem
            key={item.id}
            className="min-w-0 rounded-xl border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <TrophyIcon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold wrap-anywhere">
                    {item.eventName}
                  </h3>
                  <time
                    dateTime={item.occurredOn}
                    className="text-xs text-muted-foreground"
                  >
                    {new Date(`${item.occurredOn}T12:00:00`).toLocaleDateString(
                      'ru-RU',
                    )}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.discipline}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm">{item.result}</span>
                  {item.place !== null && (
                    <Badge variant="outline">Место {item.place}</Badge>
                  )}
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    )}
  </section>
);
