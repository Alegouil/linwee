import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Building2, Plus, UserRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { Company, Contact, ContactCategory } from '../types';

const contactCategories: Array<{ label: string; value: ContactCategory | 'all' }> = [
  { label: 'Tous', value: 'all' },
  { label: 'Suspects', value: 'suspect' },
  { label: 'Prospects', value: 'prospect' },
  { label: 'Clients', value: 'client' },
];

const typeBadge = {
  suspect: 'bg-amber-100 text-amber-800',
  prospect: 'bg-sky-100 text-sky-800',
  client: 'bg-emerald-100 text-emerald-800',
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeContactDraft(contact?: Contact) {
  return {
    civility: contact?.civility ?? 'M.',
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    category: contact?.category ?? 'prospect',
    phone: contact?.phone ?? '',
    secondaryPhone: contact?.secondaryPhone ?? '',
    secondaryPhoneLabel: contact?.secondaryPhoneLabel ?? '',
    email: contact?.email ?? '',
    companyId: contact?.companyId ?? '',
  };
}

function makeCompanyDraft(company?: Company) {
  return {
    name: company?.name ?? '',
    address: company?.address ?? '',
    postalCode: company?.postalCode ?? '',
    city: company?.city ?? '',
    phone: company?.phone ?? '',
    siret: company?.siret ?? '',
    category: company?.category ?? 'prospect',
  };
}

function isPhoneValid(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 10 || (digits.length >= 8 && digits.length <= 15);
}

function formatPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && digits.startsWith('33') && digits.length === 11) {
    return `+33 ${digits.slice(2, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }

  if (!trimmed.startsWith('+') && digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }

  if (trimmed.startsWith('+') && digits.length >= 8) {
    return `+${digits}`;
  }

  return trimmed;
}

export function ContactsPage() {
  const { companies, contacts, createCompany, createContact, updateCompany, updateContact, deleteCompany, deleteContact } = useData();
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState<'all' | ContactCategory>('all');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'contact' | 'company'; id: string } | null>(null);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState(makeContactDraft());
  const [companyDraft, setCompanyDraft] = useState(makeCompanyDraft());
  const [contactCompanyQuery, setContactCompanyQuery] = useState('');
  const [contactError, setContactError] = useState('');
  const [companyError, setCompanyError] = useState('');

  const view = params.get('view') === 'companies' ? 'companies' : 'contacts';
  const selectedContactId = params.get('contactId');
  const selectedCompanyId = params.get('companyId');

  const filteredContacts = useMemo(() => contacts.filter((contact) => category === 'all' || contact.category === category), [category, contacts]);
  const filteredCompanies = useMemo(() => companies.filter((company) => category === 'all' || company.category === category), [category, companies]);

  const selectedContact = contacts.find((item) => item.id === selectedContactId) ?? null;
  const selectedCompany = companies.find((item) => item.id === selectedCompanyId) ?? null;

  useEffect(() => {
    if (!selectedContact) return;
    setContactDraft(makeContactDraft(selectedContact));
    setContactCompanyQuery(companies.find((company) => company.id === selectedContact.companyId)?.name ?? '');
    setContactError('');
  }, [selectedContactId]);

  useEffect(() => {
    if (!selectedCompany) return;
    setCompanyDraft(makeCompanyDraft(selectedCompany));
    setCompanyError('');
  }, [selectedCompanyId]);

  const openContact = (contactId: string) => setParams({ view: 'contacts', contactId });
  const openCompany = (companyId: string) => setParams({ view: 'companies', companyId });
  const closeDetail = () => setParams({ view });

  const openCreateContact = () => {
    setContactDraft(makeContactDraft());
    setContactCompanyQuery('');
    setContactError('');
    setCreateContactOpen(true);
  };

  const openCreateContactForCompany = (company: Company) => {
    closeDetail();
    setContactDraft({
      ...makeContactDraft(),
      companyId: company.id,
    });
    setContactCompanyQuery(company.name);
    setContactError('');
    window.setTimeout(() => setCreateContactOpen(true), 20);
  };

  const openCreateCompany = () => {
    setCompanyDraft(makeCompanyDraft());
    setCompanyError('');
    setCreateCompanyOpen(true);
  };

  const validateContactDraft = () => {
    if (!contactDraft.firstName.trim()) return 'Le prénom est obligatoire.';
    if (!contactDraft.lastName.trim()) return 'Le nom est obligatoire.';
    if (!contactDraft.email.trim()) return 'L’email est obligatoire.';
    if (!emailPattern.test(contactDraft.email.trim())) return 'L’email n’est pas valide.';
    if (!contactDraft.phone.trim()) return 'Le téléphone principal est obligatoire.';
    if (!isPhoneValid(contactDraft.phone)) return 'Le téléphone principal n’est pas valide.';
    if (contactDraft.secondaryPhone.trim() && !isPhoneValid(contactDraft.secondaryPhone)) return 'Le téléphone secondaire n’est pas valide.';
    if (!contactDraft.companyId && !contactCompanyQuery.trim()) return 'Choisis une entreprise ou crée-en une.';

    const duplicate = contacts.find(
      (contact) => contact.email.trim().toLowerCase() === contactDraft.email.trim().toLowerCase() && contact.id !== selectedContact?.id,
    );
    if (duplicate) return 'Un contact avec cet email existe déjà.';

    return null;
  };

  const validateCompanyDraft = () => {
    if (!companyDraft.name.trim()) return 'Le nom de l’entreprise est obligatoire.';
    if (companyDraft.phone.trim() && !isPhoneValid(companyDraft.phone)) return 'Le téléphone de l’entreprise n’est pas valide.';
    return null;
  };

  const ensureCompanyForContact = () => {
    if (contactDraft.companyId) return contactDraft.companyId;
    const trimmedName = contactCompanyQuery.trim();
    if (!trimmedName) return '';

    const existing = companies.find((company) => company.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) return existing.id;

    return createCompany({ name: trimmedName });
  };

  const handleSaveContact = (mode: 'create' | 'edit') => {
    const validationError = validateContactDraft();
    if (validationError) {
      setContactError(validationError);
      return;
    }

    const companyId = ensureCompanyForContact();
    const payload = {
      civility: contactDraft.civility,
      firstName: contactDraft.firstName.trim(),
      lastName: contactDraft.lastName.trim(),
      category: contactDraft.category,
      phone: formatPhone(contactDraft.phone),
      secondaryPhone: contactDraft.secondaryPhone.trim() ? formatPhone(contactDraft.secondaryPhone) : undefined,
      secondaryPhoneLabel: contactDraft.secondaryPhoneLabel.trim() || undefined,
      email: contactDraft.email.trim().toLowerCase(),
      companyId,
    };

    if (mode === 'create') {
      createContact(payload);
      setCreateContactOpen(false);
      setContactDraft(makeContactDraft());
      setContactCompanyQuery('');
      setContactError('');
      return;
    }

    if (!selectedContact) return;
    updateContact(selectedContact.id, payload);
    closeDetail();
  };

  const handleSaveCompany = (mode: 'create' | 'edit') => {
    const validationError = validateCompanyDraft();
    if (validationError) {
      setCompanyError(validationError);
      return;
    }

    const payload = {
      name: companyDraft.name.trim(),
      address: companyDraft.address.trim(),
      postalCode: companyDraft.postalCode.trim(),
      city: companyDraft.city.trim(),
      phone: companyDraft.phone.trim() ? formatPhone(companyDraft.phone) : '',
      siret: companyDraft.siret.trim(),
      category: companyDraft.category,
    };

    if (mode === 'create') {
      const id = createCompany(payload);
      setCreateCompanyOpen(false);
      openCompany(id);
      return;
    }

    if (!selectedCompany) return;
    updateCompany(selectedCompany.id, payload);
    closeDetail();
  };

  const handleQuickCreateCompany = () => {
    const trimmedName = contactCompanyQuery.trim();
    if (!trimmedName) {
      setContactError('Entre un nom d’entreprise avant de la créer.');
      return '';
    }

    const existing = companies.find((company) => company.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      setContactDraft((current) => ({ ...current, companyId: existing.id }));
      setContactCompanyQuery(existing.name);
      setContactError('');
      return existing.id;
    }

    const companyId = createCompany({ name: trimmedName });
    setContactDraft((current) => ({ ...current, companyId }));
    setContactCompanyQuery(trimmedName);
    setContactError('');
    return companyId;
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[640px] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setParams({ view: 'contacts' })} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${view === 'contacts' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
            <UserRound className="h-4 w-4" />
            Contacts
          </button>
          <button onClick={() => setParams({ view: 'companies' })} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${view === 'companies' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
            <Building2 className="h-4 w-4" />
            Entreprises
          </button>
        </div>

        <div className="flex items-start gap-2">
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <div className="flex min-w-max gap-2">
              {contactCategories.map((item) => (
                <button key={item.value} onClick={() => setCategory(item.value)} className={`rounded-full px-3 py-2 text-sm ${category === item.value ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={view === 'contacts' ? openCreateContact : openCreateCompany}
            className="hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white md:flex"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>
      </div>

      {view === 'contacts' ? (
        <div className={`flex-1 overflow-auto rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className="space-y-3">
            {filteredContacts.map((contact) => {
              const company = companies.find((item) => item.id === contact.companyId);
              return (
                <button key={contact.id} onClick={() => openContact(contact.id)} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{contact.civility} {contact.firstName} {contact.lastName}</p>
                    {company && (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          openCompany(company.id);
                        }}
                        className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-800"
                      >
                        {company.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{contact.phone}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{contact.email}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeBadge[contact.category]}`}>{contact.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`flex-1 overflow-auto rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className="space-y-3">
            {filteredCompanies.map((company) => {
              const linkedContacts = contacts.filter((item) => item.companyId === company.id);
              return (
                <button key={company.id} onClick={() => openCompany(company.id)} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <p className="font-semibold">{company.name}</p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{company.postalCode} {company.city}</p>
                  <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{linkedContacts.length} contact(s)</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={createContactOpen} onClose={() => setCreateContactOpen(false)} title="Nouveau contact">
        <ContactForm
          draft={contactDraft}
          setDraft={setContactDraft}
          companyQuery={contactCompanyQuery}
          setCompanyQuery={setContactCompanyQuery}
          companies={companies}
          isDark={isDark}
          error={contactError}
          onCreateCompany={handleQuickCreateCompany}
        />
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCreateContactOpen(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={() => handleSaveContact('create')} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        </div>
      </Modal>

      <Modal isOpen={createCompanyOpen} onClose={() => setCreateCompanyOpen(false)} title="Nouvelle entreprise">
        <CompanyForm draft={companyDraft} setDraft={setCompanyDraft} isDark={isDark} error={companyError} />
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCreateCompanyOpen(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={() => handleSaveCompany('create')} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(selectedContact)} onClose={closeDetail} title={selectedContact ? `${selectedContact.civility} ${selectedContact.firstName} ${selectedContact.lastName}` : ''}>
        {selectedContact && (
          <>
            <ContactForm
              draft={contactDraft}
              setDraft={setContactDraft}
              companyQuery={contactCompanyQuery}
              setCompanyQuery={setContactCompanyQuery}
              companies={companies}
              isDark={isDark}
              error={contactError}
              onCreateCompany={handleQuickCreateCompany}
            />
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setConfirmDelete({ type: 'contact', id: selectedContact.id })} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer</button>
              <div className="ml-auto w-full md:max-w-xs">
                <button onClick={() => handleSaveContact('edit')} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={Boolean(selectedCompany)} onClose={closeDetail} title={selectedCompany?.name || ''}>
        {selectedCompany && (
          <>
            <CompanyForm draft={companyDraft} setDraft={setCompanyDraft} isDark={isDark} error={companyError} />
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-surface'}`}>Contacts liés</h3>
                <button onClick={() => openCreateContactForCompany(selectedCompany)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Ajouter un contact</button>
              </div>
              <div className="space-y-2">
                {contacts.filter((item) => item.companyId === selectedCompany.id).map((contact) => (
                  <button key={contact.id} onClick={() => openContact(contact.id)} className={`w-full rounded-lg p-3 text-left ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    {contact.civility} {contact.firstName} {contact.lastName}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setConfirmDelete({ type: 'company', id: selectedCompany.id })} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer</button>
              <div className="ml-auto w-full md:max-w-xs">
                <button onClick={() => handleSaveCompany('edit')} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Confirmer la suppression">
        {confirmDelete && (
          <div className="space-y-4">
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{confirmDelete.type === 'contact' ? 'Supprimer ce contact ?' : 'Supprimer cette entreprise et ses contacts liés ?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'contact') deleteContact(confirmDelete.id);
                  else deleteCompany(confirmDelete.id);
                  setConfirmDelete(null);
                  closeDetail();
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Modal>

      <button
        onClick={view === 'contacts' ? openCreateContact : openCreateCompany}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function ContactForm({
  draft,
  setDraft,
  companyQuery,
  setCompanyQuery,
  companies,
  isDark,
  error,
  onCreateCompany,
}: {
  draft: ReturnType<typeof makeContactDraft>;
  setDraft: Dispatch<SetStateAction<ReturnType<typeof makeContactDraft>>>;
  companyQuery: string;
  setCompanyQuery: Dispatch<SetStateAction<string>>;
  companies: Company[];
  isDark: boolean;
  error: string;
  onCreateCompany: () => string;
}) {
  const [companyInputFocused, setCompanyInputFocused] = useState(false);
  const [companyInputDirty, setCompanyInputDirty] = useState(false);
  const filteredCompanies = useMemo(() => {
    const trimmedQuery = companyQuery.trim();
    if (!trimmedQuery) return [];
    const normalized = companyQuery.toLowerCase();
    return companies.filter((company) => company.name.toLowerCase().includes(normalized)).slice(0, 6);
  }, [companies, companyQuery]);

  const exactMatch = companies.find((company) => company.name.trim().toLowerCase() === companyQuery.trim().toLowerCase()) ?? null;
  const selectedCompany = companies.find((company) => company.id === draft.companyId) ?? null;

  return (
    <div className="space-y-6">
      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{error}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeBadge[draft.category]}`}>{draft.category}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Civilité</span>
          <select value={draft.civility} onChange={(event) => setDraft((current) => ({ ...current, civility: event.target.value as Contact['civility'] }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>
            <option value="M.">M.</option>
            <option value="Mme">Mme</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Type</span>
          <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as ContactCategory }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>
            <option value="suspect">suspect</option>
            <option value="prospect">prospect</option>
            <option value="client">client</option>
          </select>
        </label>
        <Input label="Prénom" value={draft.firstName} onChange={(value) => setDraft((current) => ({ ...current, firstName: value }))} isDark={isDark} required />
        <Input label="Nom" value={draft.lastName} onChange={(value) => setDraft((current) => ({ ...current, lastName: value }))} isDark={isDark} required />
        <Input label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} isDark={isDark} required />
        <Input label="Téléphone principal" type="tel" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} isDark={isDark} required />
        <Input label="Téléphone secondaire" type="tel" value={draft.secondaryPhone} onChange={(value) => setDraft((current) => ({ ...current, secondaryPhone: value }))} isDark={isDark} />
        <div className="space-y-2 md:col-span-2">
          <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Entreprise liée *</span>
          <div className="space-y-2">
            <input
              value={companyQuery}
              onFocus={() => setCompanyInputFocused(true)}
              onBlur={() => window.setTimeout(() => setCompanyInputFocused(false), 120)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();

                if (exactMatch) {
                  setDraft((current) => ({ ...current, companyId: exactMatch.id }));
                  setCompanyQuery(exactMatch.name);
                  setCompanyInputDirty(false);
                  setCompanyInputFocused(false);
                  return;
                }

                const companyId = onCreateCompany();
                if (companyId) {
                  setCompanyInputDirty(false);
                  setCompanyInputFocused(false);
                }
              }}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCompanyInputDirty(true);
                setCompanyQuery(nextValue);
                const match = companies.find((company) => company.name.trim().toLowerCase() === nextValue.trim().toLowerCase()) ?? null;
                setDraft((current) => ({ ...current, companyId: match?.id ?? '' }));
              }}
              placeholder="Rechercher une entreprise"
              className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}
            />
            {selectedCompany && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}>
                  {selectedCompany.name}
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((current) => ({ ...current, companyId: '' }));
                      setCompanyQuery('');
                      setCompanyInputDirty(false);
                    }}
                    className={`rounded-full px-1 text-[11px] leading-none ${isDark ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-500 hover:bg-slate-200'}`}
                    aria-label={`Retirer ${selectedCompany.name}`}
                  >
                    x
                  </button>
                </span>
              </div>
            )}
            {companyInputFocused && companyInputDirty && (filteredCompanies.length > 0 || (!exactMatch && companyQuery.trim())) && (
              <div className={`rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
                {filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setDraft((current) => ({ ...current, companyId: company.id }));
                      setCompanyQuery(company.name);
                      setCompanyInputDirty(false);
                      setCompanyInputFocused(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                  >
                    <div className="font-medium">{company.name}</div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{company.city}</div>
                  </button>
                ))}
                {!exactMatch && companyQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const companyId = onCreateCompany();
                      if (companyId) {
                        setCompanyInputDirty(false);
                        setCompanyInputFocused(false);
                      }
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                  >
                    <div className="font-medium">Nouvelle entreprise</div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{companyQuery.trim()}</div>
                  </button>
                )}
              </div>
            )}
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Commence à écrire pour choisir une entreprise, puis `Entrée` crée immédiatement si elle n’existe pas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyForm({
  draft,
  setDraft,
  isDark,
  error,
}: {
  draft: ReturnType<typeof makeCompanyDraft>;
  setDraft: Dispatch<SetStateAction<ReturnType<typeof makeCompanyDraft>>>;
  isDark: boolean;
  error: string;
}) {
  return (
    <div className="space-y-6">
      {error && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nom" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} isDark={isDark} required />
        <Input label="Téléphone" type="tel" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} isDark={isDark} />
        <Input label="Adresse" value={draft.address} onChange={(value) => setDraft((current) => ({ ...current, address: value }))} isDark={isDark} />
        <Input label="Code postal" value={draft.postalCode} onChange={(value) => setDraft((current) => ({ ...current, postalCode: value }))} isDark={isDark} />
        <Input label="Ville" value={draft.city} onChange={(value) => setDraft((current) => ({ ...current, city: value }))} isDark={isDark} />
        <Input label="SIRET" value={draft.siret} onChange={(value) => setDraft((current) => ({ ...current, siret: value }))} isDark={isDark} />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  isDark,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
        {required ? ' *' : ''}
      </span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} />
    </label>
  );
}
