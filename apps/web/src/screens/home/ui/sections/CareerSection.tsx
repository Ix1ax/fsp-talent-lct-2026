import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';

import { LANDING_ELEMENTS } from '../../constants';
import { profilePrivacyRules } from '../../model';

export const CareerSection = () => {
  return (
    <section
      data-landing={LANDING_ELEMENTS.CONTROL_SECTION}
      className="bg-accent"
      aria-labelledby="journey-title"
    >
      <div
        data-landing={LANDING_ELEMENTS.SECTION}
        className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
      >
        <div
          data-landing={LANDING_ELEMENTS.SECTION_LABEL}
          className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] flex justify-between gap-6 [padding-bottom:22px] [border-bottom:1px_solid_var(--border)] [margin-bottom:52px] [&_span:last-child]:text-muted-foreground [@media((max-width:767px))]:[font-size:9px] [@media((max-width:767px))]:[margin-bottom:34px] [@media((max-width:767px))]:[&_span:last-child]:hidden"
        >
          <span>04 / ПРАВИЛА ЗНАКОМСТВА</span>
          <span>ТВОИ ДАННЫЕ — ТВОЁ РЕШЕНИЕ</span>
        </div>
        <div
          data-landing={LANDING_ELEMENTS.CONTROL_GRID}
          className="grid [grid-template-columns:1fr_1fr] gap-18 [&_>_div:first-child_>_svg]:text-brand-text [&_>_div:first-child_>_svg]:mb-7 [&_h2]:mb-8 [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-7"
        >
          <div>
            <ShieldCheck size={44} strokeWidth={1} />
            <h2 id="journey-title">
              Открыт к работе.
              <br />
              <span>Личное — под контролем.</span>
            </h2>
            <Link
              href={STATIC_ROUTES.CANDIDATE}
              data-landing={LANDING_ELEMENTS.TEXT_LINK}
              className="inline-flex items-center gap-4 py-3 [border-bottom:1px_solid_currentColor] [font-size:14px]"
            >
              Настроить свой профиль <ArrowUpRight size={18} />
            </Link>
          </div>
          <div
            data-landing={LANDING_ELEMENTS.CONTROL_RULES}
            className="[&_article]:flex [&_article]:gap-6 [&_article]:[border-top:1px_solid_var(--input)] [&_article]:py-7 [&_article_>_span]:[font-size:12px] [&_article_>_span]:text-brand-text [&_h3]:[font-size:24px] [&_h3]:[letter-spacing:-0.04em] [&_h3]:mb-3 [&_p]:[font-size:15px] [&_p]:[line-height:1.7] [&_p]:text-muted-foreground"
          >
            {profilePrivacyRules.map(({ number, title, text }) => (
              <article key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
