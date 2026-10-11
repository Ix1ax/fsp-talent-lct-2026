import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import { useFormUnsavedChanges } from '@/shared/hooks';
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
  getAdminSkill,
  invalidateAdminCatalogs,
  moderationSchema,
} from '@/entities/admin';

import { moderationFormSchema } from '../constants';
import { useAdminMutation, useAdminSession } from '../model';
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
  const mutation = useAdminMutation(onSaved);
  const form = useForm<z.infer<typeof moderationFormSchema>>({
    resolver: zodResolver(moderationFormSchema),
    defaultValues: { reason: '', target_id: '' },
  });
  const unsaved = useFormUnsavedChanges(form);
  const close = () => {
    if (!mutation.busy) unsaved.discard(onClose);
  };
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
      (!values.target_id || values.target_id === item.id)
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
      if (action === 'merge') {
        const target = await getAdminSkill(
          session!.access_token,
          values.target_id,
        );
        if (target.active === false || target.moderation_status !== 'approved')
          throw new Error(
            'Целевой навык больше недоступен. Выберите другой активный одобренный навык.',
          );
      }
      const result = await adminRequest(
        session!.access_token,
        `/catalogs/skills/${item.id}/${action}`,
        moderationSchema,
        { method: 'POST', body },
      );
      invalidateAdminCatalogs('skills', session!.access_token);
      form.reset(form.getValues());
      unsaved.markSaved();
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
        if (!open) close();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto wrap-anywhere [&_button]:min-h-11 [&_[data-slot=dialog-close]]:size-11 sm:max-w-lg"
        showCloseButton={!mutation.busy}
      >
        <DialogTitle className="pr-10">
          {titles[action]} «{item.name}»
        </DialogTitle>
        <DialogDescription>{descriptions[action]}</DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          <fieldset disabled={mutation.busy} className="grid min-w-0 gap-4">
            {action === 'merge' && (
              <>
                <Controller
                  control={form.control}
                  name="target_id"
                  render={({ field }) => (
                    <SkillPicker
                      approvedOnly
                      label="Объединить с навыком"
                      error={form.formState.errors.target_id?.message}
                      excludeId={item.id}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.busy}
                onClick={close}
              >
                Отмена
              </Button>
              <Button
                variant={action === 'approve' ? 'default' : 'destructive'}
                disabled={mutation.busy}
              >
                {mutation.busy ? 'Выполняем…' : titles[action]}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
};
