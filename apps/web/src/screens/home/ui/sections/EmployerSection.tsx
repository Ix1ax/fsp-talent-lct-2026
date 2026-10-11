import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { buttonVariants } from '@/shared/ui';

import { LANDING_ANCHORS, LANDING_ELEMENTS } from '../../constants';
import { employerSteps } from '../../model';
import { CandidatePreviewCard } from '../CandidatePreviewCard';

export const EmployerSection = () => {
  return (
    <section
      id={LANDING_ANCHORS.EMPLOYERS}
      tabIndex={-1}
      data-landing={LANDING_ELEMENTS.EMPLOYER_NEW}
      className="bg-background scroll-mt-16 outline-none [&_h2]:[max-width:950px]"
      aria-labelledby="employer-title"
    >
      <div
        data-landing={LANDING_ELEMENTS.SECTION}
        className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
      >
        <p
          data-landing={LANDING_ELEMENTS.EYEBROW}
          className="[font-size:12px] font-medium [line-height:1.6] [letter-spacing:0.08em] mb-8"
        >
          05 / ДЛЯ РАБОТОДАТЕЛЕЙ
        </p>
        <h2 id="employer-title">
          Следующий сильный
          <br />
          участник вашей команды
          <br />
          <span>может быть здесь.</span>
        </h2>
        <div
          data-landing={LANDING_ELEMENTS.EMPLOYER_BOTTOM}
          className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_440px)] lg:gap-18"
        >
          <div className="grid gap-10">
            <p className="max-w-[580px] text-lg leading-[1.7] text-muted-foreground">
              Ищите по навыкам и опыту. Учитывайте достижения ФСП. Приглашайте к
              разговору людей, которым подходят ваши задачи.
            </p>
            <ol className="grid gap-0 [&_li]:flex [&_li]:gap-6 [&_li]:border-t [&_li]:py-6 [&_li_>_span]:w-6 [&_li_>_span]:shrink-0 [&_li_>_span]:text-xs [&_li_>_span]:text-brand-text [&_h3]:mb-2 [&_h3]:text-[22px] [&_h3]:tracking-[-0.04em] [&_p]:text-[15px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground">
              {employerSteps.map(({ number, title, text }) => (
                <li key={number}>
                  <span>{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href={STATIC_ROUTES.EMPLOYER}
              data-landing={LANDING_ELEMENTS.PRIMARY_LINK}
              className={buttonVariants({
                className:
                  'h-auto min-h-11 justify-self-start justify-between gap-6 px-6 py-4 [&_svg]:size-5',
              })}
            >
              Перейти к поиску <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="lg:sticky lg:top-28">
            <CandidatePreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
};
