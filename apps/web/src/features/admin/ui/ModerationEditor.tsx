import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Textarea,
} from '@/shared/ui';
import {
  adminRequest,
  type CatalogItem,
  moderationSchema,
} from '@/entities/admin';

import { moderationFormSchema } from '../constants';
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
import { useAdminOptions } from '../model/useAdminOptions';
import { ErrorNotice, Field, SkillPicker } from './Common';

interface ModerationEditorProps {
  item: CatalogItem;
  action: 'approve' | 'reject' | 'merge';
  onClose: () => void;
  onSaved: () => void;
}
const descriptions = {
  approve: 'Навык станет активным и доступным для выбора.',
  reject:
    'Навык будет выключен. Его связи удалятся из профилей и потребностей; потребности без навыков станут черновиками. Отменить отклонение нельзя.',
  merge:
    'Связи профилей и потребностей перенесутся в целевой навык. Исходный навык будет выключен. Вопросы и составы тестов не переносятся. Отменить объединение нельзя.',
};
export const ModerationEditor = ({
  item,
  action,
  onClose,
  onSaved,
}: ModerationEditorProps) => {
  const { session } = useAdminSession();
  const options = useAdminOptions();
  const mutation = useAdminMutation(onSaved);
  const form = useForm<z.infer<typeof moderationFormSchema>>({
    resolver: zodResolver(moderationFormSchema),
    defaultValues: { reason: '', target_id: '' },
  });
  const titles = {
    approve: 'Одобрить',
    reject: 'Отклонить',
    merge: 'Объединить',
  };
  const submit = form.handleSubmit(async (values) => {
    if (action === 'reject' && !values.reason) {
      form.setError('reason', { message: 'Укажите причину отклонения' });
      return;
    }
    if (
      action === 'merge' &&
      (!options.skills.some((s) => s.id === values.target_id) ||
        values.target_id === item.id)
    ) {
      form.setError('target_id', {
        message: 'Выберите другой активный одобренный навык',
      });
      return;
    }
    const body: Record<string, string> = {};
    if (values.reason) body.reason = values.reason;
    if (action === 'merge') body.target_id = values.target_id;
    await mutation.run(async () => {
      const result = await adminRequest(
        session!.access_token,
        `/catalogs/skills/${item.id}/${action}`,
        moderationSchema,
        { method: 'POST', body },
      );
      toast.success(
        `Готово. Связи кандидатов: ${result.candidate_links}, потребностей: ${result.need_links}. Переведено в черновики: ${result.drafted_needs}.`,
      );
      onSaved();
      onClose();
    });
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!mutation.busy}>
        <DialogTitle>
          {titles[action]} «{item.name}»
        </DialogTitle>
        <DialogDescription>{descriptions[action]}</DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          {action === 'merge' && (
            <>
              <Controller
                control={form.control}
                name="target_id"
                render={({ field }) => (
                  <SkillPicker
                    label="Объединить с навыком"
                    items={options.skills.filter((s) => s.id !== item.id)}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={options.loading}
                  />
                )}
              />
              <p className="text-sm text-destructive">
                {form.formState.errors.target_id?.message}
              </p>
              <ErrorNotice error={options.error} />
            </>
          )}
          <Field
            label={
              action === 'reject'
                ? 'Причина отклонения'
                : 'Комментарий (необязательно)'
            }
            error={form.formState.errors.reason?.message}
          >
            <Textarea {...form.register('reason')} />
          </Field>
          <ErrorNotice error={mutation.error} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.busy}
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              variant={action === 'approve' ? 'default' : 'destructive'}
              disabled={
                mutation.busy || (action === 'merge' && options.loading)
              }
            >
              {mutation.busy ? 'Выполняем…' : titles[action]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
