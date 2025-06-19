import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, Filter, MapPin, Star, Award, Clock, 
  TrendingUp, Shield, CheckCircle, AlertTriangle,
  Factory, Users, Globe, Zap, Target, Brain
} from 'lucide-react';
import api from '../../lib/api';

interface ManufacturerDiscoveryResult {
  id: number;
  business_name: string;
  description: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  review_count: number;
  capabilities: Record<string, any>;
  certifications: string[];
  performance_metrics: Record<string, any>;
  score: number;
  score_breakdown: Record<string, number>;
  match_reasons: string[];
  distance_km?: number;
  response_time_hours: number;
  completion_rate: number;
  on_time_rate: number;
  verified: boolean;
  premium: boolean;
  similarity_score?: number;
  match_highlights?: string[];
}

interface SearchFilters {
  country?: string;
  state?: string;
  city?: string;
  min_rating?: number;
  capabilities?: string[];
  materials?: string[];
  certifications?: string[];
  max_distance_km?: number;
}

interface FilterOptions {
  capabilities: string[];
  materials: string[];
  certifications: string[];
  countries: string[];
}

interface ManufacturerDiscoveryProps {
  orderId?: number;
  onManufacturerSelect?: (manufacturer: ManufacturerDiscoveryResult) => void;
  showRecommendations?: boolean;
}

export const ManufacturerDiscovery: React.FC<ManufacturerDiscoveryProps> = ({
  orderId,
  onManufacturerSelect,
  showRecommendations = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturers, setManufacturers] = useState<ManufacturerDiscoveryResult[]>([]);
  const [recommendations, setRecommendations] = useState<ManufacturerDiscoveryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'text' | 'advanced' | 'ai'>('text');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerDiscoveryResult | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');

  useEffect(() => {
    loadFilterOptions();
    if (orderId && showRecommendations) {
      loadRecommendations();
    }
  }, [orderId, showRecommendations]);

  const loadFilterOptions = async () => {
    try {
      const response = await api.get('/manufacturers/filters/options');
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadRecommendations = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/manufacturers/recommendations/order/${orderId}`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20'
      });
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
      
      const response = await api.get(`/manufacturers/search?${params}`);
      setManufacturers(response.data);
    } catch (error) {
      console.error('Error searching manufacturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = async () => {
    setLoading(true);
    try {
      const response = await api.post('/manufacturers/discover', {
        search_criteria: filters,
        limit: 20
      });
      setManufacturers(response.data);
    } catch (error) {
      console.error('Error in advanced search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 0.95) return { label: 'Excellent', variant: 'default' as const };
    if (rate >= 0.85) return { label: 'Good', variant: 'secondary' as const };
    if (rate >= 0.75) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Poor', variant: 'destructive' as const };
  };

  const ManufacturerCard: React.FC<{ manufacturer: ManufacturerDiscoveryResult; isRecommendation?: boolean }> = ({ 
    manufacturer, 
    isRecommendation = false 
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selectedManufacturer?.id === manufacturer.id ? 'ring-2 ring-blue-500' : ''
      } ${isRecommendation ? 'border-green-200 bg-green-50' : ''}`}
      onClick={() => {
        setSelectedManufacturer(manufacturer);
        onManufacturerSelect?.(manufacturer);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {manufacturer.business_name}
              {manufacturer.verified && <CheckCircle className="h-4 w-4 text-green-500" />}
              {manufacturer.premium && <Award className="h-4 w-4 text-purple-500" />}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{manufacturer.rating?.toFixed(1) || 'N/A'}</span>
                <span className="text-xs text-gray-500">({manufacturer.review_count} reviews)</span>
              </div>
              <Badge className={getScoreColor(manufacturer.score)}>
                Score: {manufacturer.score.toFixed(1)}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            {manufacturer.distance_km && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                {manufacturer.distance_km.toFixed(0)} km
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Globe className="h-4 w-4" />
          {manufacturer.location.city}, {manufacturer.location.country}
        </div>
        
        {/* Description */}
        {manufacturer.description && (
          <p className="text-sm text-gray-700 line-clamp-2">
            {manufacturer.description}
          </p>
        )}
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">{(manufacturer.completion_rate * 100).toFixed(0)}%</div>
            <div className="text-gray-500">Completion</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{(manufacturer.on_time_rate * 100).toFixed(0)}%</div>
            <div className="text-gray-500">On-time</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{manufacturer.response_time_hours}h</div>
            <div className="text-gray-500">Response</div>
          </div>
        </div>
        
        {/* Capabilities */}
        {manufacturer.capabilities?.manufacturing_processes && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Capabilities:</p>
            <div className="flex flex-wrap gap-1">
              {manufacturer.capabilities.manufacturing_processes.slice(0, 3).map((capability: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
              {manufacturer.capabilities.manufacturing_processes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{manufacturer.capabilities.manufacturing_processes.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Match Reasons */}
        {manufacturer.match_reasons && manufacturer.match_reasons.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-700 mb-1">Why this matches:</p>
            <ul className="text-xs space-y-1">
              {manufacturer.match_reasons.slice(0, 2).map((reason, index) => (
                <li key={index} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Match Highlights for text search */}
        {manufacturer.match_highlights && manufacturer.match_highlights.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Search matches:</p>
            <ul className="text-xs space-y-1">
              {manufacturer.match_highlights.slice(0, 2).map((highlight, index) => (
                <li key={index} className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Certifications */}
        {manufacturer.certifications && manufacturer.certifications.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Certifications:</p>
            <div className="flex flex-wrap gap-1">
              {manufacturer.certifications.slice(0, 3).map((cert, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {cert}
                </Badge>
              ))}
              {manufacturer.certifications.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{manufacturer.certifications.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Manufacturer Discovery
          </h2>
          <p className="text-gray-600">Find the perfect manufacturing partner with AI-powered matching</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as 'grid' | 'list' | 'map')}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
              { value: 'map', label: 'Map' }
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <Tabs value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Text Search
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Discovery
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          <Tabs value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
            <TabsContent value="text" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search manufacturers by name, capabilities, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
                  className="flex-1"
                />
                <Button onClick={handleTextSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {/* Quick Filters */}
              <div className="grid grid-cols-4 gap-4">
                <Select 
                  value={filters.country || ''} 
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  placeholder="Country"
                  options={filterOptions?.countries.map(country => ({ value: country, label: country })) || []}
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Rating</label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filters.min_rating || 0}
                    onChange={(e) => handleFilterChange('min_rating', parseFloat(e.target.value))}
                    placeholder="0-5 stars"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Distance (km)</label>
                  <Input
                    type="number"
                    min="50"
                    max="2000"
                    step="50"
                    value={filters.max_distance_km || 1000}
                    onChange={(e) => handleFilterChange('max_distance_km', parseInt(e.target.value))}
                    placeholder="Distance in km"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleTextSearch} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capabilities</label>
                    <div className="text-sm text-gray-500">
                      Advanced filtering coming soon...
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Materials</label>
                    <div className="text-sm text-gray-500">
                      Advanced filtering coming soon...
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Certifications</label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {filterOptions?.certifications.map(cert => (
                        <div key={cert} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={cert}
                            checked={filters.certifications?.includes(cert) || false}
                            onChange={(e) => {
                              const current = filters.certifications || [];
                              if (e.target.checked) {
                                handleFilterChange('certifications', [...current, cert]);
                              } else {
                                handleFilterChange('certifications', current.filter(c => c !== cert));
                              }
                            }}
                            className="form-checkbox"
                          />
                          <label htmlFor={cert} className="text-xs">{cert}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        <Input
                          placeholder="City"
                          value={filters.city || ''}
                          onChange={(e) => handleFilterChange('city', e.target.value)}
                        />
                        <Input
                          placeholder="State/Province"
                          value={filters.state || ''}
                          onChange={(e) => handleFilterChange('state', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleAdvancedSearch} disabled={loading}>
                  <Filter className="h-4 w-4 mr-2" />
                  Search with Filters
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="space-y-4">
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI-Powered Discovery</h3>
                <p className="text-gray-600 mb-4">
                  Let our AI analyze your requirements and find the best manufacturing partners
                </p>
                {orderId ? (
                  <Button onClick={loadRecommendations} disabled={loading}>
                    <Zap className="h-4 w-4 mr-2" />
                    Get AI Recommendations
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">
                    AI recommendations are available when viewing a specific order
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Searching manufacturers...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            AI Recommendations for Your Order
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(manufacturer => (
              <ManufacturerCard 
                key={manufacturer.id} 
                manufacturer={manufacturer} 
                isRecommendation={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {manufacturers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Search Results ({manufacturers.length} manufacturers found)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manufacturers.map(manufacturer => (
              <ManufacturerCard key={manufacturer.id} manufacturer={manufacturer} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && manufacturers.length === 0 && recommendations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No manufacturers found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or use different keywords
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 