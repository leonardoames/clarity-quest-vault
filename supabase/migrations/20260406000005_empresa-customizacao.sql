-- Personalização por empresa: cor principal da barra e logo
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_principal text DEFAULT '#f97316';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url text;
