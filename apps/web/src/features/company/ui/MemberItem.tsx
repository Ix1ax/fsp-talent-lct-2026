import { Button, OptionSelect } from '@/shared/ui';
import { formatDate } from '@/shared/utils';
import { type CompanyMember, MEMBER_ROLE_LABELS } from '@/entities/company';

interface MemberItemProps {
  member: CompanyMember;
  userId: string;
  owner: boolean;
  pending: boolean;
  onRoleChange: (member: CompanyMember, value: string) => void;
  onRemove: (member: CompanyMember) => void;
}

export const MemberItem = ({
  member,
  userId,
  owner,
  pending,
  onRoleChange,
  onRemove,
}: MemberItemProps) => {
  return (
    <article className="grid gap-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {member.userId === userId ? 'Вы' : 'Сотрудник'}
        </p>
        <p className="mt-1 break-all text-xs text-muted-foreground">
          ID: {member.userId}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {MEMBER_ROLE_LABELS[member.role]} ·{' '}
        {member.status === 'active' ? 'Активен' : 'Отключён'} · В команде с{' '}
        {formatDate(member.joinedAt)}
      </p>
      {owner && member.role !== 'owner' && member.status === 'active' && (
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            Роль
            <OptionSelect
              aria-label={`Роль сотрудника ${member.userId}`}
              className="w-auto"
              value={member.role}
              disabled={pending}
              onValueChange={(value) => onRoleChange(member, value)}
              options={[
                { value: 'recruiter', label: 'Рекрутер' },
                { value: 'viewer', label: 'Наблюдатель' },
              ]}
            />
          </label>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onRemove(member)}
          >
            Отключить
          </Button>
        </div>
      )}
      {member.status === 'inactive' && (
        <p className="text-sm text-muted-foreground">
          Для возвращения в команду потребуется новое приглашение.
        </p>
      )}
    </article>
  );
};
