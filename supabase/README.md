## Supabase setup

1. Open your Supabase project dashboard.
2. Go to `SQL Editor`.
3. Run the migration in [migrations/20260423_init.sql](/Users/Mac/Documents/GitHub/debt-sync/supabase/migrations/20260423_init.sql).
4. In `Authentication > Providers`, enable Email authentication.
5. For easier first-time local testing, you can disable "Confirm email" until the app auth flow is working.

After the SQL runs, the database will have:
- `profiles`
- `groups`
- `group_members`
- `expenses`
- `expense_participants`
- `settlements`

The migration also creates:
- a trigger that creates a `profiles` row whenever a new auth user is created
- row-level security policies so authenticated users only see groups they belong to
