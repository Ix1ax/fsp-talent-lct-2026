import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

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
  AdminApiError,
  adminCompanySchema,
  adminCompanyTaskSchema,
  adminNeedSchema,
  adminRequest,
  adminUserSchema,
} from '@/entities/admin';

import { operationDecisionSchema } from '../constants';
import { useAdminMutation, useAdminSession } from '../model';
import { ErrorNotice, Field } from './Common';

export type OperationDecision = {
  id: string;
  title: string;
  description: string;
} & (
  | {
      kind: 'companies';
      status: 'verified' | 'rejected' | 'unverified';
      expectedVersion: number;
    }
  | { kind: 'users'; status: 'active' | 'blocked' }
  | { kind: 'needs' | 'tasks'; status: 'published' | 'hidden' }
);
interface OperationDecisionDialogProps {
  decision: OperationDecision;
  onClose: () => void;
  onSaved: () => void;
  onRefresh: () => void;
}
export const OperationDecisionDialog = ({
  decision,
  onClose,
  onSaved,
  onRefresh,
}: OperationDecisionDialogProps) => {
  const { session } = useAdminSession();
  const form = useForm({
    resolver: zodResolver(operationDecisionSchema),
    defaultValues: { reason: '' },
  });
  const unsaved = useFormUnsavedChanges(form);
  const mutation = useAdminMutation(onRefresh);
  const reasonRequired =
    decision.kind !== 'companies' || decision.status !== 'verified';
  const stale =
    mutation.error instanceof AdminApiError
      ? mutation.error.status === 409 || mutation.error.status === 0
      : !!mutation.error;
  const close = () => {
    if (!mutation.busy) unsaved.discard(onClose);
  };
  const submit = form.handleSubmit(async ({ reason }) => {
    if (!session || stale) return;
    if (reasonRequired && !reason) {
      form.setError('reason', { message: 'Укажите причину решения' });
      return;
    }
    const suffix = {
      companies: 'verification',
      users: 'status',
      needs: 'moderation',
      tasks: 'moderation',
    }[decision.kind];
    const schemas = {
      companies: adminCompanySchema,
      users: adminUserSchema,
      needs: adminNeedSchema,
      tasks: adminCompanyTaskSchema,
    };
    const saved = await mutation.run(async () => {
      await adminRequest<unknown>(
        session.access_token,
        `/${decision.kind}/${decision.id}/${suffix}`,
        schemas[decision.kind],
        {
          method: 'PATCH',
          body: {
            status: decision.status,
            ...(reason ? { reason } : {}),
            ...(decision.kind === 'companies'
              ? { expected_version: decision.expectedVersion }
              : {}),
          },
        },
      );
      form.reset({ reason });
      unsaved.markSaved();
      toast.success('Решение сохранено');
      onSaved();
      onClose();
    });
    if (!saved) onRefresh();
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        showCloseButton={!mutation.busy}
        className="max-h-[90dvh] overflow-y-auto wrap-anywhere [&_button]:min-h-11 [&_[data-slot=dialog-close]]:size-11 sm:max-w-lg"
      >
        <DialogTitle className="pr-10">{decision.title}</DialogTitle>
        <DialogDescription>{decision.description}</DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          <Field
            label={
              reasonRequired ? 'Причина решения' : 'Комментарий (необязательно)'
            }
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              maxLength={2000}
              disabled={mutation.busy}
              {...form.register('reason')}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            До 2000 символов. Причина сохраняется в журнале действий.
          </p>
          <ErrorNotice error={mutation.error} />
          {stale && (
            <p role="alert" className="text-sm text-muted-foreground">
              Перед следующим решением закройте окно и проверьте актуальное
              состояние карточки.
            </p>
          )}
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
              variant={
                ['hidden', 'blocked', 'rejected', 'unverified'].includes(
                  decision.status,
                )
                  ? 'destructive'
                  : 'default'
              }
              disabled={mutation.busy || stale}
            >
              {mutation.busy ? 'Сохраняем…' : decision.title}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
