'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Minus, Plus } from 'lucide-react';

import { LANDING_ELEMENTS } from '../constants';
import { disciplines } from '../model';
import { DisciplineVisual } from './DisciplineVisual';

const SKILLS = [
  ['Разработка продукта', 'Командная работа', 'Презентация решений'],
  ['Алгоритмы', 'Структуры данных', 'Оптимизация'],
  ['Анализ уязвимостей', 'Защита систем', 'Исследования'],
  ['Автоматизация', 'Управление', 'Работа с оборудованием'],
  ['Навигация', 'Автономные системы', 'Инженерия'],
];

export const DisciplineExplorer = () => {
  const [active, setActive] = useState('01');
  const selected =
    disciplines.find((item) => item.code === active) ?? disciplines[0];
  const cycle = (direction: number) => {
    const index = disciplines.indexOf(selected);
    setActive(
      disciplines[(index + direction + disciplines.length) % disciplines.length]
        .code,
    );
  };
  return (
    <div
      data-landing={LANDING_ELEMENTS.EXPLORER}
      className="grid [overflow-anchor:none] [grid-template-columns:0.8fr_1.2fr] gap-16 items-start [@media((max-width:1000px))]:gap-7 [@media((max-width:1000px))]:[grid-template-columns:0.8fr_1.2fr] [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-8"
    >
      <div
        data-landing={LANDING_ELEMENTS.DISCIPLINE_STAGE}
        className="sticky [top:40px] h-[600px] rounded-xl bg-primary text-primary-foreground overflow-hidden flex flex-col justify-between p-8 [&::before]:[content:''] [&::before]:absolute [&::before]:[width:360px] [&::before]:[height:360px] [&::before]:[border:1px_solid_rgb(255_255_255_/_15%)] [&::before]:rounded-full [&::before]:[top:60px] [&::before]:[left:50%] [&::before]:[transform:translateX(-50%)] [&_>_span]:relative [&_>_span]:[font-size:10px] [&_>_span]:[letter-spacing:0.14em] [&_>_strong]:[font-size:clamp(130px,_17vw,_240px)] [&_>_strong]:[line-height:0.9] [&_>_strong]:[letter-spacing:-0.08em] [&_>_strong]:font-[450] [&_>_strong]:absolute [&_>_strong]:[left:20px] [&_>_strong]:[bottom:80px] [&_>_strong]:[opacity:0.12] [&_>_p]:relative [&_>_p]:[font-size:13px] [&_>_p]:[line-height:1.6] [&_>_p]:[max-width:240px] [@media((max-width:1000px))]:p-6 [@media((max-width:767px))]:relative [@media((max-width:767px))]:[top:auto] max-md:h-[560px] [@media((max-width:767px))]:[&_>_strong]:[font-size:180px] [@media((max-width:767px))]:[&_>_strong]:[bottom:50px]"
      >
        <span>ФСП / {selected.code} — 05</span>
        <strong aria-hidden="true">{selected.code}</strong>
        <div
          data-landing={LANDING_ELEMENTS.DISCIPLINE_ARTWORK}
          className="relative shrink-0 [margin:20px_-20px] [@media((max-width:767px))]:[max-width:350px] [@media((max-width:767px))]:w-full [@media((max-width:767px))]:[margin:0_auto]"
        >
          <DisciplineVisual kind={selected.kind} />
        </div>
        <p aria-live="polite" className="min-h-[63px] shrink-0">
          {selected.title}
        </p>
        <div
          data-landing={LANDING_ELEMENTS.EXPLORER_CONTROLS}
          className="relative flex items-center justify-between gap-3 mt-6 [&_button]:grid [&_button]:place-items-center [&_button]:[width:44px] [&_button]:[height:44px] [&_button]:[border:1px_solid_rgb(255_255_255_/_45%)] [&_button]:rounded-full [&_button]:cursor-pointer [&_button]:[transition:background_0.2s] [&_button:hover]:[background:rgb(255_255_255_/_15%)] [&_span]:[font-size:10px]"
        >
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Предыдущая дисциплина"
          >
            <ArrowLeft size={20} />
          </button>
          <span>Выбери своё направление</span>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Следующая дисциплина"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div data-landing={LANDING_ELEMENTS.DISCIPLINE_LIST} className="">
        {disciplines.map((item, index) => {
          const open = active === item.code;
          return (
            <article
              key={item.code}
              data-landing={LANDING_ELEMENTS.DISCIPLINE}
              className="[border-top:1px_solid_var(--border)] [&[data-open='true']+article]:[border-top-color:transparent] [transition:background_0.25s] [&:last-child]:[border-bottom:1px_solid_var(--border)] [&[data-open='true']]:rounded-xl [&[data-open='true']]:bg-accent [&_h3_button]:grid [&_h3_button]:[grid-template-columns:28px_1fr_24px] [&_h3_button]:[gap:14px] [&_h3_button]:items-center [&_h3_button]:text-left [&_h3_button]:[padding:26px_16px] [&_h3_button]:w-full [&_h3_button]:cursor-pointer [&_h3_button]:[font-size:clamp(18px,_1.8vw,_25px)] [&_h3_button]:[line-height:1.25] [&_h3_button]:[letter-spacing:-0.03em] [&_h3_button:hover]:text-brand-text [&[data-open='true']_h3]:text-brand-text [@media((max-width:767px))]:[&_h3_button]:[font-size:19px] [@media((max-width:767px))]:[&_h3_button]:[padding-inline:12px]"
              data-open={open}
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`discipline-${item.code}`}
                  onClick={() => setActive(item.code)}
                >
                  <span
                    data-landing={LANDING_ELEMENTS.DISCIPLINE_NUMBER}
                    className="[font-size:12px] text-muted-foreground [letter-spacing:0]"
                  >
                    {item.code}
                  </span>
                  <span>{item.title}</span>
                  {open ? <Minus size={24} /> : <Plus size={24} />}
                </button>
              </h3>
              <div
                id={`discipline-${item.code}`}
                hidden={!open}
                data-landing={LANDING_ELEMENTS.DISCIPLINE_BODY}
                className="[&:not([hidden])]:grid [&:not([hidden])]:min-h-[340px] [&:not([hidden])]:content-start max-md:[&:not([hidden])]:min-h-[400px] [&:not([hidden])]:[grid-template-columns:1fr] [&:not([hidden])]:gap-5 [&:not([hidden])]:[padding:0_24px_28px_58px] [&_p]:[font-size:15px] [&_p]:[line-height:1.7] [&_p]:mb-4 [@media((max-width:767px))]:[&:not([hidden])]:[padding-left:54px]"
              >
                <div
                  data-landing={LANDING_ELEMENTS.SKILL_TAGS}
                  className="flex flex-wrap [align-content:start] gap-2 pt-2 [&_span]:[padding:8px_12px] [&_span]:[border:1px_solid_var(--input)] [&_span]:[border-radius:var(--radius-sm)] [&_span]:[font-size:12px]"
                >
                  {SKILLS[index].map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                <div>
                  <p>{item.text}</p>
                  <a
                    href="https://fsp-russia.com/"
                    data-landing={LANDING_ELEMENTS.TEXT_LINK}
                    className="inline-flex items-center gap-4 py-3 [border-bottom:1px_solid_currentColor] [font-size:14px]"
                  >
                    О дисциплине на сайте ФСП <ArrowUpRight size={18} />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
