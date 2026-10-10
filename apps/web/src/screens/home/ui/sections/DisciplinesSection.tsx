import { LANDING_ELEMENTS } from '../../constants';
import { DisciplineExplorer } from '../DisciplineExplorer';

export const DisciplinesSection = () => {
  return (
    <section
      data-landing={LANDING_ELEMENTS.SECTION}
      className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
      aria-labelledby="disciplines-title"
    >
      <div
        data-landing={LANDING_ELEMENTS.SECTION_LABEL}
        className="[font-size:11px] font-medium [line-height:1.6] [letter-spacing:0.09em] flex justify-between gap-6 [padding-bottom:22px] [border-bottom:1px_solid_var(--border)] [margin-bottom:52px] [&_span:last-child]:text-muted-foreground [@media((max-width:767px))]:[font-size:9px] [@media((max-width:767px))]:[margin-bottom:34px] [@media((max-width:767px))]:[&_span:last-child]:hidden"
      >
        <span>03 / ИЗ СПОРТА В ПРОФЕССИЮ</span>
        <span>ПЯТЬ ДИСЦИПЛИН ФСП</span>
      </div>
      <div
        data-landing={LANDING_ELEMENTS.SECTION_HEADING}
        className="flex justify-between items-end gap-10 mb-14 [&_>_p]:[font-size:15px] [&_>_p]:[line-height:1.7] [&_>_p]:text-muted-foreground [@media((max-width:1000px))]:items-start [@media((max-width:1000px))]:flex-col [@media((max-width:1000px))]:gap-6 [@media((max-width:767px))]:mb-8"
      >
        <h2 id="disciplines-title">
          Разные дисциплины.
          <br />
          <span>Реальные навыки.</span>
        </h2>
        <p>
          У каждого результата — своя история.
          <br />
          Расскажи, что стоит за твоим.
        </p>
      </div>
      <DisciplineExplorer />
    </section>
  );
};
