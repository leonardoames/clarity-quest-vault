-- Adiciona "reprovado" aos enums status_pagar e status_receber.
-- Isso elimina qualquer erro "invalid input value for enum" quando
-- o frontend envia "reprovado" para qualquer tabela financeira.
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS é idempotente.

ALTER TYPE public.status_pagar ADD VALUE IF NOT EXISTS 'reprovado';
ALTER TYPE public.status_receber ADD VALUE IF NOT EXISTS 'reprovado';
