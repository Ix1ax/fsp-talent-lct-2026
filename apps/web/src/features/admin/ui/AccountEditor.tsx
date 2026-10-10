import { useForm, useWatch } from 'react-hook-form';
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
  Input,
} from '@/shared/ui';
import { adminRequest, adminSchemas } from '@/entities/admin';

import { accountFormSchema } from '../constants';
import { getAdminPasswordIssue } from '../lib';
import { useAdminMutation, useAdminSession } from '../model';
import { ErrorNotice, Field } from './Common';

interface AccountEditorProps {
  onClose: () => void;
  onSaved: () => void;
}
export const AccountEditor = ({ onClose, onSaved }: AccountEditorProps) => {
  const { session } = useAdminSession();
  const mutation = useAdminMutation(onSaved);
  const form = useForm<z.infer<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const unsaved = useFormUnsavedChanges(form, {
    normalize: (values) => ({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    }),
  });
  const close = () => {
    if (!mutation.busy) unsaved.discard(onClose);
  };
  const password = useWatch({ control: form.control, name: 'password' });
  const passwordIssue = getAdminPasswordIssue(password);
  const submit = form.handleSubmit(async ({ email, password }) => {
    await mutation.run(async () => {
      await adminRequest(
        session!.access_token,
        '/admins',
        adminSchemas.account,
        {
          method: 'POST',
          body: { email: email.trim().toLowerCase(), password },
        },
      );
      form.reset(form.getValues());
      unsaved.markSaved();
      toast.success('Администратор создан');
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
        className="max-h-[90dvh] overflow-y-auto wrap-anywhere [&_button]:min-h-11 [&_[data-slot=dialog-close]]:size-11"
        showCloseButton={!mutation.busy}
      >
        <DialogTitle className="pr-10">Новый администратор</DialogTitle>
        <DialogDescription>
          Будет создан активный аккаунт с ролью администратора.
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          <fieldset disabled={mutation.busy} className="grid min-w-0 gap-4">
            <Field label="Почта" error={form.formState.errors.email?.message}>
              <Input
                type="email"
                autoComplete="off"
                {...form.register('email')}
              />
            </Field>
            <Field label="Пароль" reserveErrorSpace={false}>
              <Input
                type="password"
                autoComplete="new-password"
                aria-describedby="admin-password-hint admin-password-status"
                aria-invalid={!!password && !!passwordIssue}
                {...form.register('password')}
              />
              <span
                id="admin-password-hint"
                className="text-xs text-muted-foreground"
              >
                Рекомендуем 12–72 латинских букв, цифр или знаков. Кириллица и
                эмодзи тоже разрешены — допустимую длину проверим автоматически.
              </span>
              <span
                id="admin-password-status"
                role="status"
                className={`min-h-8 text-xs ${passwordIssue ? 'text-destructive' : 'text-success'}`}
              >
                {password
                  ? (passwordIssue ?? 'Длина пароля подходит')
                  : form.formState.errors.password?.message}
              </span>
            </Field>
            <ErrorNotice error={mutation.error} />
            <Button disabled={mutation.busy || (!!password && !!passwordIssue)}>
              {mutation.busy ? 'Создаём…' : 'Создать'}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
};
