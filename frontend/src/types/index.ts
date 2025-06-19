// Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  emailVerified?: boolean; // Firebase email verification status
  firebaseUid?: string; // Firebase user ID
  avatarUrl?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  companyName?: string;
  nip?: string;
  companyAddress?: string;
  token?: string;
  createdAt: string;
  updatedAt: string;
  manufacturer?: Manufacturer;
  preferences?: {
    theme: string;
    language: string;
    notifications: boolean;
  };
}

export enum UserRole {
  CLIENT = 'client',
  MANUFACTURER = 'manufacturer',
  ADMIN = 'admin'
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  company_name?: string;
  nip?: string;
  company_address?: string;
  data_processing_consent: boolean;
  marketing_consent?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Supporting types for Manufacturer
export interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate?: string;
  expiryDate?: string;
  verificationUrl?: string;
}

export interface Capability {
  id: string;
  name: string;
  category: string;
  description?: string;
  expertise: 'basic' | 'intermediate' | 'advanced' | 'expert';
  certifications?: string[];
}

export interface Industry {
  id: string;
  name: string;
  category: string;
}

// Supporting types for Manufacturer
export interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate?: string;
  expiryDate?: string;
  verificationUrl?: string;
}

export interface Capability {
  id: string;
  name: string;
  category: string;
  description?: string;
  expertise: 'basic' | 'intermediate' | 'advanced' | 'expert';
  certifications?: string[];
}

export interface Industry {
  id: string;
  name: string;
  category: string;
}

// Manufacturer Types
export interface Manufacturer {
  id: string;
  userId: string;
  companyName: string;
  businessName?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  location?: {
    address: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contactEmail?: string;
  contactPhone?: string;
  
  // Performance metrics
  rating?: number;
  reviewCount?: number;
  completedProjects?: number;
  avgDeliveryTime?: string;
  avgResponseTime?: string;
  onTimeRate?: number;
  qualityScore?: number;
  
  // Business info
  foundedYear?: number;
  employeeCount?: string;
  certifications?: Certification[];
  capabilities?: Capability[];
  industries?: Industry[];
  
  // Platform metrics
  memberSince?: string;
  verified?: boolean;
  premiumMember?: boolean;
  recentActivity?: string;
  
  // Settings
  isActive: boolean;
  acceptsRushOrders?: boolean;
  minOrderValue?: number;
  maxOrderValue?: number;
  
  createdAt: string;
  updatedAt: string;
}

export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  CORPORATION = 'corporation',
  LLC = 'llc'
}

export interface ManufacturingCapability {
  id: number;
  name: string;
  category: CapabilityCategory;
  description?: string;
  materials: string[];
  processes: string[];
  minQuantity: number;
  maxQuantity: number;
  leadTimeMin: number;
  leadTimeMax: number;
  qualityCertifications: string[];
}

export enum CapabilityCategory {
  // Machining & Cutting
  CNC_MACHINING = 'cnc_machining',
  TURNING = 'turning',
  MILLING = 'milling',
  GRINDING = 'grinding',
  EDM = 'edm',
  LASER_CUTTING = 'laser_cutting',
  PLASMA_CUTTING = 'plasma_cutting',
  WATERJET_CUTTING = 'waterjet_cutting',
  
  // Additive Manufacturing
  ADDITIVE_MANUFACTURING = 'additive_manufacturing',
  FDM_3D_PRINTING = 'fdm_3d_printing',
  SLA_3D_PRINTING = 'sla_3d_printing',
  SLS_3D_PRINTING = 'sls_3d_printing',
  METAL_3D_PRINTING = 'metal_3d_printing',
  
  // Molding & Forming
  INJECTION_MOLDING = 'injection_molding',
  BLOW_MOLDING = 'blow_molding',
  COMPRESSION_MOLDING = 'compression_molding',
  ROTATIONAL_MOLDING = 'rotational_molding',
  THERMOFORMING = 'thermoforming',
  VACUUM_FORMING = 'vacuum_forming',
  
  // Sheet Metal & Fabrication
  SHEET_METAL = 'sheet_metal',
  METAL_STAMPING = 'metal_stamping',
  METAL_BENDING = 'metal_bending',
  ROLL_FORMING = 'roll_forming',
  DEEP_DRAWING = 'deep_drawing',
  HYDROFORMING = 'hydroforming',
  
  // Casting & Foundry
  CASTING = 'casting',
  SAND_CASTING = 'sand_casting',
  INVESTMENT_CASTING = 'investment_casting',
  DIE_CASTING = 'die_casting',
  PRESSURE_DIE_CASTING = 'pressure_die_casting',
  CENTRIFUGAL_CASTING = 'centrifugal_casting',
  
  // Joining & Welding
  WELDING = 'welding',
  TIG_WELDING = 'tig_welding',
  MIG_WELDING = 'mig_welding',
  ARC_WELDING = 'arc_welding',
  SPOT_WELDING = 'spot_welding',
  LASER_WELDING = 'laser_welding',
  BRAZING = 'brazing',
  SOLDERING = 'soldering',
  
  // Assembly & Integration
  ASSEMBLY = 'assembly',
  MECHANICAL_ASSEMBLY = 'mechanical_assembly',
  ELECTRONIC_ASSEMBLY = 'electronic_assembly',
  PCB_ASSEMBLY = 'pcb_assembly',
  CABLE_ASSEMBLY = 'cable_assembly',
  
  // Surface Treatment & Finishing
  FINISHING = 'finishing',
  ANODIZING = 'anodizing',
  ELECTROPLATING = 'electroplating',
  POWDER_COATING = 'powder_coating',
  PAINTING = 'painting',
  SANDBLASTING = 'sandblasting',
  POLISHING = 'polishing',
  HEAT_TREATMENT = 'heat_treatment',
  COATING = 'coating',
  
  // Textiles & Soft Goods
  TEXTILE_MANUFACTURING = 'textile_manufacturing',
  SEWING = 'sewing',
  KNITTING = 'knitting',
  WEAVING = 'weaving',
  EMBROIDERY = 'embroidery',
  SCREEN_PRINTING = 'screen_printing',
  DIGITAL_PRINTING = 'digital_printing',
  
  // Specialized Processes
  RUBBER_MOLDING = 'rubber_molding',
  CERAMIC_MANUFACTURING = 'ceramic_manufacturing',
  GLASS_MANUFACTURING = 'glass_manufacturing',
  COMPOSITE_MANUFACTURING = 'composite_manufacturing',
  WOODWORKING = 'woodworking',
  FOAM_CUTTING = 'foam_cutting',
  EXTRUSION = 'extrusion',
  FORGING = 'forging',
  
  // Electronics & Technology
  CIRCUIT_BOARD_MANUFACTURING = 'circuit_board_manufacturing',
  SEMICONDUCTOR_ASSEMBLY = 'semiconductor_assembly',
  CABLE_HARNESS = 'cable_harness',
  MICROELECTRONICS = 'microelectronics',
  
  // Quality & Testing
  QUALITY_CONTROL = 'quality_control',
  TESTING_SERVICES = 'testing_services',
  INSPECTION = 'inspection',
  METROLOGY = 'metrology',
  
  // Packaging & Fulfillment
  PACKAGING = 'packaging',
  LABELING = 'labeling',
  KITTING = 'kitting',
  FULFILLMENT = 'fulfillment'
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Address and Contact Types
export interface Address {
  id?: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface ContactInfo {
  email: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  linkedIn?: string;
}

// Order Types
export interface Order {
  id: string;
  clientId: string;
  manufacturerId?: string;
  title: string;
  description: string;
  category: CapabilityCategory;
  specifications: OrderSpecification[];
  files: OrderFile[];
  targetPrice?: number;
  targetPriceMax?: number;
  currency: string;
  quantity: number;
  deliveryDate: string;
  deliveryDeadline?: string;
  deliveryAddress: Address;
  status: OrderStatus;
  urgency: UrgencyLevel;
  isPublic: boolean;
  quotesCount: number;
  selectedQuoteId?: number;
  totalAmount?: number;
  budgetPln?: number;
  material?: string;
  preferredLocation?: string;
  attachments?: OrderFile[];
  createdAt: string;
  updatedAt: string;
  quotedAt?: string;
  confirmedAt?: string;
  productionStartedAt?: string;
  qualityCheckAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  client?: User;
  manufacturer?: Manufacturer;
  quotes: Quote[];
  selectedQuote?: Quote;
  transactions: Transaction[];
}

export interface OrderSpecification {
  id: number;
  name: string;
  value: string;
  unit?: string;
  tolerance?: string;
  isRequired: boolean;
  description?: string;
}

export interface OrderFile {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  description?: string;
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  QUOTED = 'quoted',
  CONFIRMED = 'confirmed',
  AWARDED = 'awarded',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_COMPLETED = 'payment_completed',
  IN_PRODUCTION = 'in_production',
  QUALITY_CHECK = 'quality_check',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Quote Types
export interface Quote {
  id: string;
  orderId: string;
  manufacturerId: string;
  manufacturer?: Manufacturer;
  totalAmount: number;
  currency: string;
  deliveryTime: number; // in days
  validUntil?: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  
  // Quote details
  quantity?: number;
  material?: string;
  finish?: string;
  tolerance?: string;
  process?: string;
  paymentTerms?: string;
  shippingMethod?: string;
  warranty?: string;
  notes?: string;
  
  // Cost breakdown
  breakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
    total: number;
    currency?: string;
  };
  
  // Additional fields for comparison
  score?: number;
  tco?: number;
  evaluation?: QuoteEvaluation;
}

export interface PriceBreakdown {
  materials: number;
  labor: number;
  overhead: number;
  shipping: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface QuoteAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Payment Types
export interface Transaction {
  id: number;
  orderId?: number;
  quoteId?: number;
  clientId: number;
  manufacturerId?: number;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  commission: number;
  fees: TransactionFees;
  region: PaymentRegion;
  paymentMethod?: PaymentMethodDetails;
  stripePaymentIntentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionType {
  ORDER_PAYMENT = 'order_payment',
  COMMISSION = 'commission',
  PAYOUT = 'payout',
  REFUND = 'refund',
  SUBSCRIPTION = 'subscription',
  INVOICE = 'invoice'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export interface TransactionFees {
  stripe: number;
  crossBorder: number;
  currencyConversion: number;
  total: number;
}

export enum PaymentRegion {
  US = 'us',
  EU = 'eu',
  UK = 'uk',
  OTHER = 'other'
}

export interface PaymentMethodDetails {
  type: string;
  card?: {
    brand: string;
    last4: string;
    country: string;
    funding: string;
  };
}

export interface StripeConnectAccount {
  id: number;
  manufacturerId: number;
  stripeAccountId: string;
  accountType: ConnectAccountType;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country: string;
  defaultCurrency: string;
  requirements: ConnectAccountRequirements;
}

export enum ConnectAccountType {
  EXPRESS = 'express',
  STANDARD = 'standard',
  CUSTOM = 'custom'
}

export interface ConnectAccountRequirements {
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
}

// Subscription Types
export interface Subscription {
  id: number;
  userId: number;
  manufacturerId?: number;
  stripeSubscriptionId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: BillingInterval;
  usage: SubscriptionUsage;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: SubscriptionLimits;
  pricing: {
    monthly: number;
    yearly: number;
  };
}

export interface SubscriptionLimits {
  monthlyQuotes: number;
  commissionRate: number;
  priorityListing: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
}

export interface SubscriptionUsage {
  quotesCreated: number;
  apiCalls: number;
  storageUsed: number;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing'
}

export enum BillingInterval {
  MONTH = 'month',
  YEAR = 'year'
}

// Dashboard Types
export interface DashboardStats {
  orders: OrderStats;
  quotes: QuoteStats;
  revenue: RevenueStats;
  performance: PerformanceStats;
}

export interface OrderStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  recentOrders: Order[];
}

export interface QuoteStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  winRate: number;
  averageValue: number;
  recentQuotes: Quote[];
}

export interface RevenueStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  currency: string;
  breakdown: RevenueBreakdown[];
}

export interface RevenueBreakdown {
  period: string;
  amount: number;
  orders: number;
}

export interface PerformanceStats {
  rating: number;
  reviewCount: number;
  onTimeDelivery: number;
  qualityScore: number;
  responseTime: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

// Form Types
export interface CreateOrderForm {
  title: string;
  description: string;
  category: CapabilityCategory;
  specifications: Omit<OrderSpecification, 'id'>[];
  files: File[];
  targetPrice?: number;
  targetPriceMax?: number;
  currency: string;
  quantity: number;
  deliveryDate: string;
  deliveryAddress: Omit<Address, 'id'>;
  urgency: UrgencyLevel;
  isPublic: boolean;
}

export interface CreateQuoteForm {
  orderId: number;
  price: number;
  currency: string;
  leadTime: number;
  validUntil: string;
  notes?: string;
  breakdown: Omit<PriceBreakdown, 'total'>;
  attachments: File[];
}

export interface ManufacturerProfileForm {
  businessName: string;
  businessType: BusinessType;
  description: string;
  website?: string;
  certifications: string[];
  capabilities: Omit<ManufacturingCapability, 'id'>[];
  location: Omit<Address, 'id'>;
  contactInfo: ContactInfo;
}

// UI Component Types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ComponentType<any>;
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ComponentType<any>;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  options?: SelectOption[];
  placeholder?: string;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  fontScale: 'sm' | 'md' | 'lg';
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

// File Upload Types
export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  multiple: boolean;
  accept?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// Search and Filter Types
export interface SearchFilters {
  search?: string;
  query?: string;
  category?: CapabilityCategory;
  location?: string;
  priceRange?: [number, number];
  urgency?: UrgencyLevel;
  status?: OrderStatus;
  dateRange?: [string, string];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Analytics Types
export interface AnalyticsData {
  period: string;
  metrics: AnalyticsMetric[];
  chartData: ChartDataPoint[];
  insights: AnalyticsInsight[];
}

export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'currency' | 'percentage';
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: {
    label: string;
    url: string;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface OrderUpdate extends WebSocketMessage {
  type: 'order_update';
  payload: {
    orderId: number;
    status: OrderStatus;
    message: string;
  };
}

export interface QuoteUpdate extends WebSocketMessage {
  type: 'quote_update';
  payload: {
    quoteId: number;
    orderId: number;
    status: QuoteStatus;
    manufacturerId: number;
  };
}

export interface PaymentUpdate extends WebSocketMessage {
  type: 'payment_update';
  payload: {
    transactionId: number;
    status: TransactionStatus;
    orderId?: number;
  };
}

// Additional types for enhanced order management system

// Message types for real-time communication
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: string;
  createdAt: string;
  read: boolean;
  type: 'text' | 'file' | 'system';
  metadata?: Record<string, any>;
  attachments?: {
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
}

// Order Update types for real-time tracking
export interface OrderUpdateEvent {
  id: string;
  orderId: string;
  type: 'status_change' | 'message' | 'document' | 'payment' | 'quote';
  message: string;
  data?: any;
  timestamp: string;
  userId: string;
  userName: string;
}

// Enhanced Quote types
export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
}

// Manufacturing Analytics types
export interface ManufacturerStats {
  activeOrders: number;
  monthlyRevenue: number;
  avgResponseTime: number; // hours
  averageRating: number;
  totalReviews: number;
  ordersGrowth: number; // percentage
  revenueGrowth: number; // percentage
  responseTimeImprovement: number; // percentage
  capacityUtilization: number; // percentage
  onTimeDeliveryRate: number; // percentage
}

// Extended DashboardStats with manufacturer-specific properties
export interface ExtendedDashboardStats extends DashboardStats {
  activeOrders?: number;
  monthlyRevenue?: number;
  avgResponseTime?: number;
  averageRating?: number;
  totalReviews?: number;
  ordersGrowth?: number;
  revenueGrowth?: number;
  responseTimeImprovement?: number;
  successRate?: number;
}

export interface ProductionCapacity {
  capabilities: {
    category: CapabilityCategory;
    maxCapacity: number;
    currentUtilization: number; // percentage
    availableCapacity?: number;
    averageLeadTime: number; // days
  }[];
  totalCapacity: number;
  totalUtilization: number;
  nextAvailableSlot: string;
}

// File upload types
export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

// Enhanced search and filter types
export interface AdvancedSearchFilters {
  search?: string;
  status?: OrderStatus | OrderStatus[];
  category?: CapabilityCategory | CapabilityCategory[];
  urgency?: UrgencyLevel | UrgencyLevel[];
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  manufacturerId?: string;
  clientId?: string;
  hasManufacturer?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Notification types
export interface SystemNotification {
  id: string;
  userId: string;
  type: 'order_update' | 'quote_received' | 'payment_update' | 'message' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

// Offline support types
export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// API utility types
export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
}

// New interfaces for quote comparison system

export interface QuoteEvaluation {
  id: string;
  quoteId: string;
  userId: string;
  user?: User;
  rating: number;
  pros: string[];
  cons: string[];
  notes: string;
  recommendation: 'approve' | 'reject' | 'conditional';
  riskAssessment?: 'low' | 'medium' | 'high';
  complianceScore?: number;
  favorited: boolean;
  internalComments: string[];
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
}

export interface QuoteQuestion {
  id: string;
  quoteId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  question: string;
  timestamp: string;
  answer?: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
  };
  status: 'pending' | 'answered' | 'escalated';
  category: 'technical' | 'pricing' | 'delivery' | 'quality' | 'general';
  upvotes: number;
  hasUpvoted: boolean;
}

export interface QuoteDocument {
  id: string;
  quoteId: string;
  name: string;
  type: 'pdf' | 'image' | 'cad' | 'specification';
  size: number;
  url: string;
  uploadedAt: string;
  description?: string;
  uploadedBy?: string;
}

export interface QuoteNote {
  id: string;
  quoteId: string;
  userId: string;
  user?: User;
  content: string;
  type: 'internal' | 'shared';
  timestamp: string;
  editedAt?: string;
}

export interface ComparisonCriteria {
  price: number;
  delivery: number;
  quality: number;
  reliability: number;
  compliance: number;
}

export interface RiskFactor {
  id: string;
  title: string;
  description: string;
  weight: number;
  score: number; // 0-100, higher is riskier
  category: 'financial' | 'operational' | 'compliance' | 'reputational';
}

export interface ComplianceItem {
  id: string;
  title: string;
  required: boolean;
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
  description: string;
  evidenceUrl?: string;
}

export interface TCOParameters {
  operatingYears: number;
  maintenanceCost: number; // percentage of initial cost
  energyCost: number; // percentage of initial cost
  disposalCost: number; // percentage of initial cost
  inflationRate: number; // annual rate
  discountRate?: number; // for NPV calculations
}

export interface TCOBreakdown {
  initial: number;
  maintenance: number;
  energy: number;
  disposal: number;
  total: number;
  npv?: number; // Net Present Value
}

export interface QuoteRecommendation {
  quoteId: string;
  score: number;
  rank: number;
  reasoning: string[];
  strengths: string[];
  concerns: string[];
  recommendation: 'strongly_recommended' | 'recommended' | 'conditional' | 'not_recommended';
}

export interface CollaborativeSession {
  id: string;
  orderId: string;
  participants: TeamMember[];
  evaluations: QuoteEvaluation[];
  discussions: Discussion[];
  status: 'active' | 'completed' | 'cancelled';
  deadline?: string;
  finalDecision?: {
    selectedQuoteId: string;
    decidedBy: string;
    decidedAt: string;
    reasoning: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department: string;
  status: 'online' | 'offline' | 'away';
  permissions: string[];
}

export interface Discussion {
  id: string;
  quoteId: string;
  userId: string;
  user: TeamMember;
  message: string;
  timestamp: string;
  replies: Discussion[];
  type: 'comment' | 'question' | 'concern' | 'approval';
  attachments?: QuoteDocument[];
}

export interface AuditTrailEntry {
  id: string;
  entityType: 'quote' | 'evaluation' | 'decision';
  entityId: string;
  action: string;
  userId: string;
  user?: User;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DecisionMatrix {
  criteria: ComparisonCriteria;
  quotes: {
    quoteId: string;
    scores: Record<string, number>;
    weightedScore: number;
    rank: number;
  }[];
  methodology: string;
  calculatedAt: string;
  calculatedBy: string;
}

export interface ProcurementWorkflow {
  id: string;
  orderId: string;
  steps: WorkflowStep[];
  currentStepId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated';
  approvers: TeamMember[];
  requiredApprovals: number;
  receivedApprovals: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'approval' | 'review' | 'validation' | 'notification';
  assignedTo: TeamMember[];
  status: 'pending' | 'completed' | 'skipped';
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  requirements?: string[];
}

// Add after Quote interface
export interface QuoteCreate {
  order_id: number;  // Match backend: int instead of string
  price: number;     // Match backend: 'price' instead of 'totalAmount'
  currency: string;
  delivery_days: number;  // Match backend: 'delivery_days' instead of 'deliveryTime'
  description: string;
  includes_shipping?: boolean;
  payment_terms?: string;
  notes?: string;
  
  // Enhanced fields to match backend
  material?: string;
  process?: string;
  finish?: string;
  tolerance?: string;
  quantity?: number;
  shipping_method?: string;
  warranty?: string;
  breakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
    total: number;
  };
  valid_until?: string;
}

// Quote negotiation interfaces
export interface QuoteNegotiation {
  quote_id: number;
  message: string;
  requested_price?: number;
  requested_delivery_days?: number;
  changes_requested?: Record<string, any>;
}

export interface QuoteNegotiationResponse {
  id: number;
  quote_id: number;
  message: string;
  requested_price?: number;
  requested_delivery_days?: number;
  changes_requested?: Record<string, any>;
  created_at: string;
  created_by: number;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offered';
}

export interface QuoteRevision {
  original_quote_id: number;
  price: number;
  delivery_days: number;
  description: string;
  changes_made: string;
  revision_notes?: string;
  breakdown?: {
    materials: number;
    labor: number;
    overhead: number;
    shipping: number;
    taxes: number;
    total: number;
  };
}

// File attachment interfaces
export interface QuoteAttachment {
  id: number;
  name: string;
  original_name: string;
  size: number;
  type: string;
  description?: string;
  created_at: string;
  url: string;
}

// Notification interfaces
export interface QuoteNotification {
  id: string;
  user_id: string;
  quote_id: string;
  type: 'new_quote' | 'quote_accepted' | 'quote_rejected' | 'negotiation_request' | 'quote_revised';
  title: string;
  message: string;
  read: boolean;
  read_at?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Enhanced Quote status to match backend
export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  SUBMITTED = 'submitted',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn',
  SUPERSEDED = 'superseded',
  NEGOTIATING = 'negotiating'
}

// Production Quote Types
export enum QuoteType {
  ORDER_RESPONSE = 'order_response',
  PRODUCTION_OFFER = 'production_offer'
}

export enum ProductionQuoteType {
  CAPACITY_AVAILABILITY = 'capacity_availability',
  STANDARD_PRODUCT = 'standard_product',
  PROMOTIONAL = 'promotional',
  PROTOTYPE_RD = 'prototype_rd'
}

export interface ProductionQuote {
  id: number;
  manufacturerId: number;
  manufacturer?: Manufacturer;
  productionQuoteType: ProductionQuoteType;
  title: string;
  description?: string;
  
  // Availability & Timing
  availableFrom?: string;
  availableUntil?: string;
  leadTimeDays?: number;
  
  // Pricing Structure
  pricingModel: 'fixed' | 'hourly' | 'per_unit' | 'tiered';
  basePrice?: number;
  pricingDetails: Record<string, any>;
  currency: string;
  
  // Capabilities & Specifications
  manufacturingProcesses: string[];
  materials: string[];
  certifications: string[];
  specialties: string[];
  
  // Constraints
  minimumQuantity?: number;
  maximumQuantity?: number;
  minimumOrderValue?: number;
  maximumOrderValue?: number;
  
  // Geographic preferences
  preferredCountries: string[];
  shippingOptions: string[];
  
  // Visibility & Status
  isPublic: boolean;
  isActive: boolean;
  priorityLevel: number;
  
  // Terms and conditions
  paymentTerms?: string;
  warrantyTerms?: string;
  specialConditions?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  
  // Analytics
  viewCount: number;
  inquiryCount: number;
  conversionCount: number;
  lastViewedAt?: string;
  
  // Additional features
  tags: string[];
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  sampleImages: string[];
  
  // Computed properties
  isValid: boolean;
  isAvailableNow: boolean;
}

export interface ProductionQuoteCreate {
  productionQuoteType: ProductionQuoteType;
  title: string;
  description?: string;
  
  // Availability & Timing
  availableFrom?: string;
  availableUntil?: string;
  leadTimeDays?: number;
  
  // Pricing Structure
  pricingModel: 'fixed' | 'hourly' | 'per_unit' | 'tiered';
  basePrice?: number;
  pricingDetails: Record<string, any>;
  currency?: string;
  
  // Capabilities & Specifications
  manufacturingProcesses: string[];
  materials: string[];
  certifications: string[];
  specialties: string[];
  
  // Constraints
  minimumQuantity?: number;
  maximumQuantity?: number;
  minimumOrderValue?: number;
  maximumOrderValue?: number;
  
  // Geographic preferences
  preferredCountries: string[];
  shippingOptions: string[];
  
  // Visibility & Status
  isPublic?: boolean;
  priorityLevel?: number;
  
  // Terms and conditions
  paymentTerms?: string;
  warrantyTerms?: string;
  specialConditions?: string;
  
  // Metadata
  expiresAt?: string;
  
  // Additional features
  tags: string[];
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  sampleImages: string[];
}

export interface ProductionQuoteUpdate {
  title?: string;
  description?: string;
  availableFrom?: string;
  availableUntil?: string;
  leadTimeDays?: number;
  pricingModel?: 'fixed' | 'hourly' | 'per_unit' | 'tiered';
  basePrice?: number;
  pricingDetails?: Record<string, any>;
  manufacturingProcesses?: string[];
  materials?: string[];
  certifications?: string[];
  specialties?: string[];
  minimumQuantity?: number;
  maximumQuantity?: number;
  minimumOrderValue?: number;
  maximumOrderValue?: number;
  preferredCountries?: string[];
  shippingOptions?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  priorityLevel?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  specialConditions?: string;
  expiresAt?: string;
  tags?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  sampleImages?: string[];
}

export interface ProductionQuoteInquiry {
  id: number;
  productionQuoteId: number;
  clientId: number;
  client?: User;
  
  // Inquiry details
  message: string;
  estimatedQuantity?: number;
  estimatedBudget?: number;
  timeline?: string;
  
  // Requirements
  specificRequirements: Record<string, any>;
  preferredDeliveryDate?: string;
  
  // Status and response
  status: 'pending' | 'responded' | 'converted' | 'closed';
  manufacturerResponse?: string;
  respondedAt?: string;
  
  // Conversion tracking
  convertedToOrderId?: number;
  convertedToQuoteId?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ProductionQuoteInquiryCreate {
  message: string;
  estimatedQuantity?: number;
  estimatedBudget?: number;
  timeline?: string;
  specificRequirements?: Record<string, any>;
  preferredDeliveryDate?: string;
}

export interface ProductionQuoteInquiryUpdate {
  manufacturerResponse: string;
  status?: 'pending' | 'responded' | 'converted' | 'closed';
}

export interface ProductionQuoteFilters {
  productionQuoteType?: ProductionQuoteType;
  manufacturingProcesses?: string[];
  materials?: string[];
  certifications?: string[];
  specialties?: string[];
  countries?: string[];
  minPrice?: number;
  maxPrice?: number;
  pricingModel?: string;
  availableFrom?: string;
  availableUntil?: string;
  maxLeadTimeDays?: number;
  requiredQuantity?: number;
  isActive?: boolean;
  isPublic?: boolean;
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'priority_level' | 'view_count' | 'base_price';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProductionQuoteMatch {
  productionQuote: ProductionQuote;
  matchScore: number;
  matchReasons: string[];
  estimatedPrice?: number;
  availabilityStatus: string;
}

export interface ProductionQuoteAnalytics {
  totalProductionQuotes: number;
  activeProductionQuotes: number;
  totalViews: number;
  totalInquiries: number;
  totalConversions: number;
  averageConversionRate: number;
  topPerformingQuotes: ProductionQuote[];
  viewsTrend: Array<{ date: string; value: number }>;
  inquiriesTrend: Array<{ date: string; value: number }>;
  conversionsTrend: Array<{ date: string; value: number }>;
}

// Settings Types
export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    orderUpdates: boolean;
    quoteReceived: boolean;
    paymentConfirmation: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    showEmail: boolean;
    showPhone: boolean;
    allowMessaging: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    theme: 'light' | 'dark' | 'auto';
  };
}

// Smart Matching Types
export interface SmartMatch {
  match_id: string;
  match_type: 'order_to_production_quote' | 'production_quote_to_order';
  order_id?: number;
  production_quote_id?: number;
  score: MatchScore;
  estimated_price?: number;
  estimated_delivery_days?: number;
  manufacturer_info: MatchManufacturerInfo;
  created_at: string;
  expires_at?: string;
  real_time_availability?: string;
}

export interface MatchScore {
  total_score: number;
  category_match: number;
  price_compatibility: number;
  timeline_compatibility: number;
  geographic_proximity: number;
  capacity_availability: number;
  manufacturer_rating: number;
  urgency_alignment: number;
  specification_match: number;
  confidence_level: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
  match_reasons: string[];
  potential_issues: string[];
}

export interface MatchManufacturerInfo {
  id: number;
  name: string;
  location?: string;
  rating?: number;
  verified: boolean;
  completed_orders: number;
}

export interface MatchFilters {
  min_score?: number;
  max_price?: number;
  max_delivery_days?: number;
  required_categories?: string[];
  preferred_locations?: string[];
  min_manufacturer_rating?: number;
  verified_only?: boolean;
  confidence_levels?: string[];
}

export interface BatchMatchRequest {
  order_ids: number[];
  limit_per_order?: number;
  min_score?: number;
  filters?: MatchFilters;
}

export interface MatchAnalytics {
  total_matches_generated: number;
  successful_connections: number;
  average_match_score: number;
  top_matching_categories: Array<{
    category: string;
    match_count: number;
    average_score?: number;
    conversion_rate?: number;
  }>;
  conversion_rate: number;
  average_response_time_hours: number;
  user_satisfaction_score: number;
  match_quality_trends?: Array<{
    date: string;
    average_score: number;
    match_count: number;
  }>;
  geographic_distribution?: Record<string, number>;
}

export interface MatchFeedback {
  match_id: string;
  feedback_type: 'helpful' | 'not_helpful' | 'contacted' | 'converted' | 'irrelevant';
  rating?: number;
  comment?: string;
  contacted_manufacturer?: boolean;
  resulted_in_quote?: boolean;
  resulted_in_order?: boolean;
}

export interface LiveMatchRequest {
  order_id: number;
  include_capacity_check?: boolean;
  priority_boost?: number;
}

export interface RecommendationRequest {
  user_preferences?: Record<string, any>;
  include_historical?: boolean;
  boost_new_manufacturers?: boolean;
  limit?: number;
}

export interface MatchNotification {
  notification_id: string;
  match_id: string;
  recipient_id: number;
  notification_type: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  expires_at?: string;
  action_url?: string;
} 