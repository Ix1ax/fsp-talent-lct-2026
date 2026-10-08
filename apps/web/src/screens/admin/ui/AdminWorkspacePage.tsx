'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { Button, Card, Skeleton } from '@/shared/ui';
import { adminSchemas } from '@/entities/admin';
import {
  ErrorNotice,
  QuestionEditor,
  TemplateEditor,
  TemplatePreview,
  useAdminQuery,
} from '@/features/admin';

import { QuestionDetails } from './QuestionDetails';
import { TemplateDetails } from './TemplateDetails';

interface AdminWorkspacePageProps {
  section: 'questions' | 'templates';
  id: string;
  action?: 'edit' | 'preview';
}
export const AdminWorkspacePage = ({
  section,
  id,
  action,
}: AdminWorkspacePageProps) => {
  const router = useRouter();
  const base = `/admin/${section}`;
  const creating = id === 'new';
  const template = useAdminQuery(
    section === 'templates' && !creating && !!action
      ? `/assessments/templates/${id}`
      : null,
    adminSchemas.template,
  );
  const question = useAdminQuery(
    section === 'questions' && !creating && !!action
      ? `/assessments/questions/${id}`
      : null,
    adminSchemas.question,
  );
  const back = () => router.push(creating ? base : `${base}/${id}`);
  const saved = (savedId: string) => router.push(`${base}/${savedId}`);
  const label = section === 'templates' ? 'Шаблоны тестов' : 'Банк заданий';
  let current = 'Карточка';
  if (creating) current = 'Создание';
  else if (action === 'preview') current = 'Предпросмотр';
  else if (action === 'edit') current = 'Новая версия';
  const loading = template.loading || question.loading;
  return (
    <div className="grid gap-6">
      <nav
        aria-label="Хлебные крошки"
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/admin" className="hover:text-foreground">
          Админка
        </Link>
        <ChevronRight size={14} />
        <Link href={base} className="hover:text-foreground">
          {label}
        </Link>
        <ChevronRight size={14} />
        {action && (
          <>
            <Link href={`${base}/${id}`} className="hover:text-foreground">
              Карточка
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span aria-current="page" className="text-foreground">
          {current}
        </span>
      </nav>
      <ErrorNotice error={template.error ?? question.error} />
      {(!!template.error || !!question.error) && (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            template.reload();
            question.reload();
          }}
        >
          Повторить загрузку
        </Button>
      )}
      {loading && !template.data && !question.data && (
        <Card
          className="gap-5 p-5 sm:p-8"
          role="status"
          aria-label="Загружаем карточку"
        >
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </Card>
      )}
      {creating && section === 'templates' && (
        <TemplateEditor onClose={back} onSaved={saved} />
      )}
      {creating && section === 'questions' && (
        <QuestionEditor onClose={back} onSaved={saved} />
      )}
      {!creating && !action && section === 'templates' && (
        <TemplateDetails id={id} onSaved={() => {}} />
      )}
      {!creating && !action && section === 'questions' && (
        <QuestionDetails id={id} onSaved={() => {}} />
      )}
      {action === 'edit' && template.data && (
        <TemplateEditor
          key={id}
          template={template.data}
          onClose={back}
          onSaved={saved}
        />
      )}
      {action === 'edit' && question.data && (
        <QuestionEditor
          key={id}
          question={question.data}
          onClose={back}
          onSaved={saved}
        />
      )}
      {action === 'preview' && template.data && (
        <TemplatePreview template={template.data} />
      )}
    </div>
  );
};
