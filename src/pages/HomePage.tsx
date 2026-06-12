import { Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

export function HomePage() {
  const { isDark } = useTheme();
  const { currentUser } = useData();

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center">
      <section className="flex w-full max-w-3xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className={`rounded-2xl p-3 ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
            <Sparkles className="h-6 w-6" />
          </div>
          {currentUser && (
            <p className={`text-2xl font-semibold md:text-3xl ${isDark ? 'text-white' : 'text-surface'}`}>
              Bonjour{' '}
              <span style={{ color: currentUser.color }}>
                {currentUser.firstName}
              </span>
            </p>
          )}
          <h2 className="text-2xl font-semibold md:text-3xl">Que puis-je pour vous aujourd&apos;hui ?</h2>
        </div>

        <textarea
          rows={8}
          placeholder="Posez une question sur les projets, tâches, affaires, contacts... Nous brancherons ici le RAG."
          className={`w-full rounded-3xl border px-5 py-4 text-base outline-none ${isDark ? 'border-slate-600 bg-slate-900 text-white placeholder:text-slate-500' : 'border-black/10 bg-white text-slate-900 placeholder:text-slate-400'}`}
        />
      </section>
    </div>
  );
}
