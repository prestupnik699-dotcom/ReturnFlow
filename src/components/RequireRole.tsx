import type { ReactNode } from 'react';
import type { MembershipRole } from '@/features/auth/services/membership.service';
import { useHasRole } from '@/features/auth/hooks/usePermissions';

type Props = {
  roles: MembershipRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * UI-only convenience: hides children when the user's role in the active
 * organization/store doesn't match. This is NOT a security boundary — the
 * real enforcement is the RLS policies in the database (see docs/DECISIONS.md
 * D-018). Never rely on this alone to protect data.
 */
export function RequireRole({ roles, children, fallback = null }: Props) {
  const allowed = useHasRole(roles);
  return <>{allowed ? children : fallback}</>;
}
