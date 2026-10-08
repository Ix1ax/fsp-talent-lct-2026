import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

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
import { useAdminSession } from '../model';
import { useAdminMutation } from '../model/useAdminMutation';
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
      toast.success('Администратор создан');
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
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!mutation.busy}
      >
        <DialogTitle>Новый администратор</DialogTitle>
        <DialogDescription>
          Будет создан активный аккаунт с ролью администратора.
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
