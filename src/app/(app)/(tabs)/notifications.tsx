import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';

export default function Notifications() {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="notifications-outline" title={t('common.notificationsComingSoon')} />
      </View>
    </Screen>
  );
}
