# Auth Plan

## Completed

1. ✅ Add `user_id` column to `boards` table only (columns/cards inherit via FK)
2. ✅ Delete test data (removed seed.sql)
3. ✅ Enable RLS on all tables
4. ✅ Create RLS subquery policies
5. ✅ Add indices for performance
6. ✅ Update model/api/store to handle `user_id`
7. ✅ Add test AuthButton component

## Remaining

1. Protect app routes
   - Redirect to login if not authenticated
   - Show loading state while checking session

2. Replace test AuthButton
   - Proper login page or modal
   - Handle auth errors

3. Onboarding flow
   - Create starter board on first login
   - Set `onboarded` flag in user_metadata

4. Test multi-user
   - Create second GitHub account or use Supabase dashboard
