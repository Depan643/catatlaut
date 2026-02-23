-- Allow all authenticated users to view all profiles (for viewing other officers)
CREATE POLICY "All authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the restrictive select policies that conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
