import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Textarea } from '@/shared/ui';

import { previewTextAnswerSchema } from '../constants';

interface PreviewTextAnswerProps {
  value: string;
  onChange: (value: string) => void;
}
export const PreviewTextAnswer = ({
  value,
  onChange,
}: PreviewTextAnswerProps) => {
  const form = useForm<{ text: string }>({
    resolver: zodResolver(previewTextAnswerSchema),
    mode: 'onChange',
    defaultValues: { text: value },
  });
  useEffect(() => {
    form.setValue('text', value);
  }, [value, form]);
  return (
    <div className="grid gap-1">
      <Textarea
        aria-label="Ответ на вопрос"
        aria-invalid={!!form.formState.errors.text}
        aria-describedby="preview-text-error"
        {...form.register('text', {
          onChange: (event) => onChange(event.target.value),
        })}
      />
      <span
        id="preview-text-error"
        className="min-h-4 text-xs text-destructive"
      >
        {form.formState.errors.text?.message}
      </span>
    </div>
  );
};
