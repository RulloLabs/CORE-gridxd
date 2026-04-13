-- Permite a iberusdelasierra@gmail.com leer sus métricas de todas las tablas u obtener un resumen.
CREATE OR REPLACE FUNCTION get_admin_metrics()
RETURNS TABLE (
  total_users BIGINT,
  total_extractions BIGINT,
  total_images BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
  extracted_count BIGINT;
  images_count BIGINT;
  users_count BIGINT;
BEGIN
  -- Verificar quién llama a la función
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  
  IF caller_email <> 'iberusdelasierra@gmail.com' THEN
    RAISE EXCEPTION 'Acceso denegado. Se requiere cuenta de administrador.';
  END IF;

  -- 1. Calcular total_extractions (suma de processed_images en processing_history)
  SELECT COALESCE(SUM(processed_images), 0) INTO extracted_count FROM processing_history;
  
  -- 2. Calcular número de registros (veces que se usó la herramienta)
  SELECT COUNT(*) INTO images_count FROM processing_history;

  -- 3. Usuarios distintos que han procesado al menos algo
  SELECT COUNT(DISTINCT user_id) INTO users_count FROM processing_history;

  -- Para dar una métrica un poco más global de usuarios registrados, 
  -- siendo SECURITY DEFINER, podemos tocar auth.users sin problema.
  SELECT COUNT(*) INTO users_count FROM auth.users;

  RETURN QUERY SELECT users_count, extracted_count, images_count;
END;
$$;
