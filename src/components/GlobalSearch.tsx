import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

type SearchScope = 'all' | 'contacts' | 'companies' | 'deals' | 'projects' | 'tasks';

const scopes: Array<{ id: SearchScope; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'deals', label: 'Affaires' },
  { id: 'projects', label: 'Projets' },
  { id: 'tasks', label: 'Tâches' },
];

export function GlobalSearch({ mobile = false }: { mobile?: boolean }) {
  const { contacts, companies, deals, projects, tasks, users } = useData();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const groups = [
      {
        id: 'contacts',
        label: 'Contacts',
        enabled: scope === 'all' || scope === 'contacts',
        items: contacts
          .filter((item) => [item.firstName, item.lastName, item.email].some((value) => value.toLowerCase().includes(normalized)))
          .map((item) => ({
            id: item.id,
            title: `${item.firstName} ${item.lastName}`,
            subtitle: item.email,
            onSelect: () => navigate(`/contacts?view=contacts&contactId=${item.id}`),
          })),
      },
      {
        id: 'companies',
        label: 'Entreprises',
        enabled: scope === 'all' || scope === 'companies',
        items: companies
          .filter((item) => [item.name, item.city, item.siret].some((value) => value.toLowerCase().includes(normalized)))
          .map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.postalCode} ${item.city}`.trim(),
            onSelect: () => navigate(`/contacts?view=companies&companyId=${item.id}`),
          })),
      },
      {
        id: 'deals',
        label: 'Affaires',
        enabled: scope === 'all' || scope === 'deals',
        items: deals
          .filter((item) => item.title.toLowerCase().includes(normalized))
          .map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: `${item.amount}€`,
            onSelect: () => navigate(`/deals?dealId=${item.id}`),
          })),
      },
      {
        id: 'projects',
        label: 'Projets',
        enabled: scope === 'all' || scope === 'projects',
        items: projects
          .filter((item) => [item.title, users.find((user) => user.id === item.ownerId)?.name ?? ''].some((value) => value.toLowerCase().includes(normalized)))
          .map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: users.find((user) => user.id === item.ownerId)?.name ?? '',
            onSelect: () => navigate(`/projects/${item.id}`),
          })),
      },
      {
        id: 'tasks',
        label: 'Tâches',
        enabled: scope === 'all' || scope === 'tasks',
        items: tasks
          .filter((item) => [item.title, users.find((user) => user.id === item.ownerId)?.name ?? '', item.description].some((value) => value.toLowerCase().includes(normalized)))
          .map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: users.find((user) => user.id === item.ownerId)?.name ?? '',
            onSelect: () => navigate(`/tasks?taskId=${item.id}`),
          })),
      },
    ];

    return groups.filter((group) => group.enabled && group.items.length > 0);
  }, [companies, contacts, deals, navigate, projects, query, scope, tasks, users]);

  return (
    <div ref={containerRef} className={`${mobile ? 'relative w-full' : 'relative w-full md:max-w-sm'}`}>
      <div className={`flex items-center rounded-full ${mobile ? 'px-5 py-4' : 'px-4 py-2.5'} ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <Search className={`${mobile ? 'mr-3 h-5 w-5' : 'mr-2 h-4 w-4'} text-slate-400`} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Recherche globale..."
          className={`w-full bg-transparent outline-none ${mobile ? 'text-base' : 'text-sm'} ${isDark ? 'text-white placeholder:text-slate-500' : 'text-surface placeholder:text-slate-400'}`}
        />
      </div>

      {isOpen && query.trim() && (
        <div className={`absolute right-0 z-50 mt-3 w-full rounded-2xl border shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className={`sticky top-0 rounded-t-2xl border-b p-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
            <div className="flex flex-wrap gap-2">
              {scopes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setScope(item.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    scope === item.id
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`${mobile ? 'max-h-[52vh]' : 'max-h-[60vh]'} overflow-auto p-3`}>
            {results.length === 0 ? (
              <p className={`px-2 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aucun résultat</p>
            ) : (
              results.map((group) => (
                <div key={group.id} className="mb-4 last:mb-0">
                  <p className={`mb-2 px-2 text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.onSelect();
                          setIsOpen(false);
                          setQuery('');
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
