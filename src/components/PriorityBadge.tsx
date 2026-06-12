import { ConfigBadge } from './ConfigBadge';
import { useData } from '../context/DataContext';

export function PriorityBadge({ priority }: { priority: string }) {
  const { appSettings } = useData();
  return <ConfigBadge label={priority} color={appSettings.taskPriorityColors[priority] ?? '#64748b'} />;
}
