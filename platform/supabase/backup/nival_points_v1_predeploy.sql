-- Run ONLY on production after explicit authorization, immediately before Puntos V1 migrations.
-- Creates an in-database verified snapshot of all existing rows touched by the rollout.
create schema if not exists nival_backup_puntos_v1_20260921;

create table nival_backup_puntos_v1_20260921.customers as table public.customers;
create table nival_backup_puntos_v1_20260921.loyalty_programs as table public.loyalty_programs;
create table nival_backup_puntos_v1_20260921.loyalty_accounts as table public.loyalty_accounts;
create table nival_backup_puntos_v1_20260921.visits as table public.visits;
create table nival_backup_puntos_v1_20260921.points_ledger as table public.points_ledger;
create table nival_backup_puntos_v1_20260921.reward_redemptions as table public.reward_redemptions;
create table nival_backup_puntos_v1_20260921.business_product_entitlements as table public.business_product_entitlements;

create table nival_backup_puntos_v1_20260921.metadata as
select 'policy'::text kind, schemaname||'.'||tablename||':'||policyname name, qual||coalesce(' CHECK '||with_check,'') definition
from pg_policies where schemaname='public' and tablename in ('customers','loyalty_programs','loyalty_accounts','visits','points_ledger','reward_redemptions')
union all
select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('record_customer_visit','redeem_customer_reward','enroll_customer','get_public_loyalty_card','get_public_loyalty_card_v2','update_current_loyalty_program','update_current_loyalty_program_v2');

-- Verification: every pair must match before migrations proceed.
select 'customers' table_name,(select count(*) from public.customers) live,(select count(*) from nival_backup_puntos_v1_20260921.customers) backup
union all select 'loyalty_programs',(select count(*) from public.loyalty_programs),(select count(*) from nival_backup_puntos_v1_20260921.loyalty_programs)
union all select 'loyalty_accounts',(select count(*) from public.loyalty_accounts),(select count(*) from nival_backup_puntos_v1_20260921.loyalty_accounts)
union all select 'visits',(select count(*) from public.visits),(select count(*) from nival_backup_puntos_v1_20260921.visits)
union all select 'points_ledger',(select count(*) from public.points_ledger),(select count(*) from nival_backup_puntos_v1_20260921.points_ledger)
union all select 'reward_redemptions',(select count(*) from public.reward_redemptions),(select count(*) from nival_backup_puntos_v1_20260921.reward_redemptions)
union all select 'business_product_entitlements',(select count(*) from public.business_product_entitlements),(select count(*) from nival_backup_puntos_v1_20260921.business_product_entitlements);
