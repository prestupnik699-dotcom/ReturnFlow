import * as Haptics from 'expo-haptics';

// Thin wrappers kept in one place so haptic choices stay consistent across
// the app (e.g. "success" always means the same physical feeling),
// instead of every screen picking its own Haptics.* call ad hoc.

export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export function hapticSelection() {
  Haptics.selectionAsync();
}

export function hapticImpactLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticImpactMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
