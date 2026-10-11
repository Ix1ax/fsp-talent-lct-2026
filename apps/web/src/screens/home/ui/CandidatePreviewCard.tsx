import { LockKeyhole } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

const PREVIEW_SKILLS = ['Go', 'PostgreSQL', 'Kafka', 'Docker'];

/** Макет анонимной карточки из банка кандидатов — как её видит работодатель. */
export const CandidatePreviewCard = () => {
  return (
    <figure className="m-0 grid gap-4">
      <Card className="min-w-0 shadow-[var(--shadow-popover)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="whitespace-nowrap">
            Кандидат · 7f3a21c0
          </CardTitle>
          <Badge variant="success">Грейд подтверждён</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="text-base font-medium">
            Backend-разработчик · Middle · Go
          </p>
          <p className="text-muted-foreground">
            Опыт: 3 года · Активно ищет работу
          </p>
          <p>Москва · UTC+3 · От 250 000 ₽/мес</p>
          <ul className="flex flex-wrap gap-2" aria-label="Навыки">
            {PREVIEW_SKILLS.map((skill) => (
              <li key={skill}>
                <Badge variant="secondary">{skill}</Badge>
              </li>
            ))}
          </ul>
          <p>Достижения ФСП: 4 · призёр командного этапа</p>
          <p className="flex items-center gap-2 border-t pt-3 text-muted-foreground">
            <LockKeyhole size={16} aria-hidden="true" />
            Имя и контакты — после принятия предложения
          </p>
        </CardContent>
      </Card>
      <figcaption className="text-sm text-muted-foreground">
        Пример: так работодатель видит профиль до знакомства.
      </figcaption>
    </figure>
  );
};
