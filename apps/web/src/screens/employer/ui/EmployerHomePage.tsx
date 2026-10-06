import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui';
import { type SessionUser, USER_ROLES } from '@/entities/session';

type EmployerHomePageProps = {
  user: SessionUser;
};

export const EmployerHomePage = ({ user }: EmployerHomePageProps) => {
  return (
    <main className="mx-auto flex max-w-2xl items-start p-6 pt-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Кабинет работодателя</CardTitle>
          <CardDescription>
            Раздел для работодателя. Здесь появятся вакансии, отклики и команда.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{user.email}</Badge>
            <Badge>{USER_ROLES.EMPLOYER}</Badge>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
