import type { ReactNode } from 'react';

export default function LoginLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
