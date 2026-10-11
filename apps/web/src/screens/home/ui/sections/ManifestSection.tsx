import { LANDING_ANCHORS, LANDING_ELEMENTS } from '../../constants';
import { RevealWords } from '../motion';

export const ManifestSection = () => {
  return (
    <section
      id={LANDING_ANCHORS.MANIFEST}
      tabIndex={-1}
      data-landing={LANDING_ELEMENTS.SECTION}
      className="container-page [padding-block:clamp(72px,_9vw,_140px)]"
      aria-labelledby="manifest-title"
    >
      <div
        data-landing={LANDING_ELEMENTS.SECTION_LABEL}
        className="[font-size:12px] font-medium [line-height:1.6] [letter-spacing:0.08em] flex justify-between gap-6 [padding-bottom:22px] [border-bottom:1px_solid_var(--border)] [margin-bottom:52px] [&_span:last-child]:text-muted-foreground [@media((max-width:767px))]:[font-size:11px] [@media((max-width:767px))]:[margin-bottom:34px] [@media((max-width:767px))]:[&_span:last-child]:hidden"
      >
        <span>01 / ТВОЙ ПРОФЕССИОНАЛЬНЫЙ ПОТЕНЦИАЛ</span>
        <span>ОТ НАВЫКОВ К ВОЗМОЖНОСТЯМ</span>
      </div>
      <h2 id="manifest-title" className="sr-only">
        Больше, чем резюме
      </h2>
      <RevealWords text="Ты больше, чем строчка в резюме. За твоим кодом — опыт, решения и достижения. Собери их в одном профиле, чтобы найти работу, в которой всё это будет иметь значение." />
      <div
        data-landing={LANDING_ELEMENTS.MANIFEST_NEW}
        className="grid [grid-template-columns:0.6fr_1fr_1fr] gap-12 [border-top:1px_solid_var(--border)] mt-14 pt-8 [&_h3]:[font-size:23px] [&_h3]:[letter-spacing:-0.04em] [&_h3]:mb-4 [&_p]:text-muted-foreground [&_p]:[font-size:15px] [&_p]:[line-height:1.7] [@media((max-width:767px))]:[grid-template-columns:1fr] [@media((max-width:767px))]:gap-7"
      >
        <span
          data-landing={LANDING_ELEMENTS.LARGE_INDEX}
          className="[font-size:100px] [line-height:1] text-primary [@media((max-width:767px))]:[font-size:64px]"
        >
          ↗
        </span>
        <div>
          <h3>Не начинай с чистого листа.</h3>
          <p>
            Ты уже учился, пробовал, создавал. Теперь расскажи об этом тем, с
            кем хочешь работать.
          </p>
        </div>
        <div>
          <h3>Выбирай своё направление.</h3>
          <p>
            Первый оффер или новый вызов — укажи, что ищешь, и обсуждай
            предложения на своих условиях.
          </p>
        </div>
      </div>
    </section>
  );
};
