-- Trigger to automatically create a subscriber row for new users
CREATE OR REPLACE FUNCTION public.handle_new_subscriber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, plan, daily_uses, last_reset_date)
  VALUES (new.id, 'free', 0, CURRENT_DATE);
  RETURN NEW;
END;
$$;

-- Only the trigger can execute it, not users directly
REVOKE EXECUTE ON FUNCTION public.handle_new_subscriber() FROM public, anon, authenticated;

-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_subscriber ON auth.users;

CREATE TRIGGER on_auth_user_created_subscriber
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_subscriber();
