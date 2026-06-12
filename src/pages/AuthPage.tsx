import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { hasSupabaseConfigurationError, supabase } from '../lib/supabaseClient';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      if (result.data.session) {
        navigate('/home');
      }
    });
  }, [navigate]);

  const handleLogin = async () => {
    if (hasSupabaseConfigurationError) {
      setMessage('❌ Supabase n’est pas configuré sur cet environnement. Vérifiez les variables Vercel puis redéployez.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage('❌ ' + (error.message || 'Erreur lors de la connexion'));
    } else {
      setMessage('✅ Connexion réussie, redirection...');
      window.setTimeout(() => navigate('/home'), 700);
    }
  };

  const handleForgot = async () => {
    if (hasSupabaseConfigurationError) {
      setMessage('❌ Supabase n’est pas configuré sur cet environnement. Vérifiez les variables Vercel puis redéployez.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setMessage('❌ ' + (error.message || 'Erreur lors de l\'envoi'));
    } else {
      setMessage('✅ Email de réinitialisation envoyé.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 text-surface">
      <div className="mx-auto w-full max-w-2xl rounded-[32px] border border-black/10 bg-white p-8 shadow-xl shadow-slate-200/40">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Linwe</p>
          <h1 className="mt-3 text-3xl font-semibold">{mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}</h1>
          <p className="mt-2 max-w-xl text-slate-600">
            {mode === 'login'
              ? 'Connectez-vous avec un compte créé dans Supabase Auth. La fiche utilisateur Linwe est créée automatiquement à la première connexion.'
              : 'Entrez votre adresse email pour recevoir un lien de réinitialisation.'}
          </p>
        </div>

        <div className="grid gap-4">
          {hasSupabaseConfigurationError && (
            <p className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Cet environnement Vercel n’a pas reçu les variables Supabase au build. Ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis relance un déploiement.
            </p>
          )}
          {mode === 'login' && (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-4 text-sm outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-4 text-sm outline-none"
              />
              <button onClick={handleLogin} className="rounded-3xl bg-surface px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900">
                Se connecter
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                className="rounded-3xl border border-black/10 bg-slate-50 px-4 py-4 text-sm outline-none"
              />
              <button onClick={handleForgot} className="rounded-3xl bg-surface px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900">
                Envoyer la réinitialisation
              </button>
            </>
          )}

          {message && <p className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">{message}</p>}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
          {mode === 'login' ? (
            <button onClick={() => setMode('forgot')} className="rounded-full px-4 py-2 hover:bg-slate-100">
              Mot de passe oublié
            </button>
          ) : (
            <button onClick={() => setMode('login')} className="rounded-full px-4 py-2 hover:bg-slate-100">
              Connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
