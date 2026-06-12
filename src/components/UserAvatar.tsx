import { UserRound } from 'lucide-react';
import type { User } from '../types';

export function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-sm';

  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ${sizeClass} ${className}`}
      style={user?.avatar ? { backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: user?.color ?? '#334155' }}
    >
      {user?.avatar ? null : user?.firstName || user?.lastName ? `${user?.firstName?.slice(0, 1) ?? ''}${user?.lastName?.slice(0, 1) ?? ''}` : <UserRound className="h-4 w-4" />}
    </span>
  );
}
