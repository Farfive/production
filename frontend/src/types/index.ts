// Authentication Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  manufacturer?: Manufacturer;
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
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  country?: string;
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
  CNC_MACHINING = 'cnc_machining',
  ADDITIVE_MANUFACTURING = 'additive_manufacturing',
  INJECTION_MOLDING = 'injection_molding',
  SHEET_METAL = 'sheet_metal',
  CASTING = 'casting',
  WELDING = 'welding',
  ASSEMBLY = 'assembly',
  FINISHING = 'finishing'
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
  deliveryAddress: Address;
  status: OrderStatus;
  urgency: UrgencyLevel;
  isPublic: boolean;
  quotesCount: number;
  selectedQuoteId?: number;
  totalAmount?: number;
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
    currency: string;
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

export enum QuoteStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  SELECTED = 'selected',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
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
    message?: string;
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

export interface ProductionCapacity {
  capabilities: {
    category: CapabilityCategory;
    maxCapacity: number;
    currentUtilization: number; // percentage
    availableCapacity: number;
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