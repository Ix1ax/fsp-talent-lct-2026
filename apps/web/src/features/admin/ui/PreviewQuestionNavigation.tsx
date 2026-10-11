import { Check } from 'lucide-react';

import { Button } from '@/shared/ui';

import { useServerPreview } from '../model';

interface PreviewQuestionNavigationProps {
  data: NonNullable<ReturnType<typeof useServerPreview>['data']>;
  index: number;
  busy: boolean;
  setIndex: (index: number) => void;
}
export const PreviewQuestionNavigation = ({
  data,
  index,
  busy,
  setIndex,
}: PreviewQuestionNavigationProps) => {
  return (
    <nav aria-label="Вопросы предпросмотра" className="flex flex-wrap gap-2">
      {data.questions.map((q, i) => (
        <Button
          key={q.id}
          size="sm"
          className="w-14 shrink-0"
          variant={i === index ? 'default' : 'outline'}
          aria-label={`Вопрос ${i + 1}${q.answer ? ', сохранён ответ' : ''}`}
          aria-current={i === index ? 'step' : undefined}
          disabled={busy}
          onClick={() => setIndex(i)}
        >
          {i + 1}
          <Check className={q.answer ? 'size-3' : 'invisible size-3'} />
        </Button>
      ))}
    </nav>
  );
};
