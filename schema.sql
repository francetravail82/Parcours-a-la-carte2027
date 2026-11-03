-- =====================================================
-- CHASSE AU TRÉSOR – Base de données Supabase
-- À coller UNE FOIS dans Supabase > SQL Editor > Run
-- =====================================================

-- ---------- Tables ----------
create table if not exists public.establishments (
  id         text primary key,                 -- identifiant court, ex. "monsieur"
  name       text not null,
  address    text not null,
  website    text,
  lat        double precision,                 -- rempli automatiquement depuis l'adresse
  lng        double precision,
  photo_url  text,                             -- facultatif (lien d'image)
  created_at timestamptz default now()
);

create table if not exists public.parcours (
  id         integer generated always as identity primary key,
  title      text not null,
  position   integer not null default 1,       -- ordre d'affichage sur l'accueil
  active     boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.steps (
  id               uuid primary key default gen_random_uuid(),
  parcours_id      integer not null references public.parcours(id) on delete cascade,
  position         integer not null,           -- ordre dans le parcours
  establishment_id text not null references public.establishments(id) on delete restrict,
  question         text not null,
  accept           text[] not null,            -- réponses acceptées
  hint             text
);

create table if not exists public.settings (
  key   text primary key,
  value text
);

create table if not exists public.admins (
  email text primary key
);

-- ---------- Sécurité ----------
-- Est administrateur : adresse @francetravail.fr ET présente dans la liste "admins".
-- L'adresse vient du jeton de connexion (lien magique), elle ne peut pas être falsifiée.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@francetravail.fr'
  );
$$;

alter table public.establishments enable row level security;
alter table public.parcours       enable row level security;
alter table public.steps          enable row level security;
alter table public.settings       enable row level security;
alter table public.admins         enable row level security;

-- Lecture publique (le site lit sans connexion)
create policy "lecture publique" on public.establishments for select using (true);
create policy "lecture publique" on public.parcours       for select using (true);
create policy "lecture publique" on public.steps          for select using (true);
create policy "lecture publique" on public.settings       for select using (true);

-- Écriture réservée aux administrateurs
create policy "admin ecrit" on public.establishments for all using (public.is_admin()) with check (public.is_admin());
create policy "admin ecrit" on public.parcours       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin ecrit" on public.steps          for all using (public.is_admin()) with check (public.is_admin());
create policy "admin ecrit" on public.settings       for all using (public.is_admin()) with check (public.is_admin());

-- La liste des admins n'est visible et modifiable que par les admins
create policy "admin gere admins" on public.admins for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Premier administrateur ----------
-- ⚠️ REMPLACER par l'adresse du premier collègue (pas la tienne si tu pars à Rennes)
insert into public.admins (email) values ('prenom.nom@francetravail.fr')
on conflict do nothing;

-- ---------- Paramètres ----------
insert into public.settings (key, value) values
  ('duration_minutes', '50'),
  ('rallying_point',   '')
on conflict do nothing;

-- ---------- Données actuelles (Saint-Malo intra-muros) ----------
insert into public.establishments (id, name, address, website, lat, lng) values
  ('monsieur',    'Monsieur Madame',          '2 rue de Dinan, 35400 Saint-Malo',            'https://monsieurmadamebrasserie.com/fr', 48.64652164024668, -2.0263622722532184),
  ('armoricaine', 'La Brasserie Armoricaine', '6 rue du Boyer, 35400 Saint-Malo',            'https://www.hotel-armoricaine.com/',     48.6490533769641,  -2.0273456587614365),
  ('ginette',     'Le Croiseur Ginette',      '2 place de la Poissonnerie, 35400 Saint-Malo','https://www.lecroiseur-ginette.com/',    48.64973426972223, -2.024604330109633),
  ('cavoua',      'Cavoua Coffee Spot',       '3 rue des Orbettes, 35400 Saint-Malo',        'https://bonjour.cavoua.fr/summer',       48.65025552662146, -2.0239766293855572),
  ('cambusier',   'Le Cambusier',             '6 rue des Cordiers, 35400 Saint-Malo',        'https://www.cambusier.fr/',              48.64801544576959, -2.024409816433667)
on conflict do nothing;

insert into public.parcours (title, position) values ('Parcours numéro 1', 1), ('Parcours numéro 2', 2);

-- Parcours 1
insert into public.steps (parcours_id, position, establishment_id, question, accept, hint)
select p.id, v.pos, v.est, v.q, v.acc, v.h
from public.parcours p
join (values
  (1, 1, 'monsieur',    'Quel est le plat emblématique de l''Ille-et-Vilaine ?',         array['galette saucisse'],                    'Ça se mange avec les doigts, et c''est une crêpe de sarrasin roulée autour d''une saucisse grillée.'),
  (1, 2, 'armoricaine', 'Comment s''appelle la muraille qui entoure la vieille ville ?', array['remparts','rempart'],                   'On peut en faire le tour à pied : environ 2 km au-dessus de la mer.'),
  (1, 3, 'ginette',     'Comment s''appelle le palais de Saint-Malo ?',                  array['palais du grand large','grand large'], 'Son nom parle d''horizons lointains et d''océan…'),
  (1, 4, 'cavoua',      'Comment s''appelle la fête foraine de Saint-Malo ?',            array['sainte ouine','la sainte ouine'],      'Elle porte le nom d''une sainte… qui n''existe pas vraiment !'),
  (1, 5, 'cambusier',   'Quel animal est l''emblème de la Bretagne ?',                   array['hermine','l''hermine'],                'Son pelage blanc, moucheté de noir, figure sur le drapeau breton (le Gwenn-ha-du).')
) as v(pn, pos, est, q, acc, h) on v.pn = p.position;

-- Parcours 2
insert into public.steps (parcours_id, position, establishment_id, question, accept, hint)
select p.id, v.pos, v.est, v.q, v.acc, v.h
from public.parcours p
join (values
  (2, 1, 'monsieur',    'Quel est le plat emblématique de l''Ille-et-Vilaine ?',         array['galette saucisse'],                    'Ça se mange avec les doigts, et c''est une crêpe de sarrasin roulée autour d''une saucisse grillée.'),
  (2, 2, 'cambusier',   'Quel animal est l''emblème de la Bretagne ?',                   array['hermine','l''hermine'],                'Son pelage blanc, moucheté de noir, figure sur le drapeau breton (le Gwenn-ha-du).'),
  (2, 3, 'cavoua',      'Comment s''appelle la fête foraine de Saint-Malo ?',            array['sainte ouine','la sainte ouine'],      'Elle porte le nom d''une sainte… qui n''existe pas vraiment !'),
  (2, 4, 'ginette',     'Qui est le corsaire le plus connu de Saint-Malo ?',             array['surcouf','robert surcouf'],            'Il a capturé le navire anglais « Kent » en 1800.'),
  (2, 5, 'armoricaine', 'Comment s''appelle la muraille qui entoure la vieille ville ?', array['remparts','rempart'],                   'On peut en faire le tour à pied : environ 2 km au-dessus de la mer.')
) as v(pn, pos, est, q, acc, h) on v.pn = p.position;
