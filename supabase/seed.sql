-- ============================================================
-- supabase/seed.sql
-- Idempotent local development seed.
-- Apply with: npx supabase db reset (resets DB then runs this file)
--
-- All UUIDs are fixed so the seed is repeatable and test code
-- can reference known IDs directly.
--
-- The handle_new_user() trigger fires when auth.users rows are
-- inserted, so profiles + personal groups are created automatically.
-- Do NOT manually insert into profiles or create personal groups here.
-- ============================================================

do $$
declare
  -- users
  u1 uuid := '00000000-0000-0000-0000-000000000001'; -- Alice Martin
  u2 uuid := '00000000-0000-0000-0000-000000000002'; -- Bob Chen
  u3 uuid := '00000000-0000-0000-0000-000000000003'; -- Carol Davis

  -- shared group
  shared_group_id uuid := '00000000-0000-0000-0000-000000000010';

  -- measurements
  m_tsp   uuid := '00000000-0000-0000-0001-000000000001';
  m_tbsp  uuid := '00000000-0000-0000-0001-000000000002';
  m_cup   uuid := '00000000-0000-0000-0001-000000000003';
  m_ml    uuid := '00000000-0000-0000-0001-000000000004';
  m_l     uuid := '00000000-0000-0000-0001-000000000005';
  m_g     uuid := '00000000-0000-0000-0001-000000000006';
  m_kg    uuid := '00000000-0000-0000-0001-000000000007';
  m_oz    uuid := '00000000-0000-0000-0001-000000000008';
  m_lb    uuid := '00000000-0000-0000-0001-000000000009';
  m_pc    uuid := '00000000-0000-0000-0001-000000000010';
  m_pinch uuid := '00000000-0000-0000-0001-000000000011';
  m_taste uuid := '00000000-0000-0000-0001-000000000012';

  -- tags (in shared group)
  t_pasta  uuid := '00000000-0000-0000-0002-000000000001';
  t_main   uuid := '00000000-0000-0000-0002-000000000002';
  t_quick  uuid := '00000000-0000-0000-0002-000000000003';
  t_veg    uuid := '00000000-0000-0000-0002-000000000004';
  t_bkfst  uuid := '00000000-0000-0000-0002-000000000005';

  -- recipes (in shared group)
  r1 uuid := '00000000-0000-0000-0003-000000000001'; -- Spaghetti Carbonara
  r2 uuid := '00000000-0000-0000-0003-000000000002'; -- Avocado Toast
  r3 uuid := '00000000-0000-0000-0003-000000000003'; -- Chicken Stir Fry
  r4 uuid := '00000000-0000-0000-0003-000000000004'; -- Banana Pancakes
  r5 uuid := '00000000-0000-0000-0003-000000000005'; -- Classic Tomato Sauce

begin

  -- ----------------------------------------------------------
  -- AUTH USERS
  -- Inserting here causes the handle_new_user() trigger to fire,
  -- which creates profiles + personal groups automatically.
  -- ----------------------------------------------------------
  insert into auth.users (
    id, email, raw_user_meta_data,
    aud, role, email_confirmed_at,
    created_at, updated_at, is_sso_user
  )
  values
    (u1, 'alice@example.com',
      '{"full_name":"Alice Martin","avatar_url":null}'::jsonb,
      'authenticated', 'authenticated', now(), now(), now(), false),
    (u2, 'bob@example.com',
      '{"full_name":"Bob Chen","avatar_url":null}'::jsonb,
      'authenticated', 'authenticated', now(), now(), now(), false),
    (u3, 'carol@example.com',
      '{"full_name":"Carol Davis","avatar_url":null}'::jsonb,
      'authenticated', 'authenticated', now(), now(), now(), false)
  on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- MEASUREMENTS (global reference data)
  -- ----------------------------------------------------------
  insert into public.measurements (id, name, abbreviation, sort_order) values
    (m_tsp,   'teaspoon',    'tsp',   1),
    (m_tbsp,  'tablespoon',  'tbsp',  2),
    (m_cup,   'cup',         'c',     3),
    (m_ml,    'millilitre',  'ml',    4),
    (m_l,     'litre',       'L',     5),
    (m_g,     'gram',        'g',     6),
    (m_kg,    'kilogram',    'kg',    7),
    (m_oz,    'ounce',       'oz',    8),
    (m_lb,    'pound',       'lb',    9),
    (m_pc,    'piece',       'pc',   10),
    (m_pinch, 'pinch',       null,   11),
    (m_taste, 'to taste',    null,   12)
  on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- SHARED GROUP
  -- ----------------------------------------------------------
  insert into public.groups (id, name, created_by)
  values (shared_group_id, 'The Family Kitchen', u1)
  on conflict (id) do nothing;

  insert into public.group_members (group_id, user_id, role)
  values
    (shared_group_id, u1, 'admin'),
    (shared_group_id, u2, 'member'),
    (shared_group_id, u3, 'member')
  on conflict (group_id, user_id) do nothing;


  -- ----------------------------------------------------------
  -- TAGS (in shared group)
  -- ----------------------------------------------------------
  insert into public.tags (id, group_id, name) values
    (t_pasta, shared_group_id, 'pasta'),
    (t_main,  shared_group_id, 'main course'),
    (t_quick, shared_group_id, 'quick'),
    (t_veg,   shared_group_id, 'vegetarian'),
    (t_bkfst, shared_group_id, 'breakfast')
  on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- RECIPES
  -- ----------------------------------------------------------
  insert into public.recipes
    (id, group_id, name, description,
     prep_time_minutes, cook_time_minutes, servings, source, created_by)
  values
    (r1, shared_group_id,
      'Spaghetti Carbonara',
      'A classic Roman pasta with eggs, pecorino, guanciale and black pepper.',
      10, 20, 4, 'Alice Martin', u1),
    (r2, shared_group_id,
      'Avocado Toast',
      'Creamy avocado on toasted sourdough with chilli flakes.',
      5, 5, 2, 'Alice Martin', u1),
    (r3, shared_group_id,
      'Chicken Stir Fry',
      'Quick and healthy stir fry with vegetables and soy sauce.',
      10, 15, 4, 'Bob Chen', u2),
    (r4, shared_group_id,
      'Banana Pancakes',
      'Fluffy two-ingredient banana pancakes.',
      5, 10, 2, 'Carol Davis', u3),
    (r5, shared_group_id,
      'Classic Tomato Sauce',
      'A slow-cooked tomato sauce that works with any pasta.',
      10, 40, 6, 'Alice Martin', u1)
  on conflict (id) do nothing;


  -- ----------------------------------------------------------
  -- RECIPE TAGS
  -- ----------------------------------------------------------
  insert into public.recipe_tags (recipe_id, tag_id) values
    (r1, t_pasta), (r1, t_main),
    (r2, t_quick), (r2, t_veg),  (r2, t_bkfst),
    (r3, t_main),  (r3, t_quick),
    (r4, t_quick), (r4, t_bkfst),(r4, t_veg),
    (r5, t_pasta), (r5, t_veg)
  on conflict do nothing;


  -- ----------------------------------------------------------
  -- RECIPE INGREDIENTS
  -- ----------------------------------------------------------

  -- Spaghetti Carbonara
  insert into public.recipe_ingredients
    (recipe_id, name, amount, measurement_id, notes, sort_order)
  values
    (r1, 'spaghetti',       400,  m_g,    null,               1),
    (r1, 'guanciale',       150,  m_g,    'diced',            2),
    (r1, 'egg yolks',         4,  m_pc,   null,               3),
    (r1, 'pecorino romano',  60,  m_g,    'finely grated',    4),
    (r1, 'black pepper',    null,  m_taste,'freshly cracked',  5),
    (r1, 'salt',            null,  m_taste,'for pasta water',  6);

  -- Avocado Toast
  insert into public.recipe_ingredients
    (recipe_id, name, amount, measurement_id, notes, sort_order)
  values
    (r2, 'sourdough bread',  2,   m_pc,    'thick slices',    1),
    (r2, 'avocado',          1,   m_pc,    'ripe',            2),
    (r2, 'lemon juice',      1,   m_tsp,   null,              3),
    (r2, 'chilli flakes',   null,  m_pinch, null,              4),
    (r2, 'salt',            null,  m_taste, null,              5);

  -- Chicken Stir Fry
  insert into public.recipe_ingredients
    (recipe_id, name, amount, measurement_id, notes, sort_order)
  values
    (r3, 'chicken breast',  500,  m_g,    'thinly sliced',                    1),
    (r3, 'mixed vegetables',300,  m_g,    'e.g. broccoli, capsicum, carrot',  2),
    (r3, 'soy sauce',        3,   m_tbsp, null,                               3),
    (r3, 'sesame oil',       1,   m_tbsp, null,                               4),
    (r3, 'garlic',           2,   m_pc,   'cloves, minced',                   5),
    (r3, 'ginger',           1,   m_tsp,  'fresh, grated',                    6);

  -- Banana Pancakes
  insert into public.recipe_ingredients
    (recipe_id, name, amount, measurement_id, notes, sort_order)
  values
    (r4, 'banana',          2,    m_pc,   'ripe',             1),
    (r4, 'eggs',            2,    m_pc,   null,               2),
    (r4, 'vanilla extract', 0.5,  m_tsp,  'optional',         3);

  -- Classic Tomato Sauce
  insert into public.recipe_ingredients
    (recipe_id, name, amount, measurement_id, notes, sort_order)
  values
    (r5, 'canned crushed tomatoes', 800, m_g, '2 x 400 g cans',  1),
    (r5, 'garlic',                   4,  m_pc, 'cloves, sliced',  2),
    (r5, 'olive oil',                3,  m_tbsp, null,            3),
    (r5, 'fresh basil',             null, m_taste, 'torn',        4),
    (r5, 'salt',                    null, m_taste, null,          5);


  -- ----------------------------------------------------------
  -- RECIPE STEPS
  -- ----------------------------------------------------------

  -- Spaghetti Carbonara
  insert into public.recipe_steps (recipe_id, step_number, description) values
    (r1, 1, 'Bring a large pot of salted water to the boil. Cook spaghetti until al dente according to package instructions.'),
    (r1, 2, 'While pasta cooks, fry the guanciale in a cold pan over medium heat until crispy. Remove from heat.'),
    (r1, 3, 'Whisk egg yolks with grated pecorino and a generous amount of cracked black pepper in a bowl.'),
    (r1, 4, 'Reserve 1 cup of pasta water. Drain spaghetti and add to the guanciale pan off the heat.'),
    (r1, 5, 'Add the egg mixture and toss quickly, adding pasta water a splash at a time to create a creamy sauce. Serve immediately.');

  -- Avocado Toast
  insert into public.recipe_steps (recipe_id, step_number, description) values
    (r2, 1, 'Toast the sourdough slices until golden and crisp.'),
    (r2, 2, 'Mash the avocado in a bowl with lemon juice and salt.'),
    (r2, 3, 'Spread generously onto the toast and top with chilli flakes.');

  -- Chicken Stir Fry
  insert into public.recipe_steps (recipe_id, step_number, description) values
    (r3, 1, 'Mix soy sauce and sesame oil in a small bowl to make the sauce.'),
    (r3, 2, 'Heat a wok or large frying pan over high heat with a little oil.'),
    (r3, 3, 'Add garlic and ginger, stir fry for 30 seconds until fragrant.'),
    (r3, 4, 'Add chicken and cook for 4–5 minutes until cooked through.'),
    (r3, 5, 'Add vegetables and stir fry for 3–4 minutes until tender-crisp. Pour over sauce, toss and serve.');

  -- Banana Pancakes
  insert into public.recipe_steps (recipe_id, step_number, description) values
    (r4, 1, 'Mash bananas thoroughly in a bowl until smooth. Beat in eggs (and vanilla if using).'),
    (r4, 2, 'Heat a non-stick pan over medium heat with a little butter or oil.'),
    (r4, 3, 'Pour small amounts of batter into the pan (about 2 tbsp each). Cook 2 minutes per side until golden.');

  -- Classic Tomato Sauce
  insert into public.recipe_steps (recipe_id, step_number, description) values
    (r5, 1, 'Warm olive oil in a saucepan over medium-low heat. Add garlic and cook gently for 2 minutes — do not brown.'),
    (r5, 2, 'Add crushed tomatoes and stir to combine. Season with salt.'),
    (r5, 3, 'Simmer uncovered for 35–40 minutes, stirring occasionally, until the sauce thickens.'),
    (r5, 4, 'Remove from heat, stir in torn basil. Adjust seasoning and serve over pasta.');


  -- ----------------------------------------------------------
  -- INGREDIENT AUTOCOMPLETE REGISTRY
  -- Upsert all ingredient names used above so autocomplete works.
  -- ----------------------------------------------------------
  insert into public.ingredients (group_id, name) values
    (shared_group_id, 'spaghetti'),
    (shared_group_id, 'guanciale'),
    (shared_group_id, 'egg yolks'),
    (shared_group_id, 'pecorino romano'),
    (shared_group_id, 'black pepper'),
    (shared_group_id, 'salt'),
    (shared_group_id, 'sourdough bread'),
    (shared_group_id, 'avocado'),
    (shared_group_id, 'lemon juice'),
    (shared_group_id, 'chilli flakes'),
    (shared_group_id, 'chicken breast'),
    (shared_group_id, 'mixed vegetables'),
    (shared_group_id, 'soy sauce'),
    (shared_group_id, 'sesame oil'),
    (shared_group_id, 'garlic'),
    (shared_group_id, 'ginger'),
    (shared_group_id, 'banana'),
    (shared_group_id, 'eggs'),
    (shared_group_id, 'vanilla extract'),
    (shared_group_id, 'canned crushed tomatoes'),
    (shared_group_id, 'olive oil'),
    (shared_group_id, 'fresh basil')
  on conflict (group_id, name) do nothing;


  -- ----------------------------------------------------------
  -- CALENDAR ENTRIES
  -- ----------------------------------------------------------
  insert into public.calendar_entries
    (group_id, date, recipe_id, free_text, planned_by)
  values
    (shared_group_id, '2026-02-23', r1, null,          u1),
    (shared_group_id, '2026-02-24', null, 'Leftovers', u2),
    (shared_group_id, '2026-02-25', r3, null,          u1),
    (shared_group_id, '2026-02-26', null, 'Pizza night', u3)
  on conflict (group_id, date) do nothing;

end $$;
