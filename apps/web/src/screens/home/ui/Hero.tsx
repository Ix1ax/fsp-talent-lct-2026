'use client';

import { type MouseEventHandler, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { useMediaQuery } from '@/shared/hooks';
import { buttonVariants } from '@/shared/ui';

import { LANDING_ELEMENTS } from '../constants';

export const Hero = () => {
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', true);
  const visible = useInView(ref);

  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const desktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (visible && !reduced && !paused && desktop) {
      void video.current?.play().catch(() => setPlaying(false));
    } else {
      video.current?.pause();
    }
  }, [visible, reduced, paused, desktop]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.4]);

  const handleNavigateClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const target = document.getElementById('manifest');
    if (!target) return;

    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduced ? 'instant' : 'smooth',
      block: 'start',
    });
    window.history.replaceState(null, '', '#manifest');
  };

  return (
    <section
      ref={ref}
      data-landing={LANDING_ELEMENTS.HERO}
      className="pt-0 relative [min-height:max(760px,_100svh)] flex flex-col justify-center [background:#1b1c21] [color:#efefef] isolate overflow-hidden [&_h1]:relative [&_h1]:[font-size:clamp(4.2rem,_9.1vw,_9.2rem)] [&_h1]:[line-height:1.02] [&_h1]:[letter-spacing:-0.068em] [&_h1]:font-[550] [&_h1]:[animation:enter_0.9s_cubic-bezier(0.2,_0.7,_0.2,_1)_both] [&_h1]:[--tw-enter-opacity:0] [&_h1]:[--tw-enter-translate-x:-24px] [&_h1_>_span]:[color:#efefef] [&_h1_>_svg]:absolute [&_h1_>_svg]:right-0 [&_h1_>_svg]:[top:12%] [&_h1_>_svg]:[width:clamp(80px,_13vw,_190px)] [&_h1_>_svg]:h-auto [&_h1_>_svg]:[stroke-width:0.85] [&_h1_>_svg]:[color:#efefef] [&_h1_>_svg]:[animation:enter_0.9s_cubic-bezier(0.2,_0.7,_0.2,_1)_both] [&_h1_>_svg]:[--tw-enter-opacity:0] [&_h1_>_svg]:[--tw-enter-rotate:-20deg] [&_h1_>_svg]:[--tw-enter-translate-x:-28px] [&_h1_>_svg]:[--tw-enter-translate-y:28px] [@media((max-width:1000px))]:[&_h1_>_svg]:[width:95px] [@media((max-width:767px))]:[&_h1]:[font-size:clamp(3.25rem,_11vw,_5.4rem)] [@media((max-width:767px))]:[&_h1_>_svg]:hidden [&_[data-landing~=filmShade]]:[background:linear-gradient(90deg,_rgb(15_16_23_/_83%),_rgb(15_16_23_/_38%)),_linear-gradient(0deg,_rgb(15_16_23_/_70%),_transparent_55%)] [&_[data-landing~=filmContent]]:absolute [&_[data-landing~=filmContent]]:bottom-0 [&_[data-landing~=filmContent]]:inset-x-0 [&_[data-landing~=filmContent]]:h-auto [&_[data-landing~=filmContent]]:py-6 [&_[data-landing~=filmBottom]]:mt-0 [&_[data-landing~=filmBottom]]:[border-top:1px_solid_rgb(239_239_239_/_30%)] [&_[data-landing~=filmBottom]]:pt-5 [&_[data-landing~=statusDot]]:[background:#f11933] [@media((max-width:767px))]:[min-height:max(740px,_100svh)] [@media((max-width:767px))]:pt-0 [@media((max-width:767px))]:[&_[data-landing~=filmContent]]:py-5"
      aria-labelledby="hero-title"
    >
      <motion.div
        data-landing={LANDING_ELEMENTS.HERO_FILM}
        className="absolute h-full [color:#efefef] [background:#1b1c21] [animation:enter_1.2s_cubic-bezier(0.2,_0.7,_0.2,_1)_both] [--tw-enter-opacity:0] [--tw-enter-translate-y:32px] inset-0 [z-index:-1] [&_video]:absolute [&_video]:inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      >
        <motion.video
          style={{ scale: reduced ? 1 : scale }}
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          poster="/hero-poster.svg"
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          {desktop && !reduced && (
            <>
              <source src="/videos/hero.webm" type="video/webm" />
              <source src="/videos/hero.mp4" type="video/mp4" />
            </>
          )}
        </motion.video>
        <div
          data-landing={LANDING_ELEMENTS.FILM_SHADE}
          className="absolute inset-0 w-full h-full object-cover [background:linear-gradient(90deg,_rgb(17_18_25_/_68%),_rgb(17_18_25_/_12%)),_linear-gradient(0deg,_rgb(17_18_25_/_45%),_transparent_45%)]"
        />
      </motion.div>
      <div
        data-landing={LANDING_ELEMENTS.HERO_TOP}
        className="container-page [padding-bottom:160px] w-full [padding-top:180px] [&_[data-landing~=eyebrow]]:flex [&_[data-landing~=eyebrow]]:items-center [&_[data-landing~=eyebrow]]:[gap:10px] [@media((max-width:767px))]:[&_[data-landing~=eyebrow]]:[font-size:9px] [@media((max-width:767px))]:[&_[data-landing~=eyebrow]]:[letter-spacing:0.045em] [@media((max-width:767px))]:[&_[data-landing~=eyebrow]]:mb-7 [@media((max-width:767px))]:[padding-top:170px] [@media((max-width:767px))]:[padding-bottom:135px]"
      >
        <p
          data-landing={LANDING_ELEMENTS.EYEBROW}
          className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] mb-8"
        >
          <span
            data-landing={LANDING_ELEMENTS.STATUS_DOT}
            className="[width:7px] [height:7px] [background:var(--brand-red)] rounded-full"
          />{' '}
          ФСП СКАУТ / ПЛАТФОРМА ДЛЯ КАРЬЕРЫ В IT
        </p>
        <h1 id="hero-title">
          Найди работу.
          <br />
          <span>Покажи себя.</span>
          <ArrowUpRight aria-hidden="true" />
        </h1>
        <div
          data-landing={LANDING_ELEMENTS.HERO_INTRO}
          className="flex justify-between items-end gap-8 mt-10 [&_p]:[font-size:clamp(16px,_1.5vw,_20px)] [&_p]:[line-height:1.6] [@media((max-width:767px))]:items-start [@media((max-width:767px))]:flex-col [@media((max-width:767px))]:gap-6 [@media((max-width:767px))]:mt-7"
        >
          <p>
            Соедини опыт, навыки и достижения ФСП.
            <br />
            Найди команду, которой нужен именно ты.
          </p>
          <Link
            href={STATIC_ROUTES.CANDIDATE}
            data-landing={LANDING_ELEMENTS.PRIMARY_LINK}
            className={buttonVariants({
              className:
                'h-auto min-h-11 justify-between gap-6 px-6 py-4 [&_svg]:size-5',
            })}
          >
            Создать профиль <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>

      <div
        data-landing={LANDING_ELEMENTS.FILM_CONTENT}
        className="container-page h-full relative flex flex-col justify-end [padding-block:38px] [&_>_p]:[font-size:clamp(2.6rem,_5.2vw,_5rem)] [&_>_p]:[line-height:1.06] [&_>_p]:[letter-spacing:-0.055em] [@media((max-width:767px))]:py-6"
      >
        <div
          data-landing={LANDING_ELEMENTS.FILM_BOTTOM}
          className="flex justify-between items-center mt-10 [font-size:13px] [&_a]:flex [&_a]:gap-5 [&_a]:items-center [&_a]:[min-height:44px] [&_button]:grid [&_button]:place-items-center [&_button]:[width:46px] [&_button]:[height:46px] [&_button]:[border:1px_solid_rgb(255_255_255_/_55%)] [&_button]:rounded-full [&_button]:cursor-pointer"
        >
          <a href="#manifest" onClick={handleNavigateClick}>
            От результата к карьере <ArrowDown size={18} />
          </a>
          {desktop && !reduced && (
            <button
              type="button"
              onClick={() => {
                setPaused(playing);
                if (!playing)
                  void video.current?.play().catch(() => setPlaying(false));
              }}
              aria-label={
                playing ? 'Приостановить видео' : 'Воспроизвести видео'
              }
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
