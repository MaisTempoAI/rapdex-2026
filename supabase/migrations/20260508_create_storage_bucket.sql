-- ============================================================
-- RAPDEX — Storage bucket para mídias das FAQs
-- Bucket público: URLs são usadas diretamente pelo QUEPASA
-- ============================================================

-- Criar bucket rapdex-midia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rapdex-midia',
  'rapdex-midia',
  true,
  10485760, -- 10 MB por arquivo
  ARRAY[
    'image/jpeg',
    'audio/ogg',
    'audio/webm',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS: anon pode fazer upload ───────────────────────────
CREATE POLICY "rapdex_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'rapdex-midia');

-- ─── RLS: anon pode deletar (para remover arquivo ao editar) ─
CREATE POLICY "rapdex_anon_delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'rapdex-midia');

-- ─── RLS: leitura pública ──────────────────────────────────
CREATE POLICY "rapdex_public_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'rapdex-midia');
