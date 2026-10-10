import { ShieldAlert } from 'lucide-react';

interface AdminBlockNoticeProps {
  subject: 'company' | 'user';
  reason: string | null;
  date: string;
}

export const AdminBlockNotice = ({
  subject,
  reason,
  date,
}: AdminBlockNoticeProps) => (
  <div
    className="grid min-w-0 gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 wrap-anywhere"
    role="status"
  >
    <div className="flex items-start gap-2 text-destructive">
      <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium">
          {subject === 'company'
            ? 'Компания заблокирована'
            : 'Аккаунт заблокирован'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Дата блокировки: {date} (Москва)
        </p>
      </div>
    </div>
    <div className="grid gap-1 text-sm">
      <p className="font-medium">Причина блокировки</p>
      <p className="whitespace-pre-wrap">{reason ?? 'Причина не указана'}</p>
    </div>
  </div>
);
