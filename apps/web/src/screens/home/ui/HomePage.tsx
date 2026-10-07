import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { Button } from '@/shared/ui';

export const HomePage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="max-w-3xl space-y-6">
        <p className="text-sm font-medium text-brand-text">ФСП Скаут</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Навыки, которые помогают найти свою команду
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Создайте профиль и подтвердите свои навыки. Или опишите, кого ищет
          ваша команда, и получите подборку по условиям работы.
        </p>
      </section>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">
            Кандидатам
          </p>
          <h2 className="text-2xl font-semibold">Расскажите, что вы умеете</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Укажите опыт, навыки и удобные условия работы. Вы управляете
            публикацией профиля и доступом к своим данным.
          </p>
          <Button asChild size="lg" className="mt-auto w-full sm:w-auto">
            <Link href="/candidate">
              Создать профиль <ArrowRightIcon />
            </Link>
          </Button>
        </section>
        <section className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">
            Работодателям
          </p>
          <h2 className="text-2xl font-semibold">
            Найдите специалистов для команды
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Добавьте компанию, опишите задачи и условия. Сравните анонимные
            профили по формату работы, зарплате и часовому поясу.
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="mt-auto w-full sm:w-auto"
          >
            <Link href="/employer">
              Подобрать специалистов <ArrowRightIcon />
            </Link>
          </Button>
        </section>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Для начала работы понадобится аккаунт ФСП.
      </p>
    </main>
  );
};
