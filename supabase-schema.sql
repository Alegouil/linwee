-- Supabase schema for Linwe

create table if not exists users (
  id text primary key,
  firstname text not null,
  lastname text not null,
  name text not null,
  email text not null unique,
  role text not null,
  kind text not null,
  jobtitle text,
  phone text,
  color text,
  avatar text,
  createdat text not null,
  archivedat text
);

create table if not exists companies (
  id text primary key,
  name text not null,
  address text,
  postalcode text,
  city text,
  phone text,
  siret text,
  category text not null,
  createdat text not null,
  acquisitionchannel text not null,
  archivedat text
);

create table if not exists contacts (
  id text primary key,
  civility text not null,
  firstname text not null,
  lastname text not null,
  category text not null,
  phone text,
  secondaryphone text,
  secondaryphonelabel text,
  email text not null,
  companyid text references companies(id),
  createdat text not null,
  acquisitionchannel text not null,
  lastinteractionat text not null,
  archivedat text
);

create table if not exists deals (
  id text primary key,
  title text not null,
  clientid text references contacts(id),
  status text not null,
  date text not null,
  amount numeric not null,
  createdat text not null,
  expectedclosedate text not null,
  closedat text,
  outcome text not null,
  description text,
  notes text,
  lines jsonb not null default '[]',
  archivedat text
);

create table if not exists projects (
  id text primary key,
  title text not null,
  projecttype text not null,
  dealid text references deals(id),
  ownerid text references users(id),
  status text not null,
  startdate text not null,
  enddate text not null,
  budget numeric not null,
  health text not null,
  tasks jsonb not null default '[]',
  archivedat text
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  ownerid text references users(id),
  projectid text references projects(id),
  parenttaskid text references tasks(id),
  "order" integer not null,
  state text not null,
  duedate text not null,
  priority text not null,
  category text not null,
  createdat text not null,
  completedat text,
  estimatedhours integer not null,
  description text,
  checklist jsonb not null default '[]',
  archivedat text
);

create table if not exists task_comments (
  id text primary key,
  taskid text references tasks(id),
  authorid text references users(id),
  content text not null,
  createdat text not null,
  mentionuserids text[] not null default '{}',
  archivedat text
);

create table if not exists notifications (
  id text primary key,
  userid text references users(id),
  "type" text not null,
  taskid text references tasks(id),
  commentid text references task_comments(id),
  title text not null,
  body text not null,
  createdat text not null,
  read boolean not null default false,
  archivedat text
);

alter table users add column if not exists archivedat text;
alter table companies add column if not exists archivedat text;
alter table contacts add column if not exists archivedat text;
alter table deals add column if not exists archivedat text;
alter table projects add column if not exists archivedat text;
alter table tasks add column if not exists archivedat text;
alter table task_comments add column if not exists archivedat text;
alter table notifications add column if not exists archivedat text;

create table if not exists app_settings (
  id text primary key,
  dealstatuses text[] not null default '{}',
  dealstatuscolors jsonb not null default '{}',
  projectstatuses text[] not null default '{}',
  projectstatuscolors jsonb not null default '{}',
  projecttypes text[] not null default '{}',
  projecttypecolors jsonb not null default '{}',
  taskstates text[] not null default '{}',
  taskstatecolors jsonb not null default '{}',
  taskpriorities text[] not null default '{}',
  taskprioritycolors jsonb not null default '{}',
  taskcategories text[] not null default '{}',
  taskcategorycolors jsonb not null default '{}'
);

alter table projects add column if not exists projecttype text;
update projects set projecttype = 'Site vitrine' where projecttype is null;
alter table projects alter column projecttype set not null;

alter table tasks add column if not exists category text;
update tasks set category = 'Coordination' where category is null;
alter table tasks alter column category set not null;

alter table app_settings add column if not exists dealstatuscolors jsonb not null default '{}';
alter table app_settings add column if not exists projectstatuscolors jsonb not null default '{}';
alter table app_settings add column if not exists projecttypecolors jsonb not null default '{}';
alter table app_settings add column if not exists taskstatecolors jsonb not null default '{}';
alter table app_settings add column if not exists taskprioritycolors jsonb not null default '{}';
alter table app_settings add column if not exists taskcategories text[] not null default '{}';
alter table app_settings add column if not exists taskcategorycolors jsonb not null default '{}';

alter table users enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table notifications enable row level security;
alter table app_settings enable row level security;

drop policy if exists "authenticated users can select users" on users;
create policy "authenticated users can select users" on users
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert users" on users;
create policy "authenticated users can insert users" on users
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update users" on users;
create policy "authenticated users can update users" on users
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete users" on users;
create policy "authenticated users can delete users" on users
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select companies" on companies;
create policy "authenticated users can select companies" on companies
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert companies" on companies;
create policy "authenticated users can insert companies" on companies
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update companies" on companies;
create policy "authenticated users can update companies" on companies
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete companies" on companies;
create policy "authenticated users can delete companies" on companies
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select contacts" on contacts;
create policy "authenticated users can select contacts" on contacts
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert contacts" on contacts;
create policy "authenticated users can insert contacts" on contacts
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update contacts" on contacts;
create policy "authenticated users can update contacts" on contacts
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete contacts" on contacts;
create policy "authenticated users can delete contacts" on contacts
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select deals" on deals;
create policy "authenticated users can select deals" on deals
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert deals" on deals;
create policy "authenticated users can insert deals" on deals
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update deals" on deals;
create policy "authenticated users can update deals" on deals
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete deals" on deals;
create policy "authenticated users can delete deals" on deals
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select projects" on projects;
create policy "authenticated users can select projects" on projects
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert projects" on projects;
create policy "authenticated users can insert projects" on projects
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update projects" on projects;
create policy "authenticated users can update projects" on projects
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete projects" on projects;
create policy "authenticated users can delete projects" on projects
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select tasks" on tasks;
create policy "authenticated users can select tasks" on tasks
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert tasks" on tasks;
create policy "authenticated users can insert tasks" on tasks
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update tasks" on tasks;
create policy "authenticated users can update tasks" on tasks
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete tasks" on tasks;
create policy "authenticated users can delete tasks" on tasks
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select task_comments" on task_comments;
create policy "authenticated users can select task_comments" on task_comments
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert task_comments" on task_comments;
create policy "authenticated users can insert task_comments" on task_comments
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update task_comments" on task_comments;
create policy "authenticated users can update task_comments" on task_comments
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete task_comments" on task_comments;
create policy "authenticated users can delete task_comments" on task_comments
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select notifications" on notifications;
create policy "authenticated users can select notifications" on notifications
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert notifications" on notifications;
create policy "authenticated users can insert notifications" on notifications
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update notifications" on notifications;
create policy "authenticated users can update notifications" on notifications
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete notifications" on notifications;
create policy "authenticated users can delete notifications" on notifications
for delete to authenticated
using (true);

drop policy if exists "authenticated users can select app_settings" on app_settings;
create policy "authenticated users can select app_settings" on app_settings
for select to authenticated
using (true);

drop policy if exists "authenticated users can insert app_settings" on app_settings;
create policy "authenticated users can insert app_settings" on app_settings
for insert to authenticated
with check (true);

drop policy if exists "authenticated users can update app_settings" on app_settings;
create policy "authenticated users can update app_settings" on app_settings
for update to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete app_settings" on app_settings;
create policy "authenticated users can delete app_settings" on app_settings
for delete to authenticated
using (true);
