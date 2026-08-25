-- ============================================================
-- RPC: remove_house_member
-- Allows house admin to remove a non-admin member from their house.
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_house_member(
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_house_id    UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID is required';
  END IF;

  IF v_caller_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot remove yourself using remove_house_member. Use leave_house instead.';
  END IF;

  -- Get caller's house and role
  SELECT house_id, role INTO v_house_id, v_caller_role
  FROM public.house_members
  WHERE user_id = v_caller_id;

  IF v_house_id IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only house admins can remove members';
  END IF;

  -- Get target's role in the same house
  SELECT role INTO v_target_role
  FROM public.house_members
  WHERE house_id = v_house_id AND user_id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of your house';
  END IF;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot remove an admin. Demote or transfer admin role first.';
  END IF;

  -- Delete target user membership
  DELETE FROM public.house_members
  WHERE house_id = v_house_id AND user_id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'removed_user_id', p_target_user_id,
    'house_id', v_house_id
  );
END;
$$;

-- ============================================================
-- RPC: leave_house
-- Allows an authenticated user to leave their current house.
-- If caller is sole admin and other members exist, auto-promotes longest-standing member.
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_house()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          UUID := auth.uid();
  v_house_id         UUID;
  v_role             TEXT;
  v_other_members    INTEGER;
  v_next_admin_id    UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find user's house and role
  SELECT house_id, role INTO v_house_id, v_role
  FROM public.house_members
  WHERE user_id = v_user_id;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'You are not currently a member of any house';
  END IF;

  -- Check remaining members count
  SELECT COUNT(*) INTO v_other_members
  FROM public.house_members
  WHERE house_id = v_house_id AND user_id <> v_user_id;

  -- If user is admin and other members exist, promote the oldest remaining member
  IF v_role = 'admin' AND v_other_members > 0 THEN
    SELECT user_id INTO v_next_admin_id
    FROM public.house_members
    WHERE house_id = v_house_id AND user_id <> v_user_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_next_admin_id IS NOT NULL THEN
      UPDATE public.house_members
      SET role = 'admin'
      WHERE house_id = v_house_id AND user_id = v_next_admin_id;
    END IF;
  END IF;

  -- Delete caller's membership
  DELETE FROM public.house_members
  WHERE house_id = v_house_id AND user_id = v_user_id;

  -- Optional: If no members left in the house, house stays or can be cleaned up
  RETURN jsonb_build_object(
    'success', true,
    'house_id', v_house_id,
    'promoted_admin_id', v_next_admin_id
  );
END;
$$;
