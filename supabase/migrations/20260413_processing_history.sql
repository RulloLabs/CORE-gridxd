-- ============================================================
-- GridXD: Processing History Table
-- Ejecutar en: https://supabase.com/dashboard/project/oljivwoydprggxvnxklj/sql/new
-- ============================================================

CREATE TABLE IF NOT EXISTS public.processing_history (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT        NOT NULL DEFAULT 'Sin nombre',
  icon_count   INTEGER     NOT NULL DEFAULT 0,
  resolution   TEXT        NOT NULL DEFAULT 'HD',  -- '2K' | 'HD'
  used_backend BOOLEAN     NOT NULL DEFAULT false,
  thumbnail    TEXT,                                -- base64 PNG ~80px
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para queries rápidas por usuario + fecha
CREATE INDEX IF NOT EXISTS idx_processing_history_user_date
  ON public.processing_history (user_id, created_at DESC);

-- ──── Row Level Security ────────────────────────────────────
ALTER TABLE public.processing_history ENABLE ROW LEVEL SECURITY;

-- Solo ver el propio historial
CREATE POLICY "Users can view their own history"
  ON public.processing_history FOR SELECT
  USING (auth.uid() = user_id);

-- Solo insertar en el propio historial
CREATE POLICY "Users can insert their own history"
  ON public.processing_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo borrar las propias entradas
CREATE POLICY "Users can delete their own history"
  ON public.processing_history FOR DELETE
  USING (auth.uid() = user_id);
