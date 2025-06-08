import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Star,
  Award,
  Shield,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  Globe,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Manufacturer } from '../../types';
import Button from '../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';

interface ManufacturerQuickPreviewProps {
  manufacturer: Manufacturer;
  onViewDetails?: () => void;
  onContact?: () => void;
  className?: string;
}

const ManufacturerQuickPreview: React.FC<ManufacturerQuickPreviewProps> = ({
  manufacturer,
  onViewDetails,
  onContact,
  className
}) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 4.0) return 'text-yellow-600 dark:text-yellow-400';
    if (rating >= 3.0) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCapabilityIcon = (capability: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'CNC Machining': Award,
      '3D Printing': Shield,
      'Injection Molding': Users,
      'Sheet Metal': TrendingUp,
      'Assembly': CheckCircle,
    };
    return icons[capability] || Award;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            className="h-12 w-12 rounded-full"
            src={manufacturer.logoUrl || '/placeholder-logo.png'}
            alt={manufacturer.companyName}
          />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {manufacturer.companyName}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3 mr-1" />
              {manufacturer.location?.city}, {manufacturer.location?.country}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {manufacturer.verified && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium">Verified</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Rating and Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-4 h-4',
                    i < Math.floor(manufacturer.rating || 0)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              ))}
            </div>
          </div>
          <div className={cn('text-lg font-bold', getRatingColor(manufacturer.rating || 0))}>
            {manufacturer.rating?.toFixed(1) || 'N/A'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Rating</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {manufacturer.reviewCount || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Reviews</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {manufacturer.completedProjects || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Projects</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {manufacturer.avgDeliveryTime || 'N/A'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg. Delivery</div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Capabilities
        </h4>
        <div className="flex flex-wrap gap-2">
          {manufacturer.capabilities?.slice(0, 4).map((capability) => {
            const Icon = getCapabilityIcon(capability.name);
            return (
              <div
                key={capability.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
              >
                <Icon className="w-3 h-3 mr-1" />
                {capability.name}
              </div>
            );
          })}
          {manufacturer.capabilities && manufacturer.capabilities.length > 4 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              +{manufacturer.capabilities.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Certifications */}
      {manufacturer.certifications && manufacturer.certifications.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Certifications
          </h4>
          <div className="flex flex-wrap gap-2">
            {manufacturer.certifications.slice(0, 3).map((cert) => (
              <div
                key={cert.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                <Shield className="w-3 h-3 mr-1" />
                {cert.name}
              </div>
            ))}
            {manufacturer.certifications.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                +{manufacturer.certifications.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Response Time:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">
            {manufacturer.avgResponseTime || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">On-time Rate:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">
            {manufacturer.onTimeRate ? `${manufacturer.onTimeRate}%` : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Member Since:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">
            {manufacturer.memberSince ? 
              formatDistanceToNow(new Date(manufacturer.memberSince), { addSuffix: false }) 
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Quality Score:</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">
            {manufacturer.qualityScore ? `${manufacturer.qualityScore}/100` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Recent Activity */}
      {manufacturer.recentActivity && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Recent Activity
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {manufacturer.recentActivity}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            {manufacturer.contactEmail && (
              <div className="flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                <span>Contact available</span>
              </div>
            )}
            {manufacturer.website && (
              <div className="flex items-center">
                <Globe className="w-3 h-3 mr-1" />
                <span>Website</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
            >
              View Profile
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onContact}
            >
              Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1',
            (manufacturer.qualityScore || 0) >= 85 ? 'bg-green-100 dark:bg-green-900' :
            (manufacturer.qualityScore || 0) >= 70 ? 'bg-yellow-100 dark:bg-yellow-900' :
            'bg-red-100 dark:bg-red-900'
          )}>
            <Award className={cn(
              'w-4 h-4',
              (manufacturer.qualityScore || 0) >= 85 ? 'text-green-600 dark:text-green-400' :
              (manufacturer.qualityScore || 0) >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            )} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Quality</div>
        </div>
        
        <div className="text-center">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1',
            (manufacturer.onTimeRate || 0) >= 90 ? 'bg-green-100 dark:bg-green-900' :
            (manufacturer.onTimeRate || 0) >= 75 ? 'bg-yellow-100 dark:bg-yellow-900' :
            'bg-red-100 dark:bg-red-900'
          )}>
            <Clock className={cn(
              'w-4 h-4',
              (manufacturer.onTimeRate || 0) >= 90 ? 'text-green-600 dark:text-green-400' :
              (manufacturer.onTimeRate || 0) >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            )} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Delivery</div>
        </div>
        
        <div className="text-center">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1',
            (manufacturer.rating || 0) >= 4.5 ? 'bg-green-100 dark:bg-green-900' :
            (manufacturer.rating || 0) >= 3.5 ? 'bg-yellow-100 dark:bg-yellow-900' :
            'bg-red-100 dark:bg-red-900'
          )}>
            <Users className={cn(
              'w-4 h-4',
              (manufacturer.rating || 0) >= 4.5 ? 'text-green-600 dark:text-green-400' :
              (manufacturer.rating || 0) >= 3.5 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            )} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Service</div>
        </div>
      </div>
    </motion.div>
  );
};

export default ManufacturerQuickPreview; 