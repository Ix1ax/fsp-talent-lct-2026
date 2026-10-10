import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';

import { LANDING_ELEMENTS } from '../../constants';

export const EmployerSection = () => (
  <section
    data-landing={LANDING_ELEMENTS.EMPLOYER_NEW}
    className="bg-background [&_h2]:[max-width:950px]"
    aria-labelledby="employer-title"
  >
    <div
      data-landing={LANDING_ELEMENTS.SECTION}
      className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
    >
      <p
        data-landing={LANDING_ELEMENTS.EYEBROW}
        className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] mb-8"
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
        className="flex justify-between items-center gap-12 [margin-block:40px_64px] [&_p]:[max-width:580px] [&_p]:[font-size:18px] [&_p]:[line-height:1.7] [&_p]:text-muted-foreground [@media((max-width:767px))]:flex-col [@media((max-width:767px))]:items-start [@media((max-width:767px))]:gap-6 [@media((max-width:767px))]:mb-10"
      >
        <p>
          Ищите по навыкам и опыту. Учитывайте достижения ФСП. Приглашайте к
          разговору людей, которым подходят ваши задачи.
        </p>
        <Link
          href={STATIC_ROUTES.EMPLOYER}
          data-landing={LANDING_ELEMENTS.PRIMARY_LINK}
          className="inline-flex items-center justify-between gap-9 [padding:19px_24px] [border-radius:var(--radius-lg)] [font-size:15px] font-medium [transition:background_0.2s,_transform_0.2s] bg-primary text-primary-foreground [&:hover]:[transform:translateY(-3px)] [@media((max-width:767px))]:[padding:17px_20px]"
        >
          Перейти к поиску <ArrowUpRight size={20} />
        </Link>
      </div>
      <div
        data-landing={LANDING_ELEMENTS.EMPLOYER_WORDS}
        className="flex justify-between gap-6 pt-7 [border-top:1px_solid_var(--border)] [font-size:clamp(20px,_3vw,_40px)] [letter-spacing:-0.04em] text-brand-text [@media((max-width:767px))]:[font-size:17px] [@media((max-width:767px))]:gap-3"
        aria-hidden="true"
      >
        <span>ЗАДАЧА</span>
        <span>ЧЕЛОВЕК</span>
        <span>КОМАНДА ↗</span>
      </div>
    </div>
  </section>
);
