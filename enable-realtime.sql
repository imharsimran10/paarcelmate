-- ================================================================
-- Enable Realtime for Messages Table
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Step 2: Set replica identity to FULL (required for realtime)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Step 3: Verify it's enabled (should return 1 row)
SELECT schemaname, tablename, replica_identity
FROM pg_tables
WHERE tablename = 'messages';

-- Step 4: Check publication (should show messages table)
SELECT * FROM pg_publication_tables WHERE tablename = 'messages';

-- ================================================================
-- Expected Results:
-- Step 3 should show: public | messages | f (or similar)
-- Step 4 should show: supabase_realtime | public | messages
-- ================================================================
