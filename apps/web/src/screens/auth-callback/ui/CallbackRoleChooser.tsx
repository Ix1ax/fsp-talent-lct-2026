import { RoleChooser } from '@/features/auth';

export const CallbackRoleChooser = () => {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <RoleChooser />
    </main>
  );
};
