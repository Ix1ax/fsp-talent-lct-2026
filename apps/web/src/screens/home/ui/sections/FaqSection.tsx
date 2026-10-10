import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';

import { LANDING_ELEMENTS } from '../../constants';
import { LandingFaq } from '../LandingFaq';

export const FaqSection = () => (
  <section
    data-landing={LANDING_ELEMENTS.SECTION}
    className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
    aria-labelledby="faq-title"
  >
    <div
      data-landing={LANDING_ELEMENTS.SECTION_LABEL}
      className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] flex justify-between gap-6 [padding-bottom:22px] [border-bottom:1px_solid_var(--border)] [margin-bottom:52px] [&_span:last-child]:text-muted-foreground [@media((max-width:767px))]:[font-size:9px] [@media((max-width:767px))]:[margin-bottom:34px] [@media((max-width:767px))]:[&_span:last-child]:hidden"
    >
      <span>06 / ЧТО НУЖНО ЗНАТЬ</span>
      <Link href={STATIC_ROUTES.GUIDES}>Открыть справочник ↗</Link>
    </div>
    <div
      data-landing={LANDING_ELEMENTS.ANSWERS_GRID}
      className="grid [grid-template-columns:1fr_1.3fr] [gap:60px] [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-7"
    >
      <h2 id="faq-title">
        Без лишних
        <br />
        <span>неизвестных.</span>
      </h2>
      <div>
        <LandingFaq />
        <Link
          href={STATIC_ROUTES.GUIDES}
          data-landing={LANDING_ELEMENTS.TEXT_LINK}
          className="inline-flex items-center gap-4 py-3 [border-bottom:1px_solid_currentColor] [font-size:14px]"
        >
          Как устроена платформа <ArrowUpRight size={18} />
        </Link>
      </div>
    </div>
  </section>
);
