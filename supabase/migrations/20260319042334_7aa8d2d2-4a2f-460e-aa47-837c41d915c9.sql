
CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _assigner_name text;
BEGIN
  IF NEW.owner_id IS NOT NULL 
     AND NEW.owner_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
     AND (TG_OP = 'INSERT' OR OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
    
    SELECT full_name INTO _assigner_name FROM public.profiles WHERE user_id = auth.uid();
    
    INSERT INTO public.notifications (user_id, type, message, task_id)
    VALUES (
      NEW.owner_id,
      'assignment',
      COALESCE(_assigner_name, 'Someone') || ' assigned you to "' || NEW.title || '"',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assignment
  AFTER INSERT OR UPDATE OF owner_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_assignment();
