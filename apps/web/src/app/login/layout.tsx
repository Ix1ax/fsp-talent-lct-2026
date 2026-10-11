import type { ReactNode } from 'react';

interface LoginLayoutProps {
  children: ReactNode;
}

const LoginLayout = ({ children }: LoginLayoutProps) => {
  return children;
};

export default LoginLayout;
