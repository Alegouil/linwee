import { createClient } from '@supabase/supabase-js';
import { readStoredUsers } from './userStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = supabaseUrl?.includes('placeholder') || !supabaseUrl || !supabaseAnonKey;

export const supabase = isDev
  ? ({
      auth: {
        getSession: async () => {
          const token = localStorage.getItem('auth_token');
          return token
            ? {
                data: {
                  session: {
                    user: JSON.parse(localStorage.getItem('auth_user') || '{}'),
                    access_token: token,
                  },
                },
              }
            : { data: { session: null } };
        },
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          if (!email || !password) {
            return { error: new Error('Email et mot de passe requis') };
          }
          const user = readStoredUsers().find((item) => item.email.toLowerCase() === email.toLowerCase() && item.kind === 'internal');
          if (!user) {
            return { error: new Error('Compte introuvable. Demandez à un administrateur de créer votre accès.') };
          }
          localStorage.setItem('auth_token', 'dev_token_' + Date.now());
          localStorage.setItem('auth_user', JSON.stringify(user));
          return { error: null };
        },
        signUp: async ({
          email: _email,
          password: _password,
          options: _options,
        }: {
          email: string;
          password: string;
          options?: { data?: { role?: string } };
        }) => {
          return { error: new Error('Inscription désactivée. Un administrateur doit créer les comptes.') };
        },
        resetPasswordForEmail: async (email: string) => {
          return { error: null };
        },
        signOut: async () => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          return { error: null };
        },
      },
    } as any)
  : createClient(supabaseUrl, supabaseAnonKey);

export const isDevelopment = isDev;
