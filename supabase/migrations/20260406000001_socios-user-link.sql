-- Vincula sócios (entidade financeira) a usuários do sistema (entidade de acesso)
-- Resolve a duplicação: um sócio pode ter UMA conta de usuário vinculada

ALTER TABLE public.socios ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_socios_user_id ON public.socios(user_id) WHERE user_id IS NOT NULL;
