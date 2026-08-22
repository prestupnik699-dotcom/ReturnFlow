import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'returnflow.orderDraft';

// supplierId -> (catalogItemId -> quantity). A global, persisted store —
// not screen-local state — so picking quantities for one supplier,
// switching to browse another, leaving this screen, or even closing the
// app entirely and coming back later must not lose what was already
// chosen. Persisted the same way as biometricLock.store.ts: an explicit
// init()/hydrated pair called once at app startup, rather than a
// middleware wrapper, to keep the read/write path obvious.
type OrderDraftState = {
  drafts: Record<string, Record<string, number>>;
  hydrated: boolean;
  init: () => Promise<void>;
  setQuantity: (supplierId: string, catalogItemId: string, quantity: number) => void;
  removeItem: (supplierId: string, catalogItemId: string) => void;
  clearSupplier: (supplierId: string) => void;
  reset: () => void;
};

async function persist(drafts: Record<string, Record<string, number>>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  drafts: {},
  hydrated: false,
  init: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    let drafts: Record<string, Record<string, number>> = {};
    if (stored) {
      try {
        drafts = JSON.parse(stored);
      } catch {
        // Corrupted or outdated stored shape — starting empty is safer
        // than crashing the app on launch over a stale draft.
        drafts = {};
      }
    }
    set({ drafts, hydrated: true });
  },
  setQuantity: (supplierId, catalogItemId, quantity) => {
    const supplierDraft = { ...(get().drafts[supplierId] ?? {}) };
    if (quantity > 0) {
      supplierDraft[catalogItemId] = quantity;
    } else {
      delete supplierDraft[catalogItemId];
    }
    const drafts = { ...get().drafts, [supplierId]: supplierDraft };
    set({ drafts });
    persist(drafts);
  },
  removeItem: (supplierId, catalogItemId) => {
    get().setQuantity(supplierId, catalogItemId, 0);
  },
  clearSupplier: (supplierId) => {
    const next = { ...get().drafts };
    delete next[supplierId];
    set({ drafts: next });
    persist(next);
  },
  reset: () => {
    set({ drafts: {} });
    persist({});
  },
}));
