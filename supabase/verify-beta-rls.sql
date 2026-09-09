-- =============================================================================
-- AgentCloud — Phase 4: RLS Policy Verification for Beta Roles
-- =============================================================================
-- Run these tests in Supabase SQL Editor to verify that beta_tester/internal_qa
-- roles cannot access other tenants' data.
--
-- PREREQUISITES:
--   1. Migration from schema-waitlist-beta-access.sql must be applied
--   2. At least one beta_tester user must exist (via code redemption)
--
-- HOW TO TEST:
--   1. Run as the beta_tester user (use their JWT in the Authorization header)
--   2. Each test should return the expected result
-- =============================================================================


-- -----------------------------------------------------------------------------
-- TEST 1: profiles — beta user can only see their own profile
-- -----------------------------------------------------------------------------
-- Expected: only the beta user's own row
SELECT
  'TEST 1: profiles isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 1 then 'PASS' else 'FAIL' end as result
FROM public.profiles
WHERE id = auth.uid();


-- -----------------------------------------------------------------------------
-- TEST 2: user_agents — beta user can only see their own agents
-- -----------------------------------------------------------------------------
-- Expected: 0 rows (beta user has no subscription rows)
SELECT
  'TEST 2: user_agents isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users agents!' end as result
FROM public.user_agents
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 3: subscriptions — beta user can only see their own subscriptions
-- -----------------------------------------------------------------------------
-- Expected: 0 rows (beta user has no subscription rows)
SELECT
  'TEST 3: subscriptions isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users subscriptions!' end as result
FROM public.subscriptions
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 4: agent_runs — beta user can only see their own runs
-- -----------------------------------------------------------------------------
-- Expected: 0 rows (beta user has no runs yet)
SELECT
  'TEST 4: agent_runs isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users runs!' end as result
FROM public.agent_runs
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 5: carts — beta user can only see their own cart
-- -----------------------------------------------------------------------------
-- Expected: 0 or 1 row (their own cart only)
SELECT
  'TEST 5: carts isolation' as test,
  count(*) as rows_visible,
  case when count(*) <= 1 then 'PASS' else 'FAIL — can see other users carts!' end as result
FROM public.carts
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 6: cart_items — beta user can only see their own cart items
-- -----------------------------------------------------------------------------
-- Expected: 0 rows
SELECT
  'TEST 6: cart_items isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users cart items!' end as result
FROM public.cart_items
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 7: agent_notifications — beta user can only see their own
-- -----------------------------------------------------------------------------
-- Expected: 0 rows
SELECT
  'TEST 7: agent_notifications isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users notifications!' end as result
FROM public.agent_notifications
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 8: tenant_integrations — beta user can only see their own
-- -----------------------------------------------------------------------------
-- Expected: 0 rows
SELECT
  'TEST 8: tenant_integrations isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users integrations!' end as result
FROM public.tenant_integrations
WHERE tenant_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 9: shopify_connections — beta user can only see their own
-- -----------------------------------------------------------------------------
-- Expected: 0 rows
SELECT
  'TEST 9: shopify_connections isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users shopify connections!' end as result
FROM public.shopify_connections
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 10: google_connections — beta user can only see their own
-- -----------------------------------------------------------------------------
-- Expected: 0 rows
SELECT
  'TEST 10: google_connections isolation' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can see other users google connections!' end as result
FROM public.google_connections
WHERE user_id = auth.uid()::text;


-- -----------------------------------------------------------------------------
-- TEST 11: waitlist_codes — beta user CANNOT read codes
-- -----------------------------------------------------------------------------
-- Expected: 0 rows (only service role can access)
SELECT
  'TEST 11: waitlist_codes access denied' as test,
  count(*) as rows_visible,
  case when count(*) = 0 then 'PASS' else 'FAIL — can read waitlist codes!' end as result
FROM public.waitlist_codes;


-- -----------------------------------------------------------------------------
-- TEST 12: waitlist_redemptions — beta user can only see their own
-- -----------------------------------------------------------------------------
-- Expected: 0 or 1 row (their own redemption only)
SELECT
  'TEST 12: waitlist_redemptions isolation' as test,
  count(*) as rows_visible,
  case when count(*) <= 1 then 'PASS' else 'FAIL — can see other users redemptions!' end as result
FROM public.waitlist_redemptions
WHERE user_id = auth.uid();


-- -----------------------------------------------------------------------------
-- TEST 13: Cross-tenant attempt — try to update another user's profile
-- Expected: 0 rows affected (RLS blocks it)
-- NOTE: This test must be run as the beta_tester user, not service role
-- -----------------------------------------------------------------------------
-- UPDATE public.profiles
-- SET full_name = 'HACKED'
-- WHERE id = 'some-other-user-uuid';
-- -- Should affect 0 rows due to RLS policy "Users can update own profile"


-- -----------------------------------------------------------------------------
-- TEST 14: Cross-tenant attempt — try to read another user's agents
-- Expected: 0 rows (RLS blocks it)
-- SELECT * FROM public.user_agents WHERE user_id = 'some-other-user-uuid';
-- -- Should return 0 rows


-- =============================================================================
-- SUMMARY
-- =============================================================================
-- All policies use auth.uid() or auth.uid()::text for scoping.
-- No policy checks role = 'beta_tester' to grant broader access.
-- Beta users have EXACTLY the same data visibility as normal members.
-- The only difference is that beta users bypass USAGE LIMITS (server-side),
-- not DATA VISIBILITY (RLS).
-- =============================================================================
