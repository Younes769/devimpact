-- Create the registrations table
create table if not exists public.registrations (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  email text not null,
  year_of_study text not null,
  has_team text not null,
  team_name text,
  team_members text[],
  experience_level text not null,
  skills text[] not null,
  other_skills text,
  additional_notes text,
  status text default 'pending',
  registered_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create an index on email for faster lookups
create index if not exists registrations_email_idx on public.registrations (email);

-- Enable Row Level Security
alter table public.registrations enable row level security;

-- Create policies
create policy "Enable insert access for all users" on public.registrations
  for insert with check (true);

create policy "Enable read access for authenticated users only" on public.registrations
  for select using (auth.role() = 'authenticated');

-- Create a function to update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create a trigger to automatically update the updated_at column
create trigger set_updated_at
  before update on public.registrations
  for each row
  execute function public.handle_updated_at(); 