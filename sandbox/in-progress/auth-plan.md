# Auth Plan

## Tasks

1. Add `user_id` column to tables
   - `ALTER TABLE boards ADD COLUMN user_id UUID REFERENCES auth.users(id)`
   - Same for `columns`, `cards`

2. Migrate existing data
   - Assign current data to your user ID, or delete test data

3. Enable RLS on tables
   - `ALTER TABLE boards ENABLE ROW LEVEL SECURITY`

4. Create RLS policies
   ```sql
   CREATE POLICY "Users see own boards" ON boards
     FOR ALL USING (auth.uid() = user_id);
   ```

5. Update API layer
   - Supabase client auto-includes auth token
   - Add `user_id` when inserting new records

6. Protect app routes
   - Redirect to login if not authenticated
   - Show loading state while checking session

7. Replace test AuthButton
   - Proper login page or modal
   - Handle auth errors

8. Test multi-user
   - Create second GitHub account or use Supabase dashboard
