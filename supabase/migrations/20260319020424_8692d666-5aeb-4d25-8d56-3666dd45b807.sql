
CREATE OR REPLACE FUNCTION public.create_invitation_notification(_project_id uuid, _email text, _invited_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invited_user_id uuid;
  _project_name text;
  _inviter_name text;
BEGIN
  -- Find user ID by email from auth.users
  SELECT id INTO _invited_user_id FROM auth.users WHERE email = _email;
  
  IF _invited_user_id IS NULL THEN
    RETURN; -- User doesn't exist yet, skip notification
  END IF;
  
  -- Get project name
  SELECT name INTO _project_name FROM public.projects WHERE id = _project_id;
  
  -- Get inviter name
  SELECT full_name INTO _inviter_name FROM public.profiles WHERE user_id = _invited_by;
  
  -- Create notification for the invited user
  INSERT INTO public.notifications (user_id, type, message, task_id)
  VALUES (
    _invited_user_id,
    'invitation',
    _inviter_name || ' invited you to join project "' || _project_name || '"',
    NULL
  );
END;
$$;
