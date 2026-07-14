import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Scoped to the caller's own session, just to reliably identify who is asking.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    const authUserId = userData.user.id;

    // Privileged client — bypasses RLS, and is the only way to actually
    // delete an auth user (supabase.auth.admin.* requires the service role
    // key, which must never reach the client).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const { data: memberships, error: membershipsError } = await adminClient
      .from('memberships')
      .select('id, organization_id, organizations(name)')
      .eq('profile_id', profile.id)
      .is('deleted_at', null);

    if (membershipsError) {
      return new Response(JSON.stringify({ error: membershipsError.message }), { status: 500 });
    }

    for (const membership of memberships ?? []) {
      const { count, error: othersError } = await adminClient
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', membership.organization_id)
        .neq('profile_id', profile.id)
        .is('deleted_at', null);

      if (othersError) {
        return new Response(JSON.stringify({ error: othersError.message }), { status: 500 });
      }

      if (count && count > 0) {
        const orgName = (membership as unknown as { organizations?: { name: string } }).organizations?.name ?? '';
        return new Response(
          JSON.stringify({
            error: 'HAS_TEAMMATES',
            organizationName: orgName,
          }),
          { status: 400 },
        );
      }
    }

    // Safe to proceed — this profile is alone everywhere it belongs.
    for (const membership of memberships ?? []) {
      await adminClient
        .from('organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', membership.organization_id);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
    });
  }
});
