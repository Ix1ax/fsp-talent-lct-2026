import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Textarea,
} from '@/shared/ui';
import {
  adminRequest,
  adminSchemas,
  type CatalogItem,
  type CatalogKind,
} from '@/entities/admin';

import { catalogFormSchema } from '../constants';
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
import { ErrorNotice, Field } from './Common';

interface CatalogEditorProps {
  kind: CatalogKind;
  item?: CatalogItem;
  onClose: () => void;
  onSaved: () => void;
}
export const CatalogEditor = ({
  kind,
  item,
  onClose,
  onSaved,
}: CatalogEditorProps) => {
  const { session } = useAdminSession();
  const mutation = useAdminMutation(onSaved);
  const form = useForm<z.infer<typeof catalogFormSchema>>({
    resolver: zodResolver(catalogFormSchema),
    defaultValues: {
      code: item?.code ?? '',
      name: item?.name ?? '',
      rank: item?.rank ?? 1,
      aliases: item?.aliases?.join('\n') ?? '',
    },
  });
  const submit = form.handleSubmit(async (values) => {
    if (!session) return;
    if (
      !item &&
      !new RegExp(
        `^[a-z][a-z0-9_-]{0,${kind === 'grades' || kind === 'work_formats' ? 31 : 63}}$`,
      ).test(values.code.trim())
    ) {
      form.setError('code', {
        message:
          'Код: строчные латинские буквы, цифры, _ и -. Начинается с буквы.',
      });
      return;
    }
    const aliases = values.aliases
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      kind === 'skills' &&
      (aliases.length > 30 ||
        aliases.some((s) => s.length > 200 || /[\u0000-\u001f\u007f]/u.test(s)))
    ) {
      form.setError('aliases', {
        message: 'До 30 названий по 200 символов без управляющих символов',
      });
      return;
    }
    const body: Record<string, unknown> = { name: values.name };
    if (kind === 'skills') body.aliases = aliases;
    if (!item) {
      body.code = values.code.trim();
      if (kind === 'grades') body.rank = values.rank;
    }
    await mutation.run(async () => {
      await adminRequest(
        session.access_token,
        `/catalogs/${kind}${item ? `/${item.id}` : ''}`,
        adminSchemas.catalog,
        { method: item ? 'PATCH' : 'POST', body },
      );
      toast.success('Запись сохранена');
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
        <DialogTitle>{item ? 'Изменить запись' : 'Новая запись'}</DialogTitle>
        <DialogDescription>
          {item
            ? 'Код и порядок грейда изменить нельзя.'
            : 'Запись станет активной сразу после создания.'}
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Код" error={form.formState.errors.code?.message}>
            <Input readOnly={!!item} {...form.register('code')} />
          </Field>
          <Field label="Название" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          {kind === 'grades' && (
            <Field
              label="Порядок грейда"
              error={form.formState.errors.rank?.message}
            >
              <Input
                type="number"
                readOnly={!!item}
                {...form.register('rank', { valueAsNumber: true })}
              />
            </Field>
          )}
          {kind === 'skills' && (
            <Field
              label="Другие названия — каждое с новой строки"
              error={form.formState.errors.aliases?.message}
            >
              <Textarea {...form.register('aliases')} />
            </Field>
          )}
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
            <Button disabled={mutation.busy}>
              {mutation.busy ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
