import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';

const { width } = Dimensions.get('window');

type Slide = { icon: keyof typeof Ionicons.glyphMap; titleKey: string; bodyKey: string };

const SLIDES: Slide[] = [
  {
    icon: 'sparkles-outline',
    titleKey: 'onboarding.slide1Title',
    bodyKey: 'onboarding.slide1Body',
  },
  { icon: 'repeat-outline', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { icon: 'scan-outline', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
  { icon: 'people-outline', titleKey: 'onboarding.slide4Title', bodyKey: 'onboarding.slide4Body' },
];

type Props = { onFinish: () => void };

export function OnboardingTourScreen({ onFinish }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const styles = createStyles(theme);

  const isLast = index === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.titleKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {item.icon === 'sparkles-outline' ? (
              <Logo size={72} />
            ) : (
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={48} color={theme.colors.primary} />
              </View>
            )}
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.body}>{t(item.bodyKey)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.titleKey} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Button
          label={isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          onPress={handleNext}
        />

        {!isLast ? (
          <Text style={styles.skip} onPress={onFinish}>
            {t('onboarding.skip')}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    slide: {
      width,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    iconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xs },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceVariant },
    dotActive: { backgroundColor: theme.colors.primary, width: 20 },
    skip: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary, textAlign: 'center' },
  });
}
