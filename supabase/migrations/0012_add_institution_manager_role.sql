-- 0012_add_institution_manager_role.sql
-- Migracao isolada: apenas ALTER TYPE.
-- OBRIGATORIO: deve ser aplicada e commitada (em sessao separada) ANTES de 0013.
-- 0013 referencia este valor em policies RLS. Aplicar ambas no mesmo bloco SQL causaria:
--   ERROR: unsafe use of new value "institution_manager" of enum type user_role
-- porque ALTER TYPE ADD VALUE nao pode ser usado na mesma transacao que statements
-- que referenciam o novo valor (PostgreSQL docs, ALTER TYPE Notes).
-- IF NOT EXISTS torna esta migracao segura para re-execucao acidental.
alter type public.user_role add value if not exists 'institution_manager';
