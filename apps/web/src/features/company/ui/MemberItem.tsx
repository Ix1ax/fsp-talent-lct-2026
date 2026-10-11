import { Badge, Button, OptionSelect } from '@/shared/ui';
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
        {member.userId !== userId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Сотрудник · {member.userId.slice(-8)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{MEMBER_ROLE_LABELS[member.role]}</Badge>
        <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>
          {member.status === 'active' ? 'Активен' : 'Отключён'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          В команде с {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
        </span>
      </div>
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
