-- Gohit seed — orquestrador
-- Executado automaticamente por: supabase db reset
--
-- Ordem importa (respeita FKs):
--   brands          (raiz)
--   video_templates (FK → brands)
--   contents        (FK → brands)
--   content_metrics (FK → contents)
--   external_references / settings (standalone)
--
-- Para adicionar um novo seed:
--   1. Crie o arquivo em supabase/seed/NN_nome.sql
--   2. Descomente (ou adicione) o \i correspondente abaixo
--
-- Todos os arquivos devem ser idempotentes (usar ON CONFLICT DO UPDATE),
-- para permitir rodar sem `db reset` durante iteração.

\i seed/01_brands.sql
-- \i seed/02_video_templates.sql
\i seed/03_contents.sql
\i seed/04_content_metrics.sql
-- \i seed/05_external_references.sql
-- \i seed/06_settings.sql
