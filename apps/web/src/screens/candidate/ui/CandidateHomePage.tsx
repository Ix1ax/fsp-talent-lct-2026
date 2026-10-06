import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { type SessionUser, USER_ROLES } from '@/entities/session';

interface CandidateHomePageProps {
  user: SessionUser;
}

export const CandidateHomePage = ({ user }: CandidateHomePageProps) => {
  return (
    <main className="mx-auto flex max-w-2xl items-start p-6 pt-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Кабинет соискателя</CardTitle>
          <CardDescription>
            Раздел для кандидата. Здесь появятся профиль, отклики и вакансии.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{user.email}</Badge>
            <Badge>{USER_ROLES.CANDIDATE}</Badge>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
