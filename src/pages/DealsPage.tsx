import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ConfigBadge } from '../components/ConfigBadge';
import { Modal } from '../components/Modal';
import { AutocompleteField } from '../components/AutocompleteField';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

export function DealsPage() {
  const { appSettings, contacts, companies, deals, createDeal, updateDeal, updateDealLine, reorderDealLines, moveDealToStatus, deleteDeal } = useData();
  const statuses = appSettings.dealStatuses;
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const [newDeal, setNewDeal] = useState({
    title: '',
    clientId: contacts[0]?.id ?? '',
    status: statuses[0] ?? 'Nouveau',
    date: new Date().toISOString().slice(0, 10),
    amount: '0',
    description: '',
    notes: '',
  });
  const [editDeal, setEditDeal] = useState({
    title: '',
    clientId: '',
    status: statuses[0] ?? 'Nouveau',
    amount: '0',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
  });

  const selectedDealId = params.get('dealId');
  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? null;

  const filteredDeals = useMemo(() => {
    if (dateFilter === 'all') return deals;
    const today = new Date();
    return deals.filter((deal) => {
      const date = new Date(deal.date);
      if (dateFilter === 'this_month') return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      if (dateFilter === 'next_month') return date.getMonth() === today.getMonth() + 1 && date.getFullYear() === today.getFullYear();
      return true;
    });
  }, [dateFilter, deals]);

  const computedAmount = useMemo(() => selectedDeal ? selectedDeal.lines.reduce((sum, line) => sum + (Number(line.price) || 0), 0) : 0, [selectedDeal]);

  useEffect(() => {
    if (!selectedDeal) return;
    setEditDeal({
      title: selectedDeal.title,
      clientId: selectedDeal.clientId,
      status: selectedDeal.status,
      amount: String(selectedDeal.amount),
      date: selectedDeal.date,
      description: selectedDeal.description.replace(/<[^>]+>/g, ''),
      notes: selectedDeal.notes.replace(/<[^>]+>/g, ''),
    });
    setEditError('');
  }, [selectedDealId]);

  const openCreateModal = () => {
    setNewDeal({
      title: '',
      clientId: contacts[0]?.id ?? '',
      status: statuses[0] ?? 'Nouveau',
      date: new Date().toISOString().slice(0, 10),
      amount: '0',
      description: '',
      notes: '',
    });
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreateDeal = () => {
    if (!newDeal.title.trim()) {
      setCreateError('Le titre de l’affaire est obligatoire.');
      return;
    }
    if (!newDeal.clientId) {
      setCreateError('Le contact est obligatoire.');
      return;
    }

    const id = createDeal({
      title: newDeal.title.trim(),
      clientId: newDeal.clientId,
      status: newDeal.status,
      date: newDeal.date,
      amount: Number(newDeal.amount) || 0,
      description: newDeal.description.trim() ? `<p>${newDeal.description.trim()}</p>` : '',
      notes: newDeal.notes.trim() ? `<p>${newDeal.notes.trim()}</p>` : '',
      lines: [],
    });
    setCreateOpen(false);
    setParams({ dealId: id });
  };

  const handleSaveDeal = () => {
    if (!selectedDeal) return;
    if (!editDeal.title.trim()) {
      setEditError('Le titre de l’affaire est obligatoire.');
      return;
    }
    if (!editDeal.clientId) {
      setEditError('Le contact est obligatoire.');
      return;
    }

    updateDeal(selectedDeal.id, {
      title: editDeal.title.trim(),
      clientId: editDeal.clientId,
      status: editDeal.status,
      amount: Number(editDeal.amount) || 0,
      date: editDeal.date,
      description: editDeal.description.trim() ? `<p>${editDeal.description.trim()}</p>` : '',
      notes: editDeal.notes.trim() ? `<p>${editDeal.notes.trim()}</p>` : '',
    });
    setParams({});
  };

  const handleKanbanAutoScroll = (event: DragEvent<HTMLDivElement>) => {
    const container = kanbanScrollRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const edge = 96;
    const step = 24;

    if (event.clientX >= bounds.right - edge) {
      container.scrollLeft += step;
    } else if (event.clientX <= bounds.left + edge) {
      container.scrollLeft -= step;
    }
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[640px] flex-col gap-6">
      <div className="flex items-center justify-end gap-3">
        <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={`h-10 rounded-xl px-3 text-sm ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}>
          <option value="all">Toutes dates</option>
          <option value="this_month">Ce mois-ci</option>
          <option value="next_month">Mois prochain</option>
        </select>
        <button onClick={openCreateModal} className="hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white md:flex"><Plus className="h-4 w-4" />Créer</button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          ref={kanbanScrollRef}
          onDragOver={handleKanbanAutoScroll}
          className="flex h-full gap-4 overflow-x-auto overflow-y-hidden pb-2"
        >
          {statuses.map((status) => {
            const columnDeals = filteredDeals.filter((deal) => deal.status === status);
            const columnTotal = columnDeals.reduce((sum, deal) => sum + (deal.lines.length ? deal.lines.reduce((lineSum, line) => lineSum + line.price, 0) : deal.amount), 0);
            return (
              <div key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedDealId) return; moveDealToStatus(draggedDealId, status); setDraggedDealId(null); }} className={`flex h-full min-w-[82vw] flex-col rounded-2xl border md:min-w-[24rem] ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
                <div className={`border-b p-4 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
                  <h3 className="font-semibold">{status}</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{columnDeals.length} affaire(s) • {columnTotal}€</p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {columnDeals.map((deal) => {
                    const client = contacts.find((item) => item.id === deal.clientId);
                    const company = companies.find((item) => item.id === client?.companyId);
                    return (
                      <button key={deal.id} draggable onDragStart={() => setDraggedDealId(deal.id)} onDragEnd={() => setDraggedDealId(null)} onClick={() => setParams({ dealId: deal.id })} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><h4 className="font-semibold">{deal.title}</h4><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{client?.firstName} {client?.lastName}</p><p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{company?.name}</p></div><ConfigBadge label={deal.status} color={appSettings.dealStatusColors[deal.status] ?? '#64748b'} /></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={Boolean(selectedDeal)} onClose={() => setParams({})} title={selectedDeal?.title || ''}>
        {selectedDeal && (
          <div className="space-y-6">
            {editError && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{editError}</div>}
            <div className="flex items-center gap-2"><ConfigBadge label={selectedDeal.status} color={appSettings.dealStatusColors[selectedDeal.status] ?? '#64748b'} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titre" value={editDeal.title} onChange={(value) => setEditDeal((current) => ({ ...current, title: value }))} isDark={isDark} required />
              <AutocompleteField label="Contact" value={editDeal.clientId} options={contacts.map((contact) => ({ id: contact.id, label: `${contact.firstName} ${contact.lastName}`, meta: contact.email }))} onChange={(id) => setEditDeal((current) => ({ ...current, clientId: id }))} required />
              <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>État</span><select value={editDeal.status} onChange={(event) => setEditDeal((current) => ({ ...current, status: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Montant</span><input value={selectedDeal.lines.length > 0 ? String(computedAmount) : editDeal.amount} onChange={(event) => !selectedDeal.lines.length && setEditDeal((current) => ({ ...current, amount: event.target.value }))} readOnly={selectedDeal.lines.length > 0} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'} ${selectedDeal.lines.length > 0 ? 'opacity-70' : ''}`} /></label>
              <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</span><input type="date" value={editDeal.date} onChange={(event) => setEditDeal((current) => ({ ...current, date: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>
            </div>
            <Wysiwyg label="Description" value={editDeal.description} onChange={(value) => setEditDeal((current) => ({ ...current, description: value.replace(/<[^>]+>/g, '') }))} isDark={isDark} />
            <div>
              <div className="mb-3 flex items-center justify-between"><h3 className={`font-semibold ${isDark ? 'text-white' : 'text-surface'}`}>Lignes tarifaires</h3><button onClick={() => updateDeal(selectedDeal.id, { lines: [...selectedDeal.lines, { id: `line-${Date.now()}`, title: 'Nouvelle ligne', description: '', price: 0 }] })} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Ajouter</button></div>
              <div className="space-y-3">{selectedDeal.lines.map((line, index) => <div key={line.id} draggable onDragStart={() => setDraggedLineIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedLineIndex === null || draggedLineIndex === index) return; reorderDealLines(selectedDeal.id, draggedLineIndex, index); setDraggedLineIndex(null); }} onDragEnd={() => setDraggedLineIndex(null)} className={`rounded-xl p-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><div className="flex items-start gap-3"><GripVertical className={`mt-2 h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /><div className="grid flex-1 gap-3 md:grid-cols-[1.2fr_1.8fr_120px]"><Field label="Libellé" value={line.title} onChange={(value) => updateDealLine(selectedDeal.id, line.id, { title: value })} isDark={isDark} /><Field label="Description" value={line.description} onChange={(value) => updateDealLine(selectedDeal.id, line.id, { description: value })} isDark={isDark} /><Field label="Prix" value={String(line.price)} onChange={(value) => updateDealLine(selectedDeal.id, line.id, { price: Number(value) || 0 })} isDark={isDark} /></div></div></div>)}</div>
            </div>
            <Wysiwyg label="Notes" value={editDeal.notes} onChange={(value) => setEditDeal((current) => ({ ...current, notes: value.replace(/<[^>]+>/g, '') }))} isDark={isDark} />
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(true)} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer</button>
              <div className="ml-auto w-full md:max-w-xs">
                <button onClick={handleSaveDeal} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={confirmDelete && Boolean(selectedDeal)} onClose={() => setConfirmDelete(false)} title="Confirmer la suppression">
        {selectedDeal && <div className="space-y-4"><p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Supprimer l&apos;affaire "{selectedDeal.title}" ?</p><div className="flex gap-3"><button onClick={() => setConfirmDelete(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { deleteDeal(selectedDeal.id); setConfirmDelete(false); setParams({}); }} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white">Supprimer</button></div></div>}
      </Modal>
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle affaire">
        <div className="space-y-6">
          {createError && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{createError}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Titre" value={newDeal.title} onChange={(value) => setNewDeal((current) => ({ ...current, title: value }))} isDark={isDark} required />
            <AutocompleteField label="Contact" value={newDeal.clientId} options={contacts.map((contact) => ({ id: contact.id, label: `${contact.firstName} ${contact.lastName}`, meta: contact.email }))} onChange={(id) => setNewDeal((current) => ({ ...current, clientId: id }))} required />
            <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>État</span><select value={newDeal.status} onChange={(event) => setNewDeal((current) => ({ ...current, status: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Montant</span><input type="number" min="0" value={newDeal.amount} onChange={(event) => setNewDeal((current) => ({ ...current, amount: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>
            <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</span><input type="date" value={newDeal.date} onChange={(event) => setNewDeal((current) => ({ ...current, date: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>
          </div>
          <Wysiwyg label="Description" value={newDeal.description} onChange={(value) => setNewDeal((current) => ({ ...current, description: value.replace(/<[^>]+>/g, '') }))} isDark={isDark} />
          <Wysiwyg label="Notes" value={newDeal.notes} onChange={(value) => setNewDeal((current) => ({ ...current, notes: value.replace(/<[^>]+>/g, '') }))} isDark={isDark} />
          <div className="flex gap-3">
            <button onClick={() => setCreateOpen(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
            <button onClick={handleCreateDeal} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white">Créer</button>
          </div>
        </div>
      </Modal>
      <button onClick={openCreateModal} className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl md:hidden"><Plus className="h-6 w-6" /></button>
    </div>
  );
}

function Field({ label, value, onChange, isDark, required = false }: { label: string; value: string; onChange: (value: string) => void; isDark: boolean; required?: boolean }) {
  return <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}{required ? ' *' : ''}</span><input value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>;
}

function Wysiwyg({ label, value, onChange, isDark }: { label: string; value: string; onChange: (value: string) => void; isDark: boolean }) {
  return <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span><div className={`rounded-lg border p-2 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-black/10 bg-white'}`}><textarea value={value.replace(/<[^>]+>/g, '')} onChange={(event) => onChange(`<p>${event.target.value}</p>`)} rows={5} className={`w-full resize-y bg-transparent outline-none ${isDark ? 'text-white' : 'text-surface'}`} /></div></label>;
}
