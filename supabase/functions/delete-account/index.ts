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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    const authUserId = userData.user.id;
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
      .select('id, organization_id, role, organizations(name)')
      .eq('profile_id', profile.id)
      .is('deleted_at', null);

    if (membershipsError) {
      return new Response(JSON.stringify({ error: membershipsError.message }), { status: 500 });
    }

    // Only orgs where this person is the OWNER can actually be "orphaned"
    // by their departure — being a non-owner member of someone else's org
    // with teammates is not a reason to block deleting your own account,
    // you'd simply stop being a member there.
    const ownedMemberships = (memberships ?? []).filter((m) => m.role === 'Owner');

    for (const membership of ownedMemberships) {
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
        return new Response(JSON.stringify({ error: 'HAS_TEAMMATES', organizationName: orgName }), { status: 400 });
      }
    }

    // Safe to proceed. Solo-owned orgs get deleted along with the account;
    // memberships where this person was just a non-owner participant are
    // simply soft-deleted, leaving those organizations untouched for
    // everyone else.
    for (const membership of memberships ?? []) {
      if (membership.role === 'Owner') {
        await adminClient
          .from('organizations')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', membership.organization_id);
      } else {
        await adminClient
          .from('memberships')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', membership.id);
      }
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
