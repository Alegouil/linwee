import { getBadgeColors } from '../lib/appSettings';

export function ConfigBadge({
  label,
  color,
  className = '',
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`.trim()}
      style={getBadgeColors(color)}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
