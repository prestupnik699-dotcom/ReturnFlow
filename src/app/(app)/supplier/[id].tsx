import { useLocalSearchParams } from 'expo-router';
import { SupplierCatalogScreen } from '@/features/suppliers/screens/SupplierCatalogScreen';

export default function SupplierCatalog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SupplierCatalogScreen supplierId={id} />;
}
