-- ==============================================================================
-- CineTrack - Seed Community Movies (26 Curated Films with Unsplash Posters)
-- How to run:
-- 1. Open your Supabase Project Dashboard
-- 2. Go to the SQL Editor tab on the left menu
-- 3. Click 'New query', paste this entire file, and click 'Run'
-- ==============================================================================

-- 1. Allow external HTTPS URLs for poster_path and backdrop_path
-- Note: In PostgreSQL/Supabase, multi-column check constraints without explicit names
-- were automatically named custom_movies_check and custom_movies_check1 in migration 0001_init.sql
alter table public.custom_movies drop constraint if exists custom_movies_check;
alter table public.custom_movies drop constraint if exists custom_movies_check1;
alter table public.custom_movies drop constraint if exists custom_movies_poster_path_check;
alter table public.custom_movies drop constraint if exists custom_movies_backdrop_path_check;
alter table public.custom_movies add constraint custom_movies_poster_path_check 
  check(poster_path is null or poster_path like created_by::text || '/' || id::text || '/%' or poster_path ~* '^https?://');
alter table public.custom_movies add constraint custom_movies_backdrop_path_check 
  check(backdrop_path is null or backdrop_path like created_by::text || '/' || id::text || '/%' or backdrop_path ~* '^https?://');

-- 2. Clean wipe existing community movie entries and shelf items referencing them
delete from public.shelf_items where custom_movie_id is not null;
delete from public.custom_movies;

-- 3. Insert 26 curated community movies
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users order by created_at asc limit 1;

  if target_user_id is null then
    raise notice 'No user found in auth.users. Please open CineTrack once in your browser to create your anonymous guest user, then rerun this seed script.';
    return;
  end if;

  insert into public.custom_movies (
    id, created_by, title, release_year, synopsis, genre_ids, runtime, director, cast_names, poster_path, backdrop_path
  ) values
  (
    'c1000000-0000-4000-8000-000000000001',
    target_user_id,
    'Echoes of the Void',
    2024,
    'A lone astrophysicist intercepting deep space transmissions stumbles upon a signal echoing memories from his past life, leading to an extraordinary revelation about humanity’s place in the cosmos.',
    array[878, 18, 9648],
    118,
    'Elena Rostova',
    array['David Oyelowo', 'Rebecca Hall', 'Hiroshi Abe'],
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    target_user_id,
    'The Jakarta Midnight Express',
    2023,
    'A neon-soaked noir thriller following an undercover courier trapped in Jakarta’s nocturnal labyrinth after a high-stakes delivery goes fatally wrong.',
    array[28, 53, 80],
    104,
    'Raka Fakhrezi',
    array['Iko Uwais', 'Tara Basro', 'Joe Taslim'],
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    target_user_id,
    'Whispers in the Pine',
    2024,
    'In an isolated mountain observatory in Northern Hokkaido, two researchers discover that the forest around them is transmitting harmonic frequencies that alter reality itself.',
    array[27, 9648, 878],
    96,
    'Kenji Mizoguchi Jr.',
    array['Koji Yakusho', 'Rinko Kikuchi'],
    'https://images.unsplash.com/photo-1511497584788-87676104235f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    target_user_id,
    'Coffee, Code & Rain',
    2023,
    'A warm, witty slice-of-life comedy about three aspiring indie game developers working out of a vintage cafe in Bandung during the rainy monsoon season.',
    array[35, 18, 10749],
    112,
    'Aisyah Rahma',
    array['Reza Rahadian', 'Laura Basuki', 'Chicco Jerikho'],
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000005',
    target_user_id,
    'Chronicles of the Sunken Kingdom',
    2024,
    'An animated fantasy adventure chronicling a young navigator’s quest to retrieve the lost star compass beneath the Coral Seas before the eternal eclipse.',
    array[16, 12, 14, 10751],
    98,
    'Mira Santoso',
    array['Maudy Ayunda', 'Nicholas Saputra'],
    'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000006',
    target_user_id,
    'Shadows of the Citadel',
    2022,
    'During the twilight of an ancient dynasty, a disgraced royal guard must escort a mysterious cartographer across treacherous rebel territory.',
    array[28, 36, 18],
    134,
    'Bao Nguyen',
    array['Tony Leung', 'Donnie Yen', 'Michelle Yeoh'],
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000007',
    target_user_id,
    'The Last Analog Melody',
    2024,
    'In a future where all music is synthesized by algorithmic neural nets, an aging sound technician and a rogue singer search for the final surviving vinyl pressing on Earth.',
    array[18, 10402, 878],
    108,
    'Lucas Vance',
    array['Oscar Isaac', 'Florence Pugh'],
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000008',
    target_user_id,
    'Paper Dragons',
    2023,
    'A heartwarming coming-of-age story about a young girl in suburban Yogyakarta who enters a traditional kite tournament to honor her grandfather’s memory.',
    array[18, 10751],
    95,
    'Fajar Nugros',
    array['Putri Marino', 'Slamet Rahardjo'],
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000009',
    target_user_id,
    'Orbit 99',
    2024,
    'Tensions ignite aboard an orbital refueling station on the outer edge of Mars when an unexpected distress capsule carrying a biological artifact docks during a solar flare.',
    array[878, 53],
    102,
    'Claire Delacroix',
    array['Daniel Kaluuya', 'Lea Seydoux'],
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000010',
    target_user_id,
    'Midnight in Malioboro',
    2023,
    'Two strangers from opposite sides of the world cross paths during a surreal midnight walk through the vibrant alleys of Yogyakarta, sharing secrets they have never told anyone else.',
    array[10749, 18],
    105,
    'Hanung Bramantyo',
    array['Adipati Dolken', 'Amanda Rawles'],
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000011',
    target_user_id,
    'Cyberpunk Nusantara: 2088',
    2025,
    'In a hyper-dense futuristic megalopolis sprawling across the Sunda Strait, a rogue cyber-detective investigates the sudden disappearance of humanity’s primary atmospheric synthesizer AI.',
    array[878, 28, 53],
    122,
    'Gareth Evans',
    array['Yayan Ruhian', 'Arifin Putra', 'Julie Estelle'],
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000012',
    target_user_id,
    'The Bromo Expedition',
    2024,
    'A team of vulcanologists and local guides brave an unexpected caldera awakening to retrieve climate data that could safeguard millions living across East Java.',
    array[12, 18, 53],
    110,
    'Joko Anwar',
    array['Ario Bayu', 'Marsha Timothy', 'Lukman Sardi'],
    'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000013',
    target_user_id,
    'Lullaby of the Deep',
    2023,
    'A marine biologist tracking whale migration songs uncovers an ancient rhythmic acoustic pulse resonating from the depths of the Mariana Trench.',
    array[9648, 53, 878],
    99,
    'Sarah Polley',
    array['Vicky Krieps', 'Alexander Skarsgard'],
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000014',
    target_user_id,
    'Pixel Heart',
    2024,
    'An endearing animated tale of an NPC in an abandoned 90s arcade cabinet who gains self-awareness and sets off on a quest across retro game worlds to save her power supply.',
    array[16, 35, 14, 10751],
    94,
    'Rich Moore',
    array['Ben Schwartz', 'Awkwafina', 'Jack Black'],
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000015',
    target_user_id,
    'The Secret of Borobudur',
    2023,
    'An ancient Sanskrit inscription deciphered by an Indonesian historian points to a hidden subterranean vault carved beneath the volcanic stone relief of Borobudur.',
    array[12, 9648, 36],
    116,
    'Riri Riza',
    array['Dian Sastrowardoyo', 'Abimana Aryasatya', 'Christine Hakim'],
    'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599818496337-642159048a60?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000016',
    target_user_id,
    'Night Market Chronicles',
    2024,
    'A spirited ensemble comedy following four rival street food stalls in a bustling Pasar Malam who must join forces when an eccentric corporate mall developer threatens to demolish their square.',
    array[35, 18, 10751],
    106,
    'Ernest Prakasa',
    array['Dion Wiyoko', 'Chew Kin Wah', 'Gisella Anastasia'],
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000017',
    target_user_id,
    'Neon Rain Over Shibuya',
    2024,
    'An amnesiac hacker and a seasoned Tokyo detective unravel a covert memory manipulation syndicate operating out of the labyrinthine back-alleys of Shibuya.',
    array[28, 80, 53],
    114,
    'Takashi Miike',
    array['Takeru Satoh', 'Masataka Kubota', 'Nana Komatsu'],
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000018',
    target_user_id,
    'The Java Sea Phantom',
    2023,
    'When a deep-sea salvage crew investigates a WW2 shipwreck off Bawean Island, they encounter an otherworldly phenomenon that traps their dive vessel in an inescapable temporal eddy.',
    array[27, 9648, 53],
    101,
    'Timo Tjahjanto',
    array['Bront Palarae', 'Asmara Abigail', 'Morgan Oey'],
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000019',
    target_user_id,
    'Rhythm of Bali',
    2022,
    'A gifted Balinese gamelan prodigy blends centuries-old sacred gong patterns with contemporary ambient modular synthesis, captivating global listeners while confronting cultural preservation.',
    array[18, 10402],
    107,
    'Garin Nugroho',
    array['I Made Sidia', 'Ayu Laksmi'],
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000020',
    target_user_id,
    'Quantum Paradox',
    2025,
    'After an experimental particle collider in Geneva ruptures the causal membrane, a theoretical physicist wakes up every morning in a divergent timeline where humanity chose different civilizational milestones.',
    array[878, 53, 9648],
    126,
    'Christopher Nolan',
    array['Cillian Murphy', 'Jessica Chastain', 'Kenneth Branagh'],
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000021',
    target_user_id,
    'The Street Food Maestro',
    2023,
    'An aging grandmother who guards a legendary century-old rendang spice recipe agrees to train her ambitious culinary-grad granddaughter for a prestigious Southeast Asian street culinary championship.',
    array[35, 18, 10751],
    109,
    'Kamila Andini',
    array['Christine Hakim', 'Shenina Cinnamon', 'Vino G. Bastian'],
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000022',
    target_user_id,
    'Highland Wanderer',
    2024,
    'Following the loss of his brother, a cartographer embarks on a solo trek across the spine of the Bukit Barisan mountain range, encountering hermit communities and breathtaking untamed wilderness.',
    array[12, 18],
    115,
    'Edwin',
    array['Ladya Cheryl', 'Chicco Jerikho'],
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000023',
    target_user_id,
    'Ghosts of Kota Tua',
    2023,
    'During archaeological restorations of Dutch colonial canals in Jakarta’s Old Town, workers uncover sealed catacombs containing relics tied to forgotten 18th-century maritime trials.',
    array[27, 9648, 36],
    98,
    'Kimo Stamboel',
    array['Hannah Al Rashid', 'Ario Bayu'],
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000024',
    target_user_id,
    'The Silicon Valley Escape',
    2024,
    'Burned out from 80-hour workweeks at a prestigious AI startup, two lead engineers stage an elaborate mock-disappearance to start a modest solar surf hostel in Lombok.',
    array[35, 28, 12],
    103,
    'Taika Waititi',
    array['Kumail Nanjiani', 'Randall Park', 'Constance Wu'],
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000025',
    target_user_id,
    'Emerald Forest Symphony',
    2024,
    'A breathtaking hand-drawn animation chronicling the journey of a young hornbill and an ancient orangutan guardian as they unite the creatures of Kalimantan to protect the sacred ironwood trees.',
    array[16, 12, 10751, 14],
    92,
    'Hayao Miyazaki',
    array['Sherina Munaf', 'Mathias Muchus'],
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1280&auto=format&fit=crop&q=80'
  ),
  (
    'c1000000-0000-4000-8000-000000000026',
    target_user_id,
    'The Last Wayang Master',
    2023,
    'In a world enamored with holographic entertainment, an octogenarian leather shadow puppet master in Surakarta takes in an orphaned drone programmer to teach her the philosophy of light, shadow, and soul.',
    array[18, 36, 10751],
    121,
    'Slamet Rahardjo',
    array['Suwaji Dalang', 'Prilly Latuconsina', 'Reza Rahadian'],
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1280&auto=format&fit=crop&q=80'
  );

  raise notice 'Successfully seeded community movies with images!';
end $$;
