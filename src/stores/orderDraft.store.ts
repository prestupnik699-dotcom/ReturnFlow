import { create } from 'zustand';

// supplierId -> (catalogItemId -> quantity). Deliberately a plain global
// store (not screen-local state) — the whole point is that picking
// quantities for one supplier, switching to browse another, then coming
// back later must not lose what was already chosen. This is what fixes
// the earlier "quantities reset when you leave the screen" behavior.
type OrderDraftState = {
  drafts: Record<string, Record<string, number>>;
  setQuantity: (supplierId: string, catalogItemId: string, quantity: number) => void;
  clearSupplier: (supplierId: string) => void;
  reset: () => void;
};

export const useOrderDraftStore = create<OrderDraftState>((set) => ({
  drafts: {},
  setQuantity: (supplierId, catalogItemId, quantity) =>
    set((state) => {
      const supplierDraft = { ...(state.drafts[supplierId] ?? {}) };
      if (quantity > 0) {
        supplierDraft[catalogItemId] = quantity;
      } else {
        delete supplierDraft[catalogItemId];
      }
      return { drafts: { ...state.drafts, [supplierId]: supplierDraft } };
    }),
  clearSupplier: (supplierId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[supplierId];
      return { drafts: next };
    }),
  reset: () => set({ drafts: {} }),
}));
