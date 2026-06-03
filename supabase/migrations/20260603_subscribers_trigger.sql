-- Trigger to automatically create a subscriber row for new users
CREATE OR REPLACE FUNCTION public.handle_new_subscriber()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, plan, daily_uses, last_reset_date)
  VALUES (new.id, 'free', 0, CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_subscriber ON auth.users;

CREATE TRIGGER on_auth_user_created_subscriber
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_subscriber();
