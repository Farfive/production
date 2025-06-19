import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import type { Quote, AuditTrailEntry } from '../types';

/**
 * Combine class names with clsx and merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
}

/**
 * Format percentages
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file sizes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format dates consistently across the app
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return 'Invalid date';
    return format(parsedDate, formatStr);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return 'Invalid date';
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (match) => match.toUpperCase())
    .trim();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy: any = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

/**
 * Generate a random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sleep/delay function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Download file from URL
 */
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (filename) link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if file type is allowed
 */
export function isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    return file.type.match(type);
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Generate color from string (for avatars, etc.)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status: string): string {
  return status
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Order statuses
    draft: 'text-gray-600 bg-gray-100',
    published: 'text-blue-600 bg-blue-100',
    quoted: 'text-yellow-600 bg-yellow-100',
    awarded: 'text-purple-600 bg-purple-100',
    payment_pending: 'text-orange-600 bg-orange-100',
    payment_completed: 'text-green-600 bg-green-100',
    in_production: 'text-indigo-600 bg-indigo-100',
    quality_check: 'text-pink-600 bg-pink-100',
    shipped: 'text-teal-600 bg-teal-100',
    delivered: 'text-green-600 bg-green-100',
    completed: 'text-green-700 bg-green-200',
    cancelled: 'text-red-600 bg-red-100',
    disputed: 'text-red-700 bg-red-200',
    
    // Quote statuses
    submitted: 'text-blue-600 bg-blue-100',
    selected: 'text-green-600 bg-green-100',
    rejected: 'text-red-600 bg-red-100',
    expired: 'text-gray-600 bg-gray-100',
    withdrawn: 'text-orange-600 bg-orange-100',
    
    // Payment statuses
    pending: 'text-yellow-600 bg-yellow-100',
    processing: 'text-blue-600 bg-blue-100',
    succeeded: 'text-green-600 bg-green-100',
    failed: 'text-red-600 bg-red-100',
    refunded: 'text-purple-600 bg-purple-100',
  };
  
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

/**
 * Get urgency color class
 */
export function getUrgencyColor(urgency: string): string {
  const urgencyColors: Record<string, string> = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    urgent: 'text-red-600 bg-red-100',
  };
  
  return urgencyColors[urgency.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Round number to specific decimal places
 */
export function roundTo(num: number, decimals: number): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Generate array of numbers in range
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Group array items by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array of objects by key
 */
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Remove duplicates from array of objects by key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Calculate Total Cost of Ownership for a quote
 */
export function calculateTotalCostOfOwnership(
  quote: Quote,
  parameters: {
    operatingYears?: number;
    maintenanceCost?: number;
    energyCost?: number;
    disposalCost?: number;
    inflationRate?: number;
    discountRate?: number;
  } = {}
): number {
  const {
    operatingYears = 3,
    maintenanceCost = 0.05, // 5% of initial cost per year
    energyCost = 0.02, // 2% of initial cost per year
    disposalCost = 0.01, // 1% of initial cost
    inflationRate = 0.03, // 3% annual inflation
    discountRate = 0.05, // 5% discount rate for NPV
  } = parameters;

  const initialCost = quote.totalAmount;
  const annualMaintenance = initialCost * maintenanceCost;
  const annualEnergy = initialCost * energyCost;
  const disposal = initialCost * disposalCost;

  let totalTco = initialCost;

  // Calculate NPV of future costs
  for (let year = 1; year <= operatingYears; year++) {
    const yearlyOperatingCost = (annualMaintenance + annualEnergy) * Math.pow(1 + inflationRate, year - 1);
    const presentValue = yearlyOperatingCost / Math.pow(1 + discountRate, year);
    totalTco += presentValue;
  }

  // Add disposal cost at end of life
  totalTco += disposal / Math.pow(1 + discountRate, operatingYears);

  return Math.round(totalTco * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate risk score for a quote based on various factors
 */
export function calculateRiskScore(quote: Quote): {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: Array<{ name: string; score: number; weight: number }>;
} {
  const factors = [
    {
      name: 'Financial Stability',
      score: quote.manufacturer?.reviewCount && quote.manufacturer.reviewCount > 10 ? 20 : 60,
      weight: 0.25,
    },
    {
      name: 'Delivery Risk',
      score: quote.deliveryTime > 30 ? 60 : 20,
      weight: 0.20,
    },
    {
      name: 'Quality Risk',
      score: (quote.manufacturer?.rating || 0) < 4 ? 70 : 25,
      weight: 0.20,
    },
    {
      name: 'Price Risk',
      score: quote.totalAmount > 10000 ? 40 : 20,
      weight: 0.15,
    },
    {
      name: 'Communication Risk',
      score: quote.manufacturer?.avgResponseTime ? 20 : 50,
      weight: 0.10,
    },
    {
      name: 'Reputation Risk',
      score: (quote.manufacturer?.rating || 0) < 3 ? 80 : 20,
      weight: 0.10,
    },
  ];

  const weightedScore = factors.reduce((total, factor) => {
    return total + (factor.score * factor.weight);
  }, 0);

  const level = weightedScore > 60 ? 'high' : weightedScore > 40 ? 'medium' : 'low';

  return {
    score: Math.round(weightedScore),
    level,
    factors,
  };
}

/**
 * Generate procurement recommendations based on quote analysis
 */
export function generateRecommendations(
  quotes: Quote[],
  criteria: {
    price: number;
    delivery: number;
    quality: number;
    reliability: number;
    compliance: number;
  }
): Quote[] {
  const scoredQuotes = quotes.map(quote => {
    // Normalize scores to 0-100 scale
    const maxPrice = Math.max(...quotes.map(q => q.totalAmount));
    const maxDelivery = Math.max(...quotes.map(q => q.deliveryTime));
    
    const priceScore = 100 - ((quote.totalAmount / maxPrice) * 100);
    const deliveryScore = 100 - ((quote.deliveryTime / maxDelivery) * 100);
    const qualityScore = ((quote.manufacturer?.rating || 0) / 5) * 100;
    const reliabilityScore = Math.min(100, (quote.manufacturer?.reviewCount || 0) * 2);
    const complianceScore = 85; // Default compliance score

    // Apply weights
    const weightedScore = (
      (priceScore * criteria.price / 100) +
      (deliveryScore * criteria.delivery / 100) +
      (qualityScore * criteria.quality / 100) +
      (reliabilityScore * criteria.reliability / 100) +
      (complianceScore * criteria.compliance / 100)
    );

    return {
      ...quote,
      score: Math.round(weightedScore),
      recommendation: {
        priceScore,
        deliveryScore,
        qualityScore,
        reliabilityScore,
        complianceScore,
        weightedScore,
      },
    };
  });

  return scoredQuotes.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Format business metrics for display
 */
export function formatMetric(
  value: number,
  type: 'currency' | 'percentage' | 'number' | 'rating',
  currency = 'USD'
): string {
  switch (type) {
    case 'currency':
      return formatCurrency(value, currency);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'rating':
      return `${value.toFixed(1)}/5`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

/**
 * Calculate delivery timeline milestones
 */
export function calculateDeliveryMilestones(deliveryTime: number): Array<{
  id: string;
  title: string;
  description: string;
  day: number;
  percentage: number;
}> {
  const productionDays = Math.floor(deliveryTime * 0.7); // 70% for production
  const qualityDays = Math.floor(deliveryTime * 0.1); // 10% for quality check
  // const shippingDays = deliveryTime - productionDays - qualityDays; // Remaining for shipping

  return [
    {
      id: 'order-confirmation',
      title: 'Order Confirmation',
      description: 'Quote accepted and order confirmed',
      day: 0,
      percentage: 0,
    },
    {
      id: 'production-start',
      title: 'Production Start',
      description: 'Manufacturing process begins',
      day: 1,
      percentage: 5,
    },
    {
      id: 'production-milestone',
      title: 'Production Milestone',
      description: '50% of production completed',
      day: Math.floor(productionDays / 2),
      percentage: 40,
    },
    {
      id: 'production-complete',
      title: 'Production Complete',
      description: 'Manufacturing finished, ready for QC',
      day: productionDays,
      percentage: 70,
    },
    {
      id: 'quality-check',
      title: 'Quality Inspection',
      description: 'Final quality control and testing',
      day: productionDays + 1,
      percentage: 80,
    },
    {
      id: 'shipping',
      title: 'Shipping',
      description: 'Package dispatched for delivery',
      day: productionDays + qualityDays,
      percentage: 90,
    },
    {
      id: 'delivery',
      title: 'Delivery',
      description: 'Order delivered to customer',
      day: deliveryTime,
      percentage: 100,
    },
  ];
}

/**
 * Validate quote data for completeness
 */
export function validateQuoteData(quote: Quote): {
  isValid: boolean;
  issues: string[];
  completeness: number;
} {
  const issues: string[] = [];
  let completenessScore = 0;
  const totalFields = 10;

  // Check required fields
  if (!quote.totalAmount || quote.totalAmount <= 0) {
    issues.push('Total amount is required');
  } else {
    completenessScore++;
  }

  if (!quote.deliveryTime || quote.deliveryTime <= 0) {
    issues.push('Delivery time is required');
  } else {
    completenessScore++;
  }

  if (!quote.manufacturer) {
    issues.push('Manufacturer information is missing');
  } else {
    completenessScore++;
  }

  // Check optional but important fields
  if (quote.material) completenessScore++;
  if (quote.process) completenessScore++;
  if (quote.finish) completenessScore++;
  if (quote.tolerance) completenessScore++;
  if (quote.paymentTerms) completenessScore++;
  if (quote.warranty) completenessScore++;
  if (quote.breakdown) completenessScore++;

  const completeness = (completenessScore / totalFields) * 100;

  return {
    isValid: issues.length === 0,
    issues,
    completeness: Math.round(completeness),
  };
}

/**
 * Generate audit trail entry
 */
export function createAuditEntry(
  entityType: 'quote' | 'evaluation' | 'decision',
  entityId: string,
  action: string,
  userId: string,
  oldValue?: any,
  newValue?: any,
  metadata?: Record<string, any>
): AuditTrailEntry {
  return {
    id: generateId(),
    entityType,
    entityId,
    action,
    userId,
    oldValue,
    newValue,
    metadata,
    timestamp: new Date().toISOString(),
    ipAddress: undefined, // Would be set server-side
    userAgent: navigator.userAgent,
  };
}

/**
 * Calculate compliance score based on requirements
 */
export function calculateComplianceScore(
  requirements: Array<{ id: string; required: boolean; status: string }>
): number {
  const requiredItems = requirements.filter(req => req.required);
  const compliantRequired = requiredItems.filter(req => req.status === 'compliant');
  
  const optionalItems = requirements.filter(req => !req.required);
  const compliantOptional = optionalItems.filter(req => req.status === 'compliant');

  // Required items are weighted more heavily (80% of score)
  const requiredScore = requiredItems.length > 0 
    ? (compliantRequired.length / requiredItems.length) * 80 
    : 80;

  // Optional items contribute 20% of score
  const optionalScore = optionalItems.length > 0 
    ? (compliantOptional.length / optionalItems.length) * 20 
    : 20;

  return Math.round(requiredScore + optionalScore);
} 