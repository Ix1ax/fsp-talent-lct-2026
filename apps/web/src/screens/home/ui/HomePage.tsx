import { LoginButton } from '@/features/auth';
import { ApiStatus } from '@/widgets/api-status';

export const HomePage = () => {
  return (
    <main className="mx-auto max-w-[1140px] p-8 max-md:p-5">
      <header className="flex items-center justify-between gap-5 text-[13px] text-muted-foreground max-md:items-start">
        <span className="bg-primary px-[18px] py-3 text-[22px] font-black text-primary-foreground">
          ФСП
        </span>
        <LoginButton />
      </header>

      <section className="pt-[90px] pb-14 max-md:pt-13">
        <p className="text-xs tracking-[3px] text-brand-soft">
          DEVELOPMENT WORKSPACE
        </p>
        <h1 className="max-w-[900px] text-[clamp(32px,5vw,60px)] leading-[1.12] tracking-[-2px] max-md:tracking-[-1px]">
          Основа готова.
          <br />
          Дальше — ваш код.
        </h1>
        <p className="mt-4 max-w-[620px] text-lg leading-relaxed text-muted-foreground">
          Стартовая страница монорепозитория. Здесь можно проверить, что
          фронтенд видит API.
        </p>
        <div className="mt-4">
          <ApiStatus />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
        <article className="border-t-[3px] border-primary bg-surface p-7">
          <span className="text-[11px] tracking-[2px] text-muted-foreground">
            APPS / API
          </span>
          <h2 className="mt-1 text-2xl">Go + Gin</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Postgres, Redis, S3 и миграции.
          </p>
        </article>
        <article className="border-t-[3px] border-primary bg-surface p-7">
          <span className="text-[11px] tracking-[2px] text-muted-foreground">
            APPS / WEB
          </span>
          <h2 className="mt-1 text-2xl">Next.js + FSD</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            App Router, TypeScript и общий API-контракт.
          </p>
        </article>
      </div>

      <footer className="pt-12 text-xs text-muted-foreground">
        Технический бойлерплейт · продуктовые сценарии ещё не реализованы
      </footer>
    </main>
  );
};
