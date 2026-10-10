import type { ReactNode } from 'react';

const LoginLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
};

export default LoginLayout;
