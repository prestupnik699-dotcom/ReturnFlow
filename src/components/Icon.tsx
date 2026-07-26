import {
  WarningCircle,
  Archive,
  ArrowUp,
  Bell,
  Suitcase,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  CheckSquare,
  Circle,
  Square,
  Home,
  Menu,
  NavArrowLeft,
  NavArrowRight,
  NavArrowDown,
  NavArrowUp,
  Clock,
  Copy,
  UTurnArrowLeft,
  Download,
  EditPencil,
  Page,
  Filter,
  ViewGrid,
  MediaImage,
  Key,
  MultiplePages,
  List,
  Lock,
  LogOut,
  Mail,
  Maximize,
  ChatBubble,
  Minus,
  Plus,
  PlusCircle,
  Refresh,
  Repeat,
  Search,
  Settings,
  ShareAndroid,
  ShoppingBag,
  Star,
  Trash,
  StatUp,
  CloudUpload,
  User,
  UserPlus,
  Group,
  Xmark,
  XmarkCircle,
  Flash,
} from 'iconoir-react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

// The name union this component accepts — deliberately mirrors the
// Feather/Ionicons name strings already used across the app (e.g.
// "check-circle", "upload-cloud") so migrating a call site is a matter of
// swapping the import and component tag, not rewriting every prop. Names
// not in this map fall back to rendering nothing (with a __DEV__ warning)
// rather than crashing, so a typo surfaces immediately during development
// instead of silently breaking a screen in production.
const ICONS = {
  'alert-circle': WarningCircle,
  archive: Archive,
  'arrow-up': ArrowUp,
  'bar-chart-2': StatUp,
  bell: Bell,
  box: Suitcase,
  briefcase: Suitcase,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  'check-circle': CheckCircle,
  'check-square': CheckSquare,
  circle: Circle,
  square: Square,
  home: Home,
  menu: Menu,
  'chevron-left': NavArrowLeft,
  'chevron-right': NavArrowRight,
  'chevron-down': NavArrowDown,
  'chevron-up': NavArrowUp,
  'chevrons-down': NavArrowDown,
  'edit-2': EditPencil,
  clock: Clock,
  copy: Copy,
  'corner-up-left': UTurnArrowLeft,
  download: Download,
  'edit-3': EditPencil,
  'file-text': Page,
  filter: Filter,
  grid: ViewGrid,
  image: MediaImage,
  key: Key,
  layers: MultiplePages,
  list: List,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  maximize: Maximize,
  'message-circle': ChatBubble,
  minus: Minus,
  plus: Plus,
  'plus-circle': PlusCircle,
  'refresh-cw': Refresh,
  repeat: Repeat,
  search: Search,
  settings: Settings,
  'share-2': ShareAndroid,
  'shopping-bag': ShoppingBag,
  star: Star,
  'trash-2': Trash,
  'trending-up': StatUp,
  'upload-cloud': CloudUpload,
  user: User,
  'user-plus': UserPlus,
  users: Group,
  x: Xmark,
  'x-circle': XmarkCircle,
  zap: Flash,
} as const;

export type IconName = keyof typeof ICONS | 'barcode-outline';

type IconoirProps = ComponentProps<typeof Check>;

type Props = Omit<IconoirProps, 'width' | 'height'> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 24, color, ...rest }: Props) {
  // Kept on Ionicons deliberately — the person specifically preferred
  // this classic barcode-bars glyph over Iconoir's equivalent, so this
  // one name is special-cased rather than following the rest of the map.
  if (name === 'barcode-outline') {
    return <Ionicons name="barcode-outline" size={size} color={color as string} />;
  }

  const Component = ICONS[name];

  if (!Component) {
    if (__DEV__) {
      console.warn(`Icon: unknown name "${name}"`);
    }
    return null;
  }

  return <Component width={size} height={size} color={color} {...rest} />;
}
