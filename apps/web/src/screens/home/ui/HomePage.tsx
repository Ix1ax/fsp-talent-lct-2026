import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button, FadeIn, Stagger, StaggerItem } from '@/shared/ui';

export const HomePage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-20">
      <FadeIn className="max-w-3xl space-y-6">
        <p className="text-sm font-medium text-brand-text">ФСП Скаут</p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Навыки, которые помогают найти свою команду
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Создайте профиль и подтвердите свои навыки. Или опишите, кого ищет
          ваша команда, и получите подборку по условиям работы.
        </p>
      </FadeIn>
      <Stagger
        interval={0.08}
        className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2"
      >
        <StaggerItem className="flex min-w-0 flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">
            Кандидатам
          </p>
          <h2 className="text-2xl font-semibold">Расскажите, что вы умеете</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Укажите опыт, навыки и удобные условия работы. Вы управляете
            публикацией профиля и доступом к своим данным.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-auto h-auto min-h-12 w-full whitespace-normal sm:w-auto"
          >
            <Link href={STATIC_ROUTES.CANDIDATE}>
              Создать профиль <ArrowRightIcon />
            </Link>
          </Button>
        </StaggerItem>
        <StaggerItem className="flex min-w-0 flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8">
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
            className="mt-auto h-auto min-h-12 w-full whitespace-normal sm:w-auto"
          >
            <Link href={STATIC_ROUTES.EMPLOYER}>
              Подобрать специалистов <ArrowRightIcon />
            </Link>
          </Button>
        </StaggerItem>
      </Stagger>
      <p className="mt-8 text-sm text-muted-foreground">
        Для начала работы понадобится аккаунт ФСП.
      </p>
    </main>
  );
};
