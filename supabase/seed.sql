-- ==============================================================================
-- CineTrack - Seed Community Movies
-- How to run:
-- 1. Open your Supabase Project Dashboard
-- 2. Go to the SQL Editor tab on the left menu
-- 3. Click 'New query', paste this entire file, and click 'Run'
-- ==============================================================================

do $$
declare
  target_user_id uuid;
begin
  -- Use existing user from auth.users (anonymous guest or registered user)
  select id into target_user_id from auth.users order by created_at asc limit 1;

  if target_user_id is null then
    raise notice 'No user found in auth.users. Please open CineTrack once in your browser to create your anonymous guest user, then rerun this seed script.';
    return;
  end if;

  insert into public.custom_movies (
    id, created_by, title, release_year, synopsis, genre_ids, runtime, director, cast_names
  ) values
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c01',
    target_user_id,
    'Echoes of the Void',
    2024,
    'A lone astrophysicist intercepting deep space transmissions stumbles upon a signal echoing memories from his past life, leading to an extraordinary revelation about humanity’s place in the cosmos.',
    array[878, 18, 9648],
    118,
    'Elena Rostova',
    array['David Oyelowo', 'Rebecca Hall', 'Hiroshi Abe']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c02',
    target_user_id,
    'The Jakarta Midnight Express',
    2023,
    'A neon-soaked noir thriller following an undercover courier trapped in Jakarta’s nocturnal labyrinth after a high-stakes delivery goes fatally wrong.',
    array[28, 53, 80],
    104,
    'Raka Fakhrezi',
    array['Iko Uwais', 'Tara Basro', 'Joe Taslim']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c03',
    target_user_id,
    'Whispers in the Pine',
    2024,
    'In an isolated mountain observatory in Northern Hokkaido, two researchers discover that the forest around them is transmitting harmonic frequencies that alter reality itself.',
    array[27, 9648, 878],
    96,
    'Kenji Mizoguchi Jr.',
    array['Koji Yakusho', 'Rinko Kikuchi']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c04',
    target_user_id,
    'Coffee, Code & Rain',
    2023,
    'A warm, witty slice-of-life comedy about three aspiring indie game developers working out of a vintage cafe in Bandung during the rainy monsoon season.',
    array[35, 18, 10749],
    112,
    'Aisyah Rahma',
    array['Reza Rahadian', 'Laura Basuki', 'Chicco Jerikho']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c05',
    target_user_id,
    'Chronicles of the Sunken Kingdom',
    2024,
    'An animated fantasy adventure chronicling a young navigator’s quest to retrieve the lost star compass beneath the Coral Seas before the eternal eclipse.',
    array[16, 12, 14, 10751],
    98,
    'Mira Santoso',
    array['Maudy Ayunda', 'Nicholas Saputra']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c06',
    target_user_id,
    'Shadows of the Citadel',
    2022,
    'During the twilight of an ancient dynasty, a disgraced royal guard must escort a mysterious cartographer across treacherous rebel territory.',
    array[28, 36, 18],
    134,
    'Bao Nguyen',
    array['Tony Leung', 'Donnie Yen', 'Michelle Yeoh']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c07',
    target_user_id,
    'The Last Analog Melody',
    2024,
    'In a future where all music is synthesized by algorithmic neural nets, an aging sound technician and a rogue singer search for the final surviving vinyl pressing on Earth.',
    array[18, 10402, 878],
    108,
    'Lucas Vance',
    array['Oscar Isaac', 'Florence Pugh']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c08',
    target_user_id,
    'Paper Dragons',
    2023,
    'A heartwarming coming-of-age story about a young girl in suburban Yogyakarta who enters a traditional kite tournament to honor her grandfather’s memory.',
    array[18, 10751],
    95,
    'Fajar Nugros',
    array['Putri Marino', 'Slamet Rahardjo']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c09',
    target_user_id,
    'Orbit 99',
    2024,
    'Tensions ignite aboard an orbital refueling station on the outer edge of Mars when an unexpected distress capsule carrying a biological artifact docks during a solar flare.',
    array[878, 53],
    102,
    'Claire Delacroix',
    array['Daniel Kaluuya', 'Lea Seydoux']
  ),
  (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c10',
    target_user_id,
    'Midnight in Malioboro',
    2023,
    'Two strangers from opposite sides of the world cross paths during a surreal midnight walk through the vibrant alleys of Yogyakarta, sharing secrets they have never told anyone else.',
    array[10749, 18],
    105,
    'Hanung Bramantyo',
    array['Adipati Dolken', 'Amanda Rawles']
  )
  on conflict (id) do update set
    title = excluded.title,
    synopsis = excluded.synopsis,
    release_year = excluded.release_year,
    genre_ids = excluded.genre_ids,
    runtime = excluded.runtime,
    director = excluded.director,
    cast_names = excluded.cast_names;

  raise notice 'Successfully seeded 10 community movies into custom_movies!';
end $$;

