import Link from 'next/link';
import { ArrowUpRight, Trophy } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { buttonVariants } from '@/shared/ui';

import { LANDING_ELEMENTS } from '../../constants';
import { ScoutSymbol } from '../ScoutSymbol';

export const FederationSection = () => (
  <section
    data-landing={LANDING_ELEMENTS.FEDERATION}
    className="bg-card"
    aria-labelledby="connection-title"
  >
    <div
      data-landing={LANDING_ELEMENTS.SECTION}
      className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
    >
      <div
        data-landing={LANDING_ELEMENTS.SECTION_LABEL}
        className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] flex justify-between gap-6 [padding-bottom:22px] [border-bottom:1px_solid_var(--border)] [margin-bottom:52px] [&_span:last-child]:text-muted-foreground [@media((max-width:767px))]:[font-size:9px] [@media((max-width:767px))]:[margin-bottom:34px] [@media((max-width:767px))]:[&_span:last-child]:hidden"
      >
        <span>02 / ДАННЫЕ ФЕДЕРАЦИИ</span>
        <span>ТВОЙ СПОРТИВНЫЙ ОПЫТ В ПРОФИЛЕ</span>
      </div>
      <h2 id="connection-title">
        Результат соревнования.
        <br />
        <span>Часть твоей истории.</span>
      </h2>
      <div
        data-landing={LANDING_ELEMENTS.FEDERATION_GRID}
        className="grid [grid-template-columns:1fr_1fr] gap-10 mt-14 [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-7"
      >
        <div
          data-landing={LANDING_ELEMENTS.RECORD}
          className="rounded-xl p-8 [border:1px_solid_var(--border)] bg-background relative [&_>_svg]:text-brand-text [&_>_svg]:mb-5 [&_>_span]:block [&_>_span]:[font-size:10px] [&_>_span]:[letter-spacing:0.1em] [&_h3]:[font-size:36px] [&_h3]:[line-height:1.1] [&_h3]:[letter-spacing:-0.05em] [&_h3]:[margin-block:28px_18px] [&_p]:[max-width:380px] [&_p]:[font-size:14px] [&_p]:[line-height:1.7] [&_p]:text-muted-foreground [&_dl]:[margin-block:24px] [&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:gap-4 [&_dl_>_div]:[padding-block:14px] [&_dl_>_div]:[border-top:1px_solid_var(--border)] [&_dl_>_div]:[font-size:13px] [&_dt]:text-muted-foreground [&_small]:block [&_small]:[font-size:11px] [&_small]:text-muted-foreground [&_small]:[line-height:1.7] [@media((max-width:767px))]:p-6"
        >
          <Trophy size={32} strokeWidth={1} />
          <span>ДОСТИЖЕНИЯ ФСП</span>
          <h3>
            Важен не только
            <br />
            финальный счёт.
          </h3>
          <p>
            Дисциплина, соревнование и результат помогают рассказать о задачах,
            которые ты решал, и опыте, который получил.
          </p>
          <dl>
            <div>
              <dt>Дисциплина</dt>
              <dd>Твоё направление</dd>
            </div>
            <div>
              <dt>Соревнование</dt>
              <dd>Твой опыт</dd>
            </div>
            <div>
              <dt>Результат</dt>
              <dd>Твоё достижение</dd>
            </div>
          </dl>
          <small>Иллюстрация данных в профиле</small>
        </div>
        <div
          data-landing={LANDING_ELEMENTS.FEDERATION_SYMBOL}
          className="overflow-hidden rounded-xl bg-[#1b1c21]"
        >
          <ScoutSymbol />
        </div>
        <div
          data-landing={LANDING_ELEMENTS.FEDERATION_ACTION}
          className="[&_small]:block [&_small]:[font-size:11px] [&_small]:text-muted-foreground [&_small]:[line-height:1.7] [&_small]:[grid-column:1/-1] [grid-column:1/-1] grid [grid-template-columns:1fr_auto] [gap:24px_80px] items-center pt-6 [border-top:1px_solid_var(--border)] [&_p]:[font-size:22px] [&_p]:[line-height:1.5] [&_p]:[max-width:600px] [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-6"
        >
          <p>
            Свяжи профиль с ФСП и дополни профессиональную историю данными
            федерации.
          </p>
          <Link
            href={STATIC_ROUTES.CANDIDATE_FSP}
            data-landing={LANDING_ELEMENTS.PRIMARY_LINK}
            className={buttonVariants({
              className:
                'h-auto min-h-11 justify-between gap-6 px-6 py-4 [&_svg]:size-5',
            })}
          >
            Перейти к достижениям <ArrowUpRight size={20} />
          </Link>
          <small>
            Сейчас доступен тестовый реестр. Подтверждение реального ФСП ID пока
            недоступно.
          </small>
        </div>
      </div>
    </div>
  </section>
);
