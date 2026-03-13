# Enable Realtime - SQL Method

Since the Replication UI isn't showing the messages table, we'll enable it using SQL directly.

## Instructions

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** (icon looks like `</>` in left sidebar)
4. Click **New query** button

### Step 2: Run the Enable Script

Copy and paste this SQL:

```sql
-- Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Set replica identity to FULL
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Verify it's enabled
SELECT schemaname, tablename, replica_identity
FROM pg_tables
WHERE tablename = 'messages';
```

Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success

After running, you should see output like:

```
schemaname | tablename | replica_identity
-----------+-----------+------------------
public     | messages  | f
```

This means it's working! ✅

### Step 4: Double-Check Publication

Run this query to confirm:

```sql
SELECT * FROM pg_publication_tables WHERE tablename = 'messages';
```

Should return:

```
pubname            | schemaname | tablename
-------------------+------------+-----------
supabase_realtime  | public     | messages
```

## Troubleshooting

### Error: "publication already exists"

This means it's already enabled! You're good to go. ✅

### Error: "table does not exist"

The messages table might not be created yet. Run this to check:

```sql
-- Check if messages table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'messages';
```

If it returns nothing, you need to run your database migrations first.

### Alternative: Enable All Tables at Once

If you want realtime for multiple tables:

```sql
-- Enable realtime for all main tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- Set replica identity
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.parcels REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;
```

## What This Does

1. **ALTER PUBLICATION** - Adds the messages table to Supabase's realtime publication
2. **REPLICA IDENTITY FULL** - Tells PostgreSQL to track all column changes (needed for realtime)
3. The verification queries confirm it's set up correctly

## Next Steps

Once you see success (the verification query returns results):

1. ✅ Realtime is now enabled!
2. ✅ Your app should start showing instant messages
3. ✅ Test with two accounts - messages should appear instantly
4. ✅ No need to redeploy anything

## Test It

1. Open your app in two browsers
2. Login with two different accounts
3. Send a message from one
4. Should appear instantly on the other! 🎉

If messages still don't appear instantly, check browser console for errors and let me know!
