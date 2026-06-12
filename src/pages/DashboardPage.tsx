import { useMemo } from 'react';
import { Bot, Briefcase, CalendarDays, CheckCircle2, ClipboardList, Clock3, FolderOpen, LayoutDashboard, Settings2, Sparkles, TrendingUp, TriangleAlert, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { UserBadge } from '../components/UserBadge';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const sections = [
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'deals', label: 'Affaires', icon: ClipboardList },
  { key: 'projects', label: 'Projets', icon: FolderOpen },
  { key: 'tasks', label: 'Tâches', icon: CalendarDays },
  { key: 'users', label: 'Utilisateurs', icon: Settings2 },
  { key: 'rag', label: 'RAG', icon: Bot },
] as const;

const ragUsageSample = [
  { label: 'Tâches', count: 46, trend: '+18%' },
  { label: 'Projets', count: 31, trend: '+11%' },
  { label: 'Affaires', count: 24, trend: '+7%' },
  { label: 'Contacts', count: 18, trend: '-4%' },
  { label: 'Entreprises', count: 13, trend: '+3%' },
];

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function isWithinDays(value: string | undefined, from: Date, days: number) {
  const date = parseDate(value);
  if (!date) return false;
  const diff = daysBetween(from, date);
  return diff >= 0 && diff <= days;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);
}

function getDealValue(amount: number, lines: Array<{ price: number }>) {
  return lines.length > 0 ? lines.reduce((sum, line) => sum + (Number(line.price) || 0), 0) : amount;
}

export function DashboardPage() {
  const { companies, contacts, deals, projects, tasks, users } = useData();
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();
  const activeSection = sections.some((section) => section.key === params.get('section')) ? (params.get('section') as (typeof sections)[number]['key']) : 'contacts';
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const internalUsers = useMemo(() => users.filter((user) => user.kind === 'internal'), [users]);

  const contactInsights = useMemo(() => {
    const leads = contacts.filter((contact) => contact.category !== 'client');
    const newLeads30d = leads.filter((contact) => isWithinDays(contact.createdAt, today, 30)).length;
    const staleLeads = leads.filter((contact) => daysBetween(today, parseDate(contact.lastInteractionAt) ?? today) > 10).length;
    const clientContacts = contacts.filter((contact) => contact.category === 'client').length;
    const conversionRate = contacts.length > 0 ? (clientContacts / contacts.length) * 100 : 0;
    const acquisition = Object.entries(
      contacts.reduce<Record<string, number>>((accumulator, contact) => {
        accumulator[contact.acquisitionChannel] = (accumulator[contact.acquisitionChannel] ?? 0) + 1;
        return accumulator;
      }, {}),
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const multiContacts = companies
      .map((company) => ({
        company,
        count: contacts.filter((contact) => contact.companyId === company.id).length,
      }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count);

    return { leads: leads.length, newLeads30d, staleLeads, conversionRate, acquisition, multiContacts };
  }, [companies, contacts, today]);

  const dealInsights = useMemo(() => {
    const totals = deals.map((deal) => ({ ...deal, total: getDealValue(deal.amount, deal.lines) }));
    const pendingRevenue = totals.filter((deal) => deal.outcome === 'pending').reduce((sum, deal) => sum + deal.total, 0);
    const wonRevenue = totals.filter((deal) => deal.outcome === 'won').reduce((sum, deal) => sum + deal.total, 0);
    const lostRevenue = totals.filter((deal) => deal.outcome === 'lost').reduce((sum, deal) => sum + deal.total, 0);
    const averageTicket = totals.length > 0 ? totals.reduce((sum, deal) => sum + deal.total, 0) / totals.length : 0;
    const currentMonthStart = startOfMonth(today);
    const previousMonthStart = startOfMonth(addMonths(today, -1));
    const wonThisMonth = totals
      .filter((deal) => deal.outcome === 'won')
      .filter((deal) => {
        const closedAt = parseDate(deal.closedAt);
        return closedAt ? closedAt >= currentMonthStart : false;
      })
      .reduce((sum, deal) => sum + deal.total, 0);
    const wonPreviousMonth = totals
      .filter((deal) => deal.outcome === 'won')
      .filter((deal) => {
        const closedAt = parseDate(deal.closedAt);
        return closedAt ? closedAt >= previousMonthStart && closedAt < currentMonthStart : false;
      })
      .reduce((sum, deal) => sum + deal.total, 0);
    const delta = wonPreviousMonth === 0 ? 100 : ((wonThisMonth - wonPreviousMonth) / wonPreviousMonth) * 100;
    const monthlyPipeline = Array.from({ length: 4 }, (_, index) => {
      const monthStart = startOfMonth(addMonths(today, index - 3));
      const monthEnd = startOfMonth(addMonths(today, index - 2));
      const items = totals.filter((deal) => {
        const pivot = parseDate(deal.closedAt ?? deal.expectedCloseDate ?? deal.date);
        return pivot ? pivot >= monthStart && pivot < monthEnd : false;
      });
      return {
        label: formatMonthLabel(monthStart),
        won: items.filter((deal) => deal.outcome === 'won').reduce((sum, deal) => sum + deal.total, 0),
        lost: items.filter((deal) => deal.outcome === 'lost').reduce((sum, deal) => sum + deal.total, 0),
        pending: items.filter((deal) => deal.outcome === 'pending').reduce((sum, deal) => sum + deal.total, 0),
      };
    });

    return { pendingRevenue, wonRevenue, lostRevenue, averageTicket, wonThisMonth, delta, monthlyPipeline };
  }, [deals, today]);

  const projectInsights = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status !== 'Livré');
    const atRisk = projects.filter((project) => project.health !== 'Vert' || ((parseDate(project.endDate)?.getTime() ?? Infinity) < today.getTime() && project.status !== 'Livré'));
    const budgetEngaged = projects.reduce((sum, project) => sum + project.budget, 0);
    const delivered30d = projects.filter((project) => project.status === 'Livré' && isWithinDays(project.endDate, today, 30)).length;
    const portfolio = projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      const completed = projectTasks.filter((task) => task.state === 'Terminé').length;
      const progress = projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0;
      const owner = internalUsers.find((user) => user.id === project.ownerId);
      return { project, totalTasks: projectTasks.length, completed, progress, owner };
    });
    return { activeProjects, atRisk, budgetEngaged, delivered30d, portfolio };
  }, [internalUsers, projects, tasks, today]);

  const taskInsights = useMemo(() => {
    const openTasks = tasks.filter((task) => task.state !== 'Terminé');
    const completed7d = tasks.filter((task) => task.state === 'Terminé' && isWithinDays(task.completedAt, today, 7)).length;
    const overdue = tasks.filter((task) => task.state !== 'Terminé' && (parseDate(task.dueDate)?.getTime() ?? Infinity) < today.getTime()).length;
    const estimatedOpenHours = openTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const byOwner = internalUsers.map((user) => {
      const ownerTasks = tasks.filter((task) => task.ownerId === user.id);
      return {
        user,
        open: ownerTasks.filter((task) => task.state !== 'Terminé').length,
        completedThisWeek: ownerTasks.filter((task) => task.state === 'Terminé' && (parseDate(task.completedAt)?.getTime() ?? 0) >= startOfWeek(today).getTime()).length,
        createdThisWeek: ownerTasks.filter((task) => (parseDate(task.createdAt)?.getTime() ?? 0) >= startOfWeek(today).getTime()).length,
        overdue: ownerTasks.filter((task) => task.state !== 'Terminé' && (parseDate(task.dueDate)?.getTime() ?? Infinity) < today.getTime()).length,
      };
    });
    return { openTasks: openTasks.length, completed7d, overdue, estimatedOpenHours, byOwner };
  }, [internalUsers, tasks, today]);

  const userInsights = useMemo(() => {
    const sortedByCompleted = [...taskInsights.byOwner].sort((a, b) => b.completedThisWeek - a.completedThisWeek);
    const sortedByCreated = [...taskInsights.byOwner].sort((a, b) => b.createdThisWeek - a.createdThisWeek);
    const sortedByOpen = [...taskInsights.byOwner].sort((a, b) => b.open - a.open);
    const sortedByOverdue = [...taskInsights.byOwner].sort((a, b) => b.overdue - a.overdue);
    return {
      bestCloser: sortedByCompleted[0] ?? null,
      bestCreator: sortedByCreated[0] ?? null,
      heaviestLoad: sortedByOpen[0] ?? null,
      mostOverdue: sortedByOverdue[0] ?? null,
      scoreboard: taskInsights.byOwner,
    };
  }, [taskInsights.byOwner]);

  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setParams({ section: section.key })}
                className={`flex min-w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-medium ${isActive ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
              >
                <Icon className="h-5 w-5" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-6">
        {activeSection === 'contacts' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Leads actifs" value={String(contactInsights.leads)} icon={Users} isDark={isDark} />
              <MetricCard label="Nouveaux leads 30j" value={String(contactInsights.newLeads30d)} icon={Sparkles} isDark={isDark} />
              <MetricCard label="Taux de transformation" value={formatPercent(contactInsights.conversionRate)} icon={TrendingUp} isDark={isDark} />
              <MetricCard label="Relances à faire" value={String(contactInsights.staleLeads)} icon={TriangleAlert} isDark={isDark} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <Panel title="Acquisition des leads" isDark={isDark}>
                <BarList
                  isDark={isDark}
                  items={contactInsights.acquisition.map((item) => ({
                    label: item.label,
                    value: item.value,
                    suffix: 'lead(s)',
                  }))}
                />
              </Panel>

              <Panel title="Comptes multi-contacts" isDark={isDark}>
                <div className="space-y-3">
                  {contactInsights.multiContacts.map((item) => (
                    <div key={item.company.id} className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.company.name}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600'}`}>{item.count} contacts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}

        {activeSection === 'deals' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="CA en attente" value={formatCurrency(dealInsights.pendingRevenue)} icon={Clock3} isDark={isDark} />
              <MetricCard label="CA gagné" value={formatCurrency(dealInsights.wonRevenue)} icon={CheckCircle2} isDark={isDark} />
              <MetricCard label="CA perdu" value={formatCurrency(dealInsights.lostRevenue)} icon={TriangleAlert} isDark={isDark} />
              <MetricCard label="Panier moyen" value={formatCurrency(dealInsights.averageTicket)} icon={Briefcase} isDark={isDark} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <Panel title="Pipe commercial par mois" isDark={isDark}>
                <div className="space-y-4">
                  {dealInsights.monthlyPipeline.map((month) => {
                    const maxValue = Math.max(month.won, month.pending, month.lost, 1);
                    return (
                      <div key={month.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{month.label}</span>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                            {formatCurrency(month.won + month.pending + month.lost)}
                          </span>
                        </div>
                        <StackedBar isDark={isDark} won={month.won / maxValue} pending={month.pending / maxValue} lost={month.lost / maxValue} />
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Lecture période" isDark={isDark}>
                <div className="space-y-4">
                  <SummaryLine label="Gagné ce mois" value={formatCurrency(dealInsights.wonThisMonth)} isDark={isDark} />
                  <SummaryLine label="Variation vs mois précédent" value={formatPercent(dealInsights.delta)} isDark={isDark} positive={dealInsights.delta >= 0} />
                  <SummaryLine label="Volume en attente" value={formatCurrency(dealInsights.pendingRevenue)} isDark={isDark} />
                </div>
              </Panel>
            </div>
          </>
        )}

        {activeSection === 'projects' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Projets actifs" value={String(projectInsights.activeProjects.length)} icon={FolderOpen} isDark={isDark} />
              <MetricCard label="Projets à risque" value={String(projectInsights.atRisk.length)} icon={TriangleAlert} isDark={isDark} />
              <MetricCard label="Budget engagé" value={formatCurrency(projectInsights.budgetEngaged)} icon={Briefcase} isDark={isDark} />
              <MetricCard label="Livrés 30j" value={String(projectInsights.delivered30d)} icon={CheckCircle2} isDark={isDark} />
            </div>

            <Panel title="Portefeuille projets" isDark={isDark}>
              <div className="space-y-4">
                {projectInsights.portfolio.map((item) => (
                  <div key={item.project.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50'}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{item.project.title}</p>
                          <HealthBadge health={item.project.health} />
                        </div>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.project.startDate} au {item.project.endDate}</p>
                      </div>
                      {item.owner && <UserBadge user={item.owner} />}
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span>{item.completed}/{item.totalTasks} tâches terminées</span>
                        <span>{formatPercent(item.progress)}</span>
                      </div>
                      <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {activeSection === 'tasks' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Tâches ouvertes" value={String(taskInsights.openTasks)} icon={ClipboardList} isDark={isDark} />
              <MetricCard label="Terminées 7j" value={String(taskInsights.completed7d)} icon={CheckCircle2} isDark={isDark} />
              <MetricCard label="En retard" value={String(taskInsights.overdue)} icon={TriangleAlert} isDark={isDark} />
              <MetricCard label="Charge planifiée" value={`${taskInsights.estimatedOpenHours}h`} icon={CalendarDays} isDark={isDark} />
            </div>

            <Panel title="Débit opérationnel par propriétaire" isDark={isDark}>
              <div className="space-y-3">
                {taskInsights.byOwner.map((item) => (
                  <div key={item.user.id} className={`rounded-xl p-4 ${isDark ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <UserBadge user={item.user} />
                      <div className="flex flex-wrap gap-2 text-xs">
                        <InlinePill label={`${item.completedThisWeek} terminées`} isDark={isDark} />
                        <InlinePill label={`${item.createdThisWeek} créées`} isDark={isDark} />
                        <InlinePill label={`${item.overdue} retards`} isDark={isDark} warning={item.overdue > 0} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {activeSection === 'users' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Top clôtureur semaine" value={userInsights.bestCloser ? userInsights.bestCloser.user.firstName : '-'} icon={CheckCircle2} isDark={isDark} />
              <MetricCard label="Top créateur semaine" value={userInsights.bestCreator ? userInsights.bestCreator.user.firstName : '-'} icon={Sparkles} isDark={isDark} />
              <MetricCard label="Charge la plus forte" value={userInsights.heaviestLoad ? `${userInsights.heaviestLoad.open} tâches` : '-'} icon={Briefcase} isDark={isDark} />
              <MetricCard label="Retards à traiter" value={userInsights.mostOverdue ? `${userInsights.mostOverdue.overdue} tâches` : '0'} icon={TriangleAlert} isDark={isDark} />
            </div>

            <Panel title="Scoreboard équipe" isDark={isDark}>
              <div className="space-y-3">
                {userInsights.scoreboard.map((item) => (
                  <div key={item.user.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50'}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <UserBadge user={item.user} />
                      <div className="grid grid-cols-2 gap-2 text-sm md:flex md:flex-wrap">
                        <InlinePill label={`${item.completedThisWeek} terminées`} isDark={isDark} />
                        <InlinePill label={`${item.createdThisWeek} créées`} isDark={isDark} />
                        <InlinePill label={`${item.open} ouvertes`} isDark={isDark} />
                        <InlinePill label={`${item.overdue} retards`} isDark={isDark} warning={item.overdue > 0} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {activeSection === 'rag' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Requêtes semaine" value="132" icon={Bot} isDark={isDark} />
              <MetricCard label="Taux de réponse utile" value="91%" icon={CheckCircle2} isDark={isDark} />
              <MetricCard label="Questions sans réponse" value="12" icon={TriangleAlert} isDark={isDark} />
              <MetricCard label="Temps moyen" value="18 sec" icon={Sparkles} isDark={isDark} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Panel title="Données les plus recherchées" isDark={isDark}>
                <BarList
                  isDark={isDark}
                  items={ragUsageSample.map((item) => ({
                    label: item.label,
                    value: item.count,
                    suffix: `requêtes • ${item.trend}`,
                  }))}
                />
              </Panel>

              <Panel title="KPI à brancher au vrai RAG" isDark={isDark}>
                <div className="space-y-3 text-sm">
                  <InlinePill label="Top intentions: avancement, deadline, budget, responsable" isDark={isDark} />
                  <InlinePill label="Taux de requêtes sur tâches en retard" isDark={isDark} />
                  <InlinePill label="Recherches sans donnée exploitable" isDark={isDark} warning />
                  <InlinePill label="Projets les plus interrogés par les équipes" isDark={isDark} />
                </div>
              </Panel>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  isDark,
}: {
  label: string;
  value: string;
  icon: typeof LayoutDashboard;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <div className={`rounded-xl p-2 ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, isDark, children }: { title: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function BarList({
  items,
  isDark,
}: {
  items: Array<{ label: string; value: number; suffix: string }>;
  isDark: boolean;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{item.label}</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {item.value} {item.suffix}
            </span>
          </div>
          <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedBar({ won, pending, lost, isDark }: { won: number; pending: number; lost: number; isDark: boolean }) {
  return (
    <div className={`flex h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
      <div className="bg-emerald-500" style={{ width: `${won * 100}%` }} />
      <div className="bg-amber-400" style={{ width: `${pending * 100}%` }} />
      <div className="bg-rose-500" style={{ width: `${lost * 100}%` }} />
    </div>
  );
}

function SummaryLine({
  label,
  value,
  isDark,
  positive,
}: {
  label: string;
  value: string;
  isDark: boolean;
  positive?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-4 ${isDark ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
      <span className={`font-semibold ${positive === undefined ? '' : positive ? 'text-emerald-500' : 'text-rose-500'}`}>{value}</span>
    </div>
  );
}

function InlinePill({ label, isDark, warning = false }: { label: string; isDark: boolean; warning?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1.5 ${warning ? isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}`}>
      {label}
    </span>
  );
}

function HealthBadge({ health }: { health: 'Vert' | 'Attention' | 'Critique' }) {
  const className =
    health === 'Vert'
      ? 'bg-emerald-100 text-emerald-700'
      : health === 'Attention'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-700';

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{health}</span>;
}
