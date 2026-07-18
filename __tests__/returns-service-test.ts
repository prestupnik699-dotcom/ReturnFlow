// returns.service.ts imports the real @/lib/supabase client, which
// throws at import time if EXPO_PUBLIC_SUPABASE_URL/ANON_KEY aren't set
// and also pulls in native modules (AsyncStorage). Mocking it here keeps
// this test focused on the pure initialStatusForPriority logic without
// needing real env vars or touching the network.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import { initialStatusForPriority } from '@/features/returns/services/returns.service';

describe('initialStatusForPriority', () => {
  it('keeps low priority as pending', () => {
    expect(initialStatusForPriority('low')).toBe('pending');
  });

  it('keeps normal priority as pending', () => {
    expect(initialStatusForPriority('normal')).toBe('pending');
  });

  // This is the exact rule agreed with the user: high/critical priority
  // auto-promotes to the "urgent" status tab, since there is no separate
  // manual "mark as urgent" action anywhere in the UI.
  it('promotes high priority to urgent', () => {
    expect(initialStatusForPriority('high')).toBe('urgent');
  });

  it('promotes critical priority to urgent', () => {
    expect(initialStatusForPriority('critical')).toBe('urgent');
  });
});
