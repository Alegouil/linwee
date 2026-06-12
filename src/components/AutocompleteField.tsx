import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Option {
  id: string;
  label: string;
  meta?: string;
}

interface AutocompleteFieldProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  required?: boolean;
}

export function AutocompleteField({ label, value, options, onChange, required = false }: AutocompleteFieldProps) {
  const { isDark } = useTheme();
  const selected = options.find((option) => option.id === value);
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [selected?.label]);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <label className="relative space-y-2">
      <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}
      />
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
            {selected.label}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQuery('');
                setOpen(false);
              }}
              className={`rounded-full px-1 text-[11px] leading-none ${isDark ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-500 hover:bg-slate-200'}`}
              aria-label={`Retirer ${selected.label}`}
            >
              x
            </button>
          </span>
        </div>
      )}
      {open && filtered.length > 0 && (
        <div className={`absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setQuery(option.label);
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <div className="font-medium">{option.label}</div>
              {option.meta && <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{option.meta}</div>}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
