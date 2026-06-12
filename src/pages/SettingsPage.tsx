import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ChevronDown, ChevronUp, GripVertical, ListChecks, Plus, Trash2, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { UserBadge } from '../components/UserBadge';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { getRandomSettingsColor, settingsColorPalette } from '../lib/appSettings';
import type { AppSettings, User, UserKind, UserRole } from '../types';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  gestion: 'Gestion',
  utilisateur: 'Utilisateur',
  invite: 'Invité',
};

const roleClasses: Record<UserRole, string> = {
  admin: 'bg-violet-100 text-violet-700',
  gestion: 'bg-blue-100 text-blue-700',
  utilisateur: 'bg-slate-200 text-slate-700',
  invite: 'bg-emerald-100 text-emerald-700',
};

const kindLabels: Record<UserKind, string> = {
  internal: 'Internes',
  external: 'Externes',
};

function makeUserDraft(user?: User) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    jobTitle: user?.jobTitle ?? '',
    phone: user?.phone ?? '',
    color: user?.color ?? getRandomSettingsColor(),
    avatar: user?.avatar ?? '',
    role: user?.role ?? 'utilisateur',
    kind: user?.kind ?? 'internal',
  };
}

function makeSettingsDraft(settings: AppSettings) {
  return structuredClone(settings);
}

function moveValue<T>(items: T[], sourceIndex: number, destinationIndex: number) {
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, moved);
  return next;
}

type SettingsValueKey = 'dealStatuses' | 'projectStatuses' | 'projectTypes' | 'taskStates' | 'taskPriorities' | 'taskCategories';
type SettingsColorKey = 'dealStatusColors' | 'projectStatusColors' | 'projectTypeColors' | 'taskStateColors' | 'taskPriorityColors' | 'taskCategoryColors';

const settingsSections: Array<{ title: string; valuesKey: SettingsValueKey; colorsKey: SettingsColorKey }> = [
  { title: 'États affaire', valuesKey: 'dealStatuses', colorsKey: 'dealStatusColors' },
  { title: 'États projet', valuesKey: 'projectStatuses', colorsKey: 'projectStatusColors' },
  { title: 'Types projet', valuesKey: 'projectTypes', colorsKey: 'projectTypeColors' },
  { title: 'États tâche', valuesKey: 'taskStates', colorsKey: 'taskStateColors' },
  { title: 'Priorités tâche', valuesKey: 'taskPriorities', colorsKey: 'taskPriorityColors' },
  { title: 'Catégories tâche', valuesKey: 'taskCategories', colorsKey: 'taskCategoryColors' },
];

export function SettingsPage() {
  const { appSettings, currentUser, users, createUser, updateUser, deleteUser, lastSyncError, clearLastSyncError, updateAppSettings } = useData();
  const { isDark } = useTheme();
  const [activeSection, setActiveSection] = useState<'users' | 'values'>('users');
  const [kindFilter, setKindFilter] = useState<UserKind>('internal');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState(makeUserDraft());
  const [settingsDraft, setSettingsDraft] = useState(makeSettingsDraft(appSettings));
  const [formError, setFormError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const canManageSettings = currentUser?.role === 'admin';
  const filteredUsers = useMemo(() => users.filter((user) => user.kind === kindFilter), [kindFilter, users]);
  const editingUser = users.find((user) => user.id === editingUserId) ?? null;

  useEffect(() => {
    setSettingsDraft(makeSettingsDraft(appSettings));
  }, [appSettings]);

  if (!canManageSettings) {
    return (
      <div className={`rounded-2xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-black/10 bg-white text-slate-700'}`}>
        Cette page est réservée aux administrateurs.
      </div>
    );
  }

  const resetUserDraft = (user?: User) => {
    setUserDraft(makeUserDraft(user));
    setFormError('');
    clearLastSyncError();
  };

  const validateUserDraft = (userId?: string) => {
    const email = userDraft.email.trim().toLowerCase();
    if (!email) return 'L’email est obligatoire pour enregistrer un utilisateur.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'L’email n’est pas valide.';
    if (users.find((user) => user.email.trim().toLowerCase() === email && user.id !== userId)) return 'Un utilisateur avec cet email existe déjà.';
    if (!userDraft.firstName.trim()) return 'Le prénom est obligatoire.';
    if (!userDraft.lastName.trim()) return 'Le nom est obligatoire.';
    return null;
  };

  const validateSettingsDraft = () => {
    for (const { title, valuesKey } of settingsSections) {
      const values = settingsDraft[valuesKey];
      const cleaned = values.map((value) => value.trim()).filter(Boolean);
      if (cleaned.length === 0) return `La section ${title} doit contenir au moins une valeur.`;
      if (new Set(cleaned.map((value) => value.toLowerCase())).size !== cleaned.length) return `La section ${title} contient des doublons.`;
    }
    return null;
  };

  const saveSettings = () => {
    const error = validateSettingsDraft();
    if (error) {
      setSettingsError(error);
      setSettingsSaved(false);
      return;
    }

    const nextSettings = settingsSections.reduce<AppSettings>((accumulator, section) => {
      const cleanedValues = settingsDraft[section.valuesKey].map((value) => value.trim()).filter(Boolean);
      const previousValues = settingsDraft[section.valuesKey];
      const previousColors = settingsDraft[section.colorsKey];
      const nextColors = Object.fromEntries(
        cleanedValues.map((value, index) => [
          value,
          previousColors[value] ?? previousColors[previousValues[index] ?? ''] ?? '#64748b',
        ]),
      );

      return {
        ...accumulator,
        [section.valuesKey]: cleanedValues,
        [section.colorsKey]: nextColors,
      };
    }, settingsDraft);

    updateAppSettings(nextSettings);
    setSettingsDraft(nextSettings);
    setSettingsError('');
    setSettingsSaved(true);
  };

  useEffect(() => {
    if (!settingsSaved) return;
    const timeout = window.setTimeout(() => setSettingsSaved(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [settingsSaved]);

  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2">
          <button onClick={() => setActiveSection('users')} className={`flex min-w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-medium ${activeSection === 'users' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
            <Users className="h-5 w-5" />
            <span>Utilisateurs</span>
          </button>
          <button onClick={() => setActiveSection('values')} className={`flex min-w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-medium ${activeSection === 'values' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
            <ListChecks className="h-5 w-5" />
            <span>Valeurs</span>
          </button>
        </div>
      </div>

      {lastSyncError && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-800 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          Supabase a refuse la synchronisation: {lastSyncError}
        </div>
      )}

      {activeSection === 'users' ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['internal', 'external'] as UserKind[]).map((kind) => (
                <button key={kind} onClick={() => setKindFilter(kind)} className={`rounded-full px-4 py-2 text-sm font-medium ${kindFilter === kind ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{kindLabels[kind]}</button>
              ))}
            </div>
            <button onClick={() => { resetUserDraft(); setKindFilter('internal'); setCreateOpen(true); }} className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white md:inline-flex"><Plus className="h-4 w-4" />Créer</button>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <button key={user.id} onClick={() => { setEditingUserId(user.id); resetUserDraft(user); }} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: user.color }}>{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{user.name}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClasses[user.role]}`}>{roleLabels[user.role]}</span>
                          <UserBadge user={user} />
                        </div>
                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{user.email}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'}`}>{kindLabels[user.kind].slice(0, -1)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          {settingsError && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{settingsError}</div>}
          <div className="grid gap-4 xl:grid-cols-2">
            {settingsSections.map((section) => (
              <SettingsListEditor
                key={section.valuesKey}
                title={section.title}
                values={settingsDraft[section.valuesKey]}
                colors={settingsDraft[section.colorsKey]}
                onChange={(values, colors) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    [section.valuesKey]: values,
                    [section.colorsKey]: colors,
                  }))
                }
                isDark={isDark}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            {settingsSaved && (
              <span className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Valeurs enregistrées</span>
            )}
            <button onClick={saveSettings} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer les valeurs</button>
          </div>
        </section>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel utilisateur">
        {formError && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{formError}</div>}
        <UserForm draft={userDraft} setDraft={setUserDraft} isDark={isDark} disabled={false} />
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCreateOpen(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={() => {
            const error = validateUserDraft();
            if (error) return setFormError(error);
            createUser({ ...userDraft, email: userDraft.email.trim(), firstName: userDraft.firstName.trim(), lastName: userDraft.lastName.trim(), role: userDraft.kind === 'external' ? 'invite' : userDraft.role, name: `${userDraft.firstName.trim()} ${userDraft.lastName.trim()}`.trim() });
            setCreateOpen(false);
          }} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUserId(null)} title={editingUser?.name || 'Utilisateur'}>
        {editingUser && (
          <>
            {formError && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{formError}</div>}
            <UserForm draft={userDraft} setDraft={setUserDraft} isDark={isDark} disabled={false} />
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setConfirmDeleteId(editingUser.id)} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer</button>
              <div className="ml-auto w-full md:max-w-xs">
                <button onClick={() => {
                  const error = validateUserDraft(editingUser.id);
                  if (error) return setFormError(error);
                  updateUser(editingUser.id, { ...userDraft, email: userDraft.email.trim(), firstName: userDraft.firstName.trim(), lastName: userDraft.lastName.trim(), role: userDraft.kind === 'external' ? 'invite' : userDraft.role, name: `${userDraft.firstName.trim()} ${userDraft.lastName.trim()}`.trim() });
                  setEditingUserId(null);
                }} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Confirmer la suppression">
        {confirmDeleteId && (
          <div className="space-y-4">
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Supprimer cet utilisateur ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
              <button onClick={() => { deleteUser(confirmDeleteId); setConfirmDeleteId(null); setEditingUserId(null); }} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white">Supprimer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SettingsListEditor({
  title,
  values,
  colors,
  onChange,
  isDark,
}: {
  title: string;
  values: string[];
  colors: Record<string, string>;
  onChange: (values: string[], colors: Record<string, string>) => void;
  isDark: boolean;
}) {
  const addValue = () => {
    const nextValue = '';
    onChange([...values, nextValue], colors);
  };
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const updateValue = (index: number, nextValue: string) => {
    const currentValue = values[index] ?? '';
    const nextValues = values.map((item, itemIndex) => (itemIndex === index ? nextValue : item));
    const nextColors = { ...colors };
    if (currentValue !== nextValue) {
      nextColors[nextValue] = nextColors[nextValue] ?? nextColors[currentValue] ?? '#64748b';
      if (currentValue) delete nextColors[currentValue];
    }
    onChange(nextValues, nextColors);
  };

  const updateColor = (value: string, color: string) => {
    onChange(values, { ...colors, [value]: color });
  };

  const removeValue = (index: number) => {
    const removedValue = values[index];
    const nextColors = { ...colors };
    if (removedValue) delete nextColors[removedValue];
    onChange(values.filter((_, itemIndex) => itemIndex !== index), nextColors);
  };

  const reorderValues = (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) return;
    onChange(moveValue(values, sourceIndex, destinationIndex), colors);
  };

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={addValue} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Ajouter</button>
      </div>
      <div className="space-y-3">
        {values.map((value, index) => (
          <div
            key={`${title}-${index}`}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedIndex === null) return;
              reorderValues(draggedIndex, index);
              setDraggedIndex(null);
            }}
            onDragEnd={() => setDraggedIndex(null)}
            className={`relative rounded-xl p-3 ${isDark ? 'bg-slate-900/30' : 'bg-white'} ${draggedIndex === index ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Réordonner la valeur"
                className={`hidden md:block ${isDark ? 'text-slate-400' : 'text-slate-500'} cursor-grab`}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex flex-col gap-1 md:hidden">
                <button
                  type="button"
                  aria-label="Monter la valeur"
                  disabled={index === 0}
                  onClick={() => reorderValues(index, index - 1)}
                  className={`rounded p-1 ${index === 0 ? 'opacity-40' : ''} ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'}`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Descendre la valeur"
                  disabled={index === values.length - 1}
                  onClick={() => reorderValues(index, index + 1)}
                  className={`rounded p-1 ${index === values.length - 1 ? 'opacity-40' : ''} ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'}`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <input value={value} onChange={(event) => updateValue(index, event.target.value)} className={`flex-1 rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} />
              <button
                type="button"
                aria-label="Choisir une couleur"
                onClick={() => {
                  setActiveColorIndex((current) => {
                    const nextIndex = current === index ? null : index;
                    setPendingColor(nextIndex === index ? (colors[value] ?? '#64748b') : null);
                    return nextIndex;
                  });
                }}
                className={`h-9 w-9 flex-shrink-0 rounded-full transition ${activeColorIndex === index ? 'scale-110 shadow-md shadow-slate-500/30' : ''}`}
                style={{ backgroundColor: colors[value] ?? '#64748b' }}
              />
              <button
                type="button"
                aria-label="Supprimer la valeur"
                onClick={() => {
                  if (window.confirm(`Supprimer la valeur "${value.trim() || 'sans nom'}" ?`)) {
                    removeValue(index);
                  }
                }}
                className={`${isDark ? 'text-red-300' : 'text-red-600'}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {activeColorIndex === index && (
              <div className={`absolute right-3 top-[calc(100%+0.5rem)] z-20 w-72 rounded-2xl border p-3 shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
                <div className="space-y-3">
                  <div>
                    <p className={`mb-2 text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aperçu</p>
                    <div className="flex items-center">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: pendingColor ?? colors[value] ?? '#64748b',
                          color: '#ffffff',
                        }}
                      >
                        {value.trim() || 'Valeur'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settingsColorPalette.map((paletteColor) => (
                      <button
                        key={`${title}-${value}-${paletteColor}`}
                        type="button"
                        onClick={() => setPendingColor(paletteColor)}
                        aria-label={`Choisir ${paletteColor}`}
                        className={`h-8 w-8 rounded-full transition ${(pendingColor ?? colors[value]) === paletteColor ? 'scale-110 shadow-md shadow-slate-500/30 ring-2 ring-slate-300' : ''}`}
                        style={{ backgroundColor: paletteColor }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingColor(colors[value] ?? '#64748b');
                        setActiveColorIndex(null);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateColor(value, pendingColor ?? colors[value] ?? '#64748b');
                        setActiveColorIndex(null);
                        setPendingColor(null);
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserForm({
  draft,
  setDraft,
  isDark,
  disabled,
}: {
  draft: ReturnType<typeof makeUserDraft>;
  setDraft: Dispatch<SetStateAction<ReturnType<typeof makeUserDraft>>>;
  isDark: boolean;
  disabled: boolean;
}) {
  const update = <K extends keyof ReturnType<typeof makeUserDraft>>(key: K, value: ReturnType<typeof makeUserDraft>[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'kind' && value === 'external') next.role = 'invite';
      if (key === 'kind' && value === 'internal' && next.role === 'invite') next.role = 'utilisateur';
      return next;
    });
  };
  const [userColorOpen, setUserColorOpen] = useState(false);
  const [pendingUserColor, setPendingUserColor] = useState(draft.color);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input label="Email" value={draft.email} onChange={(value) => update('email', value)} isDark={isDark} disabled={disabled} required />
      <label className="space-y-2">
        <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Type</span>
        <select value={draft.kind} disabled={disabled} onChange={(event) => update('kind', event.target.value as UserKind)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>
          <option value="internal">Interne</option>
          <option value="external">Externe</option>
        </select>
      </label>
      <Input label="Prénom" value={draft.firstName} onChange={(value) => update('firstName', value)} isDark={isDark} disabled={disabled} required />
      <Input label="Nom" value={draft.lastName} onChange={(value) => update('lastName', value)} isDark={isDark} disabled={disabled} required />
      <Input label="Poste" value={draft.jobTitle} onChange={(value) => update('jobTitle', value)} isDark={isDark} disabled={disabled} />
      <Input label="Téléphone" value={draft.phone} onChange={(value) => update('phone', value)} isDark={isDark} disabled={disabled} />
      <label className="space-y-2">
        <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rôle</span>
        <select value={draft.kind === 'external' ? 'invite' : draft.role} disabled={disabled || draft.kind === 'external'} onChange={(event) => update('role', event.target.value as UserRole)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>
          <option value="admin">Admin</option>
          <option value="gestion">Gestion</option>
          <option value="utilisateur">Utilisateur</option>
          <option value="invite">Invité</option>
        </select>
      </label>
      <label className="relative space-y-2">
        <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Couleur badge</span>
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setPendingUserColor(draft.color);
              setUserColorOpen((current) => !current);
            }}
            className={`h-9 w-9 rounded-full transition ${disabled ? 'opacity-60' : 'shadow-md shadow-slate-500/20'}`}
            style={{ backgroundColor: draft.color }}
          />
        </div>
        {userColorOpen && !disabled && (
          <div className={`absolute left-0 top-[calc(100%+0.5rem)] z-20 w-72 rounded-2xl border p-3 shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
            <div className="space-y-3">
              <p className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aperçu</p>
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full" style={{ backgroundColor: pendingUserColor }} />
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Aperçu du badge utilisateur</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {settingsColorPalette.map((paletteColor) => (
                  <button
                    key={paletteColor}
                    type="button"
                    onClick={() => setPendingUserColor(paletteColor)}
                    className={`h-8 w-8 rounded-full transition ${pendingUserColor === paletteColor ? 'scale-110 shadow-md shadow-slate-500/30 ring-2 ring-slate-300' : ''}`}
                    style={{ backgroundColor: paletteColor }}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingUserColor(draft.color);
                    setUserColorOpen(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update('color', pendingUserColor);
                    setUserColorOpen(false);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}
      </label>
      <Input label="Avatar URL" value={draft.avatar} onChange={(value) => update('avatar', value)} isDark={isDark} disabled={disabled} className="md:col-span-2" />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  isDark,
  disabled,
  className = '',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  disabled: boolean;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
        {required ? ' *' : ''}
      </span>
      <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} />
    </label>
  );
}
