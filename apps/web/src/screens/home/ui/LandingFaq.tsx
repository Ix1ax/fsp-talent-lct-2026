'use client';

import { ArrowDown } from 'lucide-react';
import { Accordion } from 'radix-ui';

import { LANDING_ELEMENTS } from '../constants';
import { faqs } from '../model';

export const LandingFaq = () => {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="invisible pointer-events-none select-none border-t border-border"
      >
        {faqs.map((faq, index) => (
          <div
            key={faq.question}
            className="grid grid-cols-[24px_1fr_20px] items-center gap-[18px] border-b border-border px-4 py-6 text-lg leading-[1.4] max-md:gap-3 max-md:px-2 max-md:text-base"
          >
            <span className="text-[11px]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <strong className="font-medium">{faq.question}</strong>
            <ArrowDown size={20} />
          </div>
        ))}
        <div className="grid">
          {faqs.map((faq) => (
            <p
              key={faq.question}
              className="col-start-1 row-start-1 pb-6 pl-[58px] pr-[54px] text-sm leading-[1.8] max-md:pl-11 max-md:pr-6"
            >
              {faq.answer}
            </p>
          ))}
        </div>
      </div>
      <Accordion.Root
        type="single"
        collapsible
        data-landing={LANDING_ELEMENTS.ANSWER_LIST}
        className="absolute inset-x-0 top-0 [border-top:1px_solid_var(--border)]"
      >
        {faqs.map((faq, index) => (
          <Accordion.Item
            value={`faq-${index}`}
            key={faq.question}
            data-landing={LANDING_ELEMENTS.ANSWER}
            className="[border-bottom:1px_solid_var(--border)] [transition:background_0.2s] [&[data-state='open']]:bg-card [&_button]:grid [&_button]:[grid-template-columns:24px_1fr_20px] [&_button]:[gap:18px] [&_button]:[padding:24px_16px] [&_button]:w-full [&_button]:items-center [&_button]:text-left [&_button]:cursor-pointer [&_button_>_span]:text-brand-text [&_button_>_span]:[font-size:11px] [&_button_strong]:[font-size:18px] [&_button_strong]:font-medium [&_button_strong]:[line-height:1.4] [&_button_svg]:[transition:transform_0.2s] [&_button[data-state='open']_svg]:[transform:rotate(180deg)] [&_p]:[padding:0_54px_24px_58px] [&_p]:[font-size:14px] [&_p]:[line-height:1.8] [&_p]:text-muted-foreground [@media((max-width:767px))]:[&_button]:[padding-inline:8px] [@media((max-width:767px))]:[&_button]:gap-3 [@media((max-width:767px))]:[&_button_strong]:[font-size:16px] [@media((max-width:767px))]:[&_p]:[padding-inline:44px_24px]"
          >
            <Accordion.Header>
              <Accordion.Trigger>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{faq.question}</strong>
                <ArrowDown size={20} />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p>{faq.answer}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
};
