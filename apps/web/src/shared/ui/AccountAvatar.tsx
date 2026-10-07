import { Avatar, AvatarFallback, AvatarImage } from './Avatar';
interface AccountAvatarProps {
  name: string;
  src?: string;
}
export const AccountAvatar = ({ name, src }: AccountAvatarProps) => (
  <Avatar>
    <AvatarImage src={src} alt="" />
    <AvatarFallback className="bg-accent text-xs font-semibold text-brand-text">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()}
    </AvatarFallback>
  </Avatar>
);
