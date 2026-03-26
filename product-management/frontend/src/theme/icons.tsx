/**
 * Professional Icon System
 * Maps product categories and features to Lucide React icons
 */

import {
  Home,
  Building,
  Building2,
  TrendingUp,
  BarChart3,
  Shield,
  FileText,
  Phone,
  Calculator,
  Zap,
  Lock,
  Target,
  ChartBar,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  FileCheck,
  Image,
  Mail,
  Calendar,
  DollarSign,
  Award,
  Settings,
  Search,
  ArrowRight,
  ExternalLink,
  Download,
  Upload,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Star,
  Heart,
  Share2,
  Copy,
  Save,
  RefreshCw,
  Filter,
  SortAsc,
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Key,
  Briefcase,
  ClipboardList,
  PieChart,
  LineChart,
  Camera,
  Video,
  Mic,
  MessageCircle,
  Bell,
  BellOff,
  Bookmark,
  Tag,
  Layers,
  Grid,
  List,
  Layout,
  Maximize2,
  Minimize2,
  MoreVertical,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

// Product Category Icons
export const productCategoryIcons: Record<string, LucideIcon> = {
  'Listing Production': Home,
  'Market Intelligence': TrendingUp,
  'Legal Compliance': Shield,
  'CRE Document Intelligence': FileText,
  'AI Voice Receptionist': Phone,
  'Property Management': Building2,
  'CRE Underwriting': Calculator,
  'Real Estate': Building,
  'Virtual Assistant': MessageSquare,
  'IDP': FileCheck,
  'Computer Vision': Image,
};

// Feature Icons
export const featureIcons = {
  // Speed & Performance
  fast: Zap,
  lightning: Zap,
  speed: Zap,
  
  // Security
  security: Lock,
  secure: Lock,
  shield: Shield,
  protection: Shield,
  
  // Customization
  customize: Target,
  custom: Target,
  settings: Settings,
  config: Settings,
  
  // Analytics & Reporting
  analytics: BarChart3,
  reports: ChartBar,
  insights: PieChart,
  trends: LineChart,
  
  // AI & Intelligence
  ai: Sparkles,
  smart: Sparkles,
  intelligent: Sparkles,
  
  // Success & Verification
  success: CheckCircle2,
  verified: CheckCircle2,
  approved: Check,
  
  // Communication
  communication: MessageSquare,
  chat: MessageCircle,
  voice: Mic,
  phone: Phone,
  email: Mail,
  
  // Management
  management: ClipboardList,
  organize: Layers,
  schedule: Calendar,
  
  // Real Estate Specific
  property: Home,
  building: Building,
  listing: Home,
  location: MapPin,
  key: Key,
  
  // Business
  business: Briefcase,
  finance: DollarSign,
  premium: Award,
  
  // User Actions
  search: Search,
  filter: Filter,
  sort: SortAsc,
  edit: Edit3,
  delete: Trash2,
  add: Plus,
  remove: Minus,
  close: X,
  save: Save,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,
  view: Eye,
  copy: Copy,
  share: Share2,
  
  // Navigation
  next: ChevronRight,
  previous: ChevronLeft,
  expand: ChevronDown,
  collapse: ChevronUp,
  external: ExternalLink,
  arrow: ArrowRight,
  
  // Status & Notifications
  notification: Bell,
  muted: BellOff,
  alert: AlertCircle,
  info: Info,
  help: HelpCircle,
  favorite: Star,
  like: Heart,
  bookmark: Bookmark,
  
  // Display & Layout
  grid: Grid,
  list: List,
  layout: Layout,
  expand_view: Maximize2,
  collapse_view: Minimize2,
  menu: Menu,
  more: MoreVertical,
  options: MoreHorizontal,
  
  // Content
  document: FileText,
  image: Image,
  camera: Camera,
  video: Video,
  tag: Tag,
  
  // Time
  time: Clock,
  calendar: Calendar,
  
  // People
  users: Users,
  team: Users,
};

// Product-specific icon mapping
export const getProductIcon = (product: {
  name?: string;
  category?: string;
  subCategory?: string;
  description?: string;
}): LucideIcon => {
  const { name = '', category = '', subCategory = '', description = '' } = product;
  const searchText = `${name} ${category} ${subCategory} ${description}`.toLowerCase();

  // Check subCategory first (most specific)
  if (subCategory && productCategoryIcons[subCategory]) {
    return productCategoryIcons[subCategory];
  }

  // Real Estate products
  if (searchText.includes('listing')) return Home;
  if (searchText.includes('market') || searchText.includes('intelligence')) return TrendingUp;
  if (searchText.includes('compliance') || searchText.includes('legal')) return Shield;
  if (searchText.includes('document')) return FileText;
  if (searchText.includes('voice') || searchText.includes('receptionist')) return Phone;
  if (searchText.includes('property') || searchText.includes('tenant')) return Building2;
  if (searchText.includes('underwriting') || searchText.includes('deal')) return Calculator;
  if (searchText.includes('real estate') || searchText.includes('cre')) return Building;

  // Fallback to category
  if (category && productCategoryIcons[category]) {
    return productCategoryIcons[category];
  }

  // Default fallback
  return Building;
};

// Helper component for feature icons with consistent styling
export interface IconWrapperProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
}

export const renderIcon = (
  IconComponent: LucideIcon,
  size: number = 24,
  color?: string,
  strokeWidth: number = 2
) => {
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};

export default {
  productCategoryIcons,
  featureIcons,
  getProductIcon,
  renderIcon,
};
