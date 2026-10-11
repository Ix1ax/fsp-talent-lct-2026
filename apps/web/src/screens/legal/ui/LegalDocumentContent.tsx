import { FileTextIcon } from 'lucide-react';

import type { LegalDocumentSlug } from '@/shared/contants';

import { LEGAL_DOCUMENT_CONTENT } from '../constants';

interface LegalDocumentContentProps {
  slug: LegalDocumentSlug;
}

export const LegalDocumentContent = ({ slug }: LegalDocumentContentProps) => {
  return (
    <article className="min-w-0 space-y-8 rounded-xl border border-input bg-card p-6 sm:p-10">
      <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-brand-text">
        <FileTextIcon className="size-6" aria-hidden />
      </span>
      <div className="space-y-2 rounded-lg bg-muted p-4 text-sm leading-relaxed">
        <p className="font-semibold">Тестовая редакция · проект документа</p>
        <p className="text-muted-foreground">
          Текст предназначен для демонстрации платформы. Владелец заменит его
          утверждённой редакцией и заполнит наименование оператора, ИНН, ОГРН,
          юридический адрес и контакт для обращений.
        </p>
      </div>
      {LEGAL_DOCUMENT_CONTENT[slug].map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-base leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <div className="space-y-2 border-t pt-6 text-sm leading-relaxed text-muted-foreground">
        <p>Открытые источники для подготовки проекта:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a
              className="underline underline-offset-4"
              href="https://rosguard.gov.ru/document/article/federalnyj-zakon-ot-27-iyulya-2006-g--152fz"
            >
              Федеральный закон № 152-ФЗ «О персональных данных»
            </a>
          </li>
          <li>
            <a
              className="underline underline-offset-4"
              href="https://82.rkn.gov.ru/directions/pers/p15375/"
            >
              Роскомнадзор: информация для операторов персональных данных
            </a>
          </li>
        </ul>
      </div>
    </article>
  );
};
