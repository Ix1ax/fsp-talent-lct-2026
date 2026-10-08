import { useForm } from 'react-hook-form';
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
      <DialogContent showCloseButton={!mutation.busy}>
        <DialogTitle>Новый администратор</DialogTitle>
        <DialogDescription>
          Будет создан активный аккаунт с ролью администратора. Пароль — 12–72
          байта UTF-8.
        </DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Почта" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="off"
              {...form.register('email')}
            />
          </Field>
          <Field label="Пароль" error={form.formState.errors.password?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
          </Field>
          <ErrorNotice error={mutation.error} />
          <Button disabled={mutation.busy}>
            {mutation.busy ? 'Создаём…' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
