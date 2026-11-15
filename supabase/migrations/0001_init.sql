begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text check(char_length(display_name)<=80),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.custom_movies (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id),
 title text not null check(char_length(btrim(title)) between 1 and 150),
 title_key text generated always as (lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))) stored,
 release_year integer not null check(release_year between 1888 and 2031),
 synopsis text not null check(char_length(btrim(synopsis)) between 10 and 2000),
 genre_ids integer[] not null check(cardinality(genre_ids) between 1 and 19 and array_position(genre_ids,null) is null and genre_ids <@ array[28,12,16,35,80,99,18,10751,14,36,27,10402,9648,10749,878,10770,53,10752,37]),
 runtime integer check(runtime between 1 and 600), director text check(char_length(director)<=150),
 cast_names text[] not null default '{}' check(cardinality(cast_names)<=10),
 trailer_url text check(char_length(trailer_url)<=500 and trailer_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),
 poster_path text check(poster_path is null or poster_path like created_by::text || '/' || id::text || '/%'),
 backdrop_path text check(backdrop_path is null or backdrop_path like created_by::text || '/' || id::text || '/%'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index custom_owner_title_year on public.custom_movies(created_by,title_key,release_year) where deleted_at is null;
create index custom_recent on public.custom_movies(created_at desc,id desc) where deleted_at is null;
create index custom_genres on public.custom_movies using gin(genre_ids);
create table public.shelf_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 tmdb_id bigint check(tmdb_id>0 and tmdb_id<=9007199254740991), custom_movie_id uuid references public.custom_movies(id) on delete restrict,
 movie_key text generated always as (case when tmdb_id is not null then 'tmdb:' || tmdb_id::text else 'custom:' || custom_movie_id::text end) stored,
 snapshot jsonb check(snapshot is null or (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=8192)),
 status text not null default 'planned' check(status in ('planned','watching','completed','dropped')),
 personal_rating smallint check(personal_rating between 1 and 5), review text not null default '' check(char_length(review)<=1000),
 completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((tmdb_id is null)<>(custom_movie_id is null)), check((status='completed')=(completed_at is not null)), unique(user_id,movie_key)
);
create index shelf_user_updated on public.shelf_items(user_id,updated_at desc);
create function public.guard_record() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.created_at<>old.created_at then raise exception 'Identity is immutable'; end if;
  if TG_TABLE_NAME='custom_movies' then
   if new.created_by<>old.created_by or old.deleted_at is not null then raise exception 'Owner and tombstones are immutable'; end if;
  elsif TG_TABLE_NAME='shelf_items' then
   if new.user_id<>old.user_id or new.tmdb_id is distinct from old.tmdb_id or new.custom_movie_id is distinct from old.custom_movie_id then raise exception 'Shelf source and owner are immutable'; end if;
  end if;
 end if;
 if TG_TABLE_NAME='custom_movies' then
  if exists(select 1 from unnest(new.cast_names) n where n is null or char_length(n)>100) then raise exception 'Invalid cast name'; end if;
 elsif TG_TABLE_NAME='shelf_items' then
  if new.completed_at>now() then raise exception 'Completion cannot be in the future'; end if;
  if new.tmdb_id is not null and new.snapshot is not null then raise exception 'TMDB snapshots are disabled until retention terms are verified'; end if;
  if new.snapshot is not null and exists(select 1 from jsonb_object_keys(new.snapshot) k where k not in ('title','year','genreIds','posterPath')) then raise exception 'Unsupported snapshot field'; end if;
 end if;
 new.updated_at=now();return new;
end $$;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.guard_record();
create trigger movies_guard before insert or update on public.custom_movies for each row execute function public.guard_record();
create trigger shelf_guard before insert or update on public.shelf_items for each row execute function public.guard_record();
alter table public.profiles enable row level security;
alter table public.custom_movies enable row level security;
alter table public.shelf_items enable row level security;
create policy profile_read on public.profiles for select to authenticated using((select auth.uid())=id);
create policy profile_insert on public.profiles for insert to authenticated with check((select auth.uid())=id);
create policy profile_update on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy movies_public_read on public.custom_movies for select to anon,authenticated using(deleted_at is null);
create policy movies_owner_read on public.custom_movies for select to authenticated using((select auth.uid())=created_by);
create policy movies_insert on public.custom_movies for insert to authenticated with check((select auth.uid())=created_by and deleted_at is null);
create policy movies_update on public.custom_movies for update to authenticated using((select auth.uid())=created_by and deleted_at is null) with check((select auth.uid())=created_by);
create policy shelf_read on public.shelf_items for select to authenticated using((select auth.uid())=user_id);
create policy shelf_insert on public.shelf_items for insert to authenticated with check((select auth.uid())=user_id and (custom_movie_id is null or exists(select 1 from public.custom_movies m where m.id=custom_movie_id and m.deleted_at is null)));
create policy shelf_update on public.shelf_items for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy shelf_delete on public.shelf_items for delete to authenticated using((select auth.uid())=user_id);
revoke all on public.profiles,public.custom_movies,public.shelf_items from anon,authenticated;
grant select on public.custom_movies to anon;
grant select,insert,update on public.custom_movies,public.profiles to authenticated;
grant select,insert,update,delete on public.shelf_items to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('movie-posters','movie-posters',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy poster_insert on storage.objects for insert to authenticated with check(bucket_id='movie-posters' and (storage.foldername(name))[1]=(select auth.uid()::text) and array_length(storage.foldername(name),1)=2 and name ~ '\.(jpg|jpeg|png|webp)$');
create policy poster_owner_read on storage.objects for select to authenticated using(bucket_id='movie-posters' and (storage.foldername(name))[1]=(select auth.uid()::text) and owner_id=(select auth.uid()::text));
create policy poster_owner_delete on storage.objects for delete to authenticated using(bucket_id='movie-posters' and (storage.foldername(name))[1]=(select auth.uid()::text) and owner_id=(select auth.uid()::text));
commit;
