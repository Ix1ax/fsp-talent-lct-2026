import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';

import { LANDING_ELEMENTS } from '../../constants';
import { PointerSurface } from '../PointerSurface';

export const ClosingSection = () => (
  <section
    data-landing={LANDING_ELEMENTS.START_SECTION}
    className="bg-primary text-primary-foreground"
    aria-labelledby="cta-title"
  >
    <PointerSurface>
      <div
        data-landing={LANDING_ELEMENTS.SECTION}
        className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
      >
        <p
          data-landing={LANDING_ELEMENTS.EYEBROW}
          className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] mb-8"
        >
          ТВОЯ ТОЧКА СТАРТА
        </p>
        <h2 id="cta-title">С чего начнём?</h2>
        <div
          data-landing={LANDING_ELEMENTS.START_CHOICES}
          className="grid [grid-template-columns:1fr_1fr] mt-12 [border-top:1px_solid_rgb(255_255_255_/_35%)] [&_>_a]:[padding:32px_32px_16px_0] [&_>_a:first-child]:pl-8 [@media((max-width:767px))]:[&_>_a:first-child]:pl-4 [&_>_a]:relative [&_>_a]:[transition:background_0.2s] [&_>_a:last-child]:[border-left:1px_solid_rgb(255_255_255_/_35%)] [&_>_a:last-child]:pl-10 [&_>_a:hover]:[background:rgb(255_255_255_/_8%)] [&_span]:[font-size:10px] [&_span]:[letter-spacing:0.1em] [&_strong]:block [&_strong]:[font-size:clamp(35px,_4.7vw,_65px)] [&_strong]:[line-height:1.05] [&_strong]:[letter-spacing:-0.05em] [&_strong]:font-medium [&_strong]:[margin-block:32px] [&_svg]:absolute [&_svg]:[right:24px] [&_svg]:[top:90px] [&_p]:[font-size:14px] [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:[&_>_a:last-child]:border-l-0 [@media((max-width:767px))]:[&_>_a:last-child]:[border-top:1px_solid_rgb(255_255_255_/_35%)] [@media((max-width:767px))]:[&_>_a:last-child]:pl-0 [@media((max-width:767px))]:[&_>_a:last-child]:mt-6"
        >
          <Link href={STATIC_ROUTES.CANDIDATE}>
            <span>01 / ИЩУ РАБОТУ</span>
            <strong>
              Показать
              <br />
              свой опыт.
            </strong>
            <ArrowUpRight size={44} />
            <p>Создать профиль кандидата</p>
          </Link>
          <Link href={STATIC_ROUTES.EMPLOYER}>
            <span>02 / ИЩУ СПЕЦИАЛИСТОВ</span>
            <strong>
              Найти
              <br />
              своих людей.
            </strong>
            <ArrowUpRight size={44} />
            <p>Открыть кабинет работодателя</p>
          </Link>
        </div>
      </div>
    </PointerSurface>
  </section>
);
