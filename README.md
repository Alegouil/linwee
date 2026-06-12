# Linwe - Outil de gestion de projet

Prototype frontend React minimaliste pour un gestionnaire de projets organisé autour de Supabase.

## Caractéristiques incluses

- Authentification email / mot de passe via Supabase
- Pages Contacts, Affaires, Projets et Tâches
- Navigation mobile-first et design minimaliste noir/blanc
- Structure prête pour l’ajout d’une vue admin et gestion des utilisateurs

## Installation

1. Copier `.env.example` en `.env`
2. Remplir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Installer les dépendances

```bash
npm install
```

4. Lancer le projet

```bash
npm run dev
```

## Connexion à Supabase

1. Dans ton projet Supabase, copie les valeurs de `URL` et `anon key`.
2. Dans le dépôt, duplique `.env.example` en `.env`.
3. Remplis les variables :

```env
VITE_SUPABASE_URL=https://<ton-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<ton-anon-key>
```

4. Dans Supabase, crée les tables suivantes ou importe `supabase-schema.sql` :
   - `users`
   - `companies`
   - `contacts`
   - `deals`
   - `projects`
   - `tasks`
   - `task_comments`
   - `notifications`
   - les policies RLS incluses dans `supabase-schema.sql`

5. Crée au moins un utilisateur dans l’authentification Supabase (`Email`/`Mot de passe`).
6. À la première connexion, l’application crée automatiquement la fiche correspondante dans la table `users` si elle n’existe pas encore.
7. Lance le projet avec `npm run dev`.

> Note : tant que `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` ne sont pas configurés, l’application utilise un mode de développement local fallback.
> Note : si tu vois `new row violates row-level security policy`, il faut appliquer les policies SQL du fichier `supabase-schema.sql` dans l’éditeur SQL de Supabase.

## Points à poursuivre

- Ajouter la gestion des rôles utilisateurs dans Supabase
- Créer une page admin pour la création et modification des utilisateurs
- Implémenter les formulaires CRUD pour contacts, entreprises, affaires, projets et tâches
- Enrichir la page Kanban avec drag and drop et intégration de `@dnd-kit`
- Préparer le déploiement sur Vercel

## Structure

- `src/App.tsx` : routes et layout protégé
- `src/pages` : pages principales
- `src/components` : navigation et topbar
- `src/lib/supabaseClient.ts` : client Supabase
- `src/data/mock.ts` : données de démonstration
