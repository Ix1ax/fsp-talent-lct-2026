import { PageWrapper } from '@/shared/ui';

import { LANDING_ELEMENTS } from '../constants';
import { Hero } from './Hero';
import { LandingMotion } from './motion';
import {
  CareerSection,
  ClosingSection,
  DisciplinesSection,
  EmployerSection,
  FaqSection,
  FederationSection,
  ManifestSection,
} from './sections';

export const HomePage = () => {
  return (
    <PageWrapper
      variant="landing"
      data-landing={LANDING_ELEMENTS.LANDING}
      className="bg-background text-foreground overflow-clip [padding-bottom:clamp(48px,_7vw,_112px)] [&_h2]:[font-size:clamp(2.4rem,_4.8vw,_4.6rem)] [&_h2]:[line-height:1.08] [&_h2]:[letter-spacing:-0.055em] [&_h2]:font-[550] [&_h2_span]:text-muted-foreground [&_a:focus-visible]:[outline:3px_solid_var(--ring)] [&_a:focus-visible]:[outline-offset:6px] [&_button:focus-visible]:[outline:3px_solid_var(--ring)] [&_button:focus-visible]:[outline-offset:6px] [@media((prefers-reduced-motion:reduce))]:[&_*]:[animation:none]! [@media((prefers-reduced-motion:reduce))]:[&_*]:[transition:none]! [@media((prefers-reduced-motion:reduce))]:[&_*]:[scroll-behavior:auto]! [@media((prefers-reduced-motion:reduce))]:[&_*::before]:[animation:none]! [@media((prefers-reduced-motion:reduce))]:[&_*::before]:[transition:none]! [@media((prefers-reduced-motion:reduce))]:[&_*::before]:[scroll-behavior:auto]! [@media((prefers-reduced-motion:reduce))]:[&_*::after]:[animation:none]! [@media((prefers-reduced-motion:reduce))]:[&_*::after]:[transition:none]! [@media((prefers-reduced-motion:reduce))]:[&_*::after]:[scroll-behavior:auto]!"
    >
      <LandingMotion>
        <Hero />
        <ManifestSection />
        <FederationSection />
        <DisciplinesSection />
        <CareerSection />
        <EmployerSection />
        <FaqSection />
        <ClosingSection />
      </LandingMotion>
    </PageWrapper>
  );
};
