import { FileTextIcon } from 'lucide-react';

interface LegalDocumentPlaceholderProps {
  title: string;
}

export const LegalDocumentPlaceholder = ({
  title,
}: LegalDocumentPlaceholderProps) => {
  return (
    <article className="flex min-h-80 flex-col items-start gap-4 rounded-xl border border-dashed border-input bg-card p-6 sm:p-10">
      <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-brand-text">
        <FileTextIcon className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">Документ готовится</h2>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        Здесь будет опубликована утверждённая редакция документа «{title}».
        Текст предоставляет оператор сервиса.
      </p>
    </article>
  );
};
