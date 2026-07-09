import { useLocalSearchParams } from 'expo-router';
import { ReturnDetailScreen } from '@/features/returns/screens/ReturnDetailScreen';

export default function ReturnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReturnDetailScreen returnId={id} />;
}
