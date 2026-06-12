import type { User } from '../types';

interface UserBadgeProps {
  user: User | null | undefined;
  className?: string;
}

export function UserBadge({ user, className = '' }: UserBadgeProps) {
  if (!user) {
    return <span className={`inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 ${className}`}>Sans propriétaire</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: user.color }}
    >
      {user.name}
    </span>
  );
}
