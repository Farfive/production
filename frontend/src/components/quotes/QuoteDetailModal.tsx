import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Package,
  Truck,
  Shield,
  FileText,
  Image,
  Send,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { Quote } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { formatCurrency, cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import QuotePricingChart from './QuotePricingChart';
import QuoteTimelineViz from './QuoteTimelineViz';
import ManufacturerQuickPreview from './ManufacturerQuickPreview';
import { quotesApi } from '../../lib/api';

interface QuoteDetailModalProps {
  quote: Quote;
  onClose: () => void;
  onSelect?: (quote: Quote) => void;
}

interface Question {
  id: string;
  userId: string;
  user: {
    name: string;
    avatar?: string;
  };
  question: string;
  timestamp: Date;
  answer?: {
    id: string;
    userId: string;
    user: {
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: Date;
  };
  status: 'pending' | 'answered' | 'escalated';
  category: 'technical' | 'pricing' | 'delivery' | 'quality' | 'general';
  upvotes: number;
  hasUpvoted: boolean;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'cad' | 'specification';
  size: number;
  url: string;
  uploadedAt: Date;
  description?: string;
}

const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  quote,
  onClose,
  onSelect
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'timeline' | 'qa' | 'documents'>('overview');
  const [newQuestion, setNewQuestion] = useState('');
  const [questionCategory, setQuestionCategory] = useState<Question['category']>('general');
  const [favorited, setFavorited] = useState(false);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);

  // Fetch quote details and related data
  const { data: questions = [] } = useQuery({
    queryKey: ['quote-questions', quote.id],
    queryFn: () => quotesApi.getQuoteQuestions(parseInt(quote.id as string)),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['quote-documents', quote.id],
    queryFn: () => quotesApi.getQuoteDocuments(parseInt(quote.id as string)),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['quote-notes', quote.id],
    queryFn: () => quotesApi.getQuoteNotes(parseInt(quote.id as string)),
  });

  // Mutations
  const askQuestionMutation = useMutation({
    mutationFn: (data: { question: string; category: string }) =>
      quotesApi.askQuestion(parseInt(quote.id as string), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-questions', quote.id] });
      toast.success('Question submitted successfully');
      setNewQuestion('');
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => quotesApi.toggleFavorite(Number(quote.id)),
    onSuccess: () => {
      setFavorited(!favorited);
      toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
    },
  });

  const upvoteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => quotesApi.upvoteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-questions', quote.id] });
    },
  });

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    askQuestionMutation.mutate({
      question: newQuestion,
      category: questionCategory
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pricing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      delivery: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      quality: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'image':
        return <Image className="w-6 h-6 text-blue-500" />;
      case 'cad':
        return <Package className="w-6 h-6 text-purple-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Quote Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quote Summary
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFavoriteMutation.mutate()}
            >
              <Heart className={cn(
                'w-4 h-4',
                favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
              )} />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="text-sm">Total Price</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(quote.totalAmount, quote.currency)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {quote.currency} • Ex. Tax
            </div>
          </div>

          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm">Delivery Time</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {quote.deliveryTime}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Business days
            </div>
          </div>

          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
              <Package className="w-4 h-4 mr-1" />
              <span className="text-sm">Quantity</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {quote.quantity || 'N/A'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Units
            </div>
          </div>

          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
              <Star className="w-4 h-4 mr-1" />
              <span className="text-sm">Manufacturer Rating</span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mr-2">
                {quote.manufacturer?.rating?.toFixed(1) || 'N/A'}
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.floor(quote.manufacturer?.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 dark:text-gray-600'
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({quote.manufacturer?.reviewCount || 0} reviews)
            </div>
          </div>
        </div>
      </div>

      {/* Manufacturer Info */}
      <ManufacturerQuickPreview
        manufacturer={quote.manufacturer!}
        onViewDetails={() => setShowManufacturerModal(true)}
        onContact={() => toast('Contact manufacturer feature coming soon')}
      />

      {/* Quote Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quote Details
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specifications
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Material:</span>
                <span className="text-gray-900 dark:text-white">{quote.material || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Finish:</span>
                <span className="text-gray-900 dark:text-white">{quote.finish || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tolerance:</span>
                <span className="text-gray-900 dark:text-white">{quote.tolerance || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Manufacturing Process:</span>
                <span className="text-gray-900 dark:text-white">{quote.process || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Terms & Conditions
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Payment Terms:</span>
                <span className="text-gray-900 dark:text-white">{quote.paymentTerms || 'Net 30'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Validity:</span>
                <span className="text-gray-900 dark:text-white">
                  {quote.validUntil ? format(new Date(quote.validUntil), 'MMM dd, yyyy') : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Shipping:</span>
                <span className="text-gray-900 dark:text-white">{quote.shippingMethod || 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Warranty:</span>
                <span className="text-gray-900 dark:text-white">{quote.warranty || '1 year'}</span>
              </div>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-6">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              {quote.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderQATab = () => (
    <div className="space-y-6">
      {/* Ask Question Form */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Ask a Question
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={questionCategory}
              onChange={(e) => setQuestionCategory(e.target.value as Question['category'])}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="pricing">Pricing</option>
              <option value="delivery">Delivery</option>
              <option value="quality">Quality</option>
            </select>
          </div>
          
          <TextArea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask your question here..."
            rows={3}
          />
          
          <Button
            onClick={handleAskQuestion}
            disabled={!newQuestion.trim() || askQuestionMutation.isPending}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit Question
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          Questions & Answers ({questions.length})
        </h4>
        
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          questions.map((question) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    className="h-8 w-8 rounded-full"
                    src={question.user.avatar || '/placeholder-avatar.png'}
                    alt={question.user.name}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {question.user.name}
                      </span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        getCategoryColor(question.category)
                      )}>
                        {question.category}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(question.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusIcon(question.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => upvoteQuestionMutation.mutate(question.id)}
                    className={cn(
                      'flex items-center space-x-1',
                      question.hasUpvoted && 'text-primary-600 dark:text-primary-400'
                    )}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-xs">{question.upvotes}</span>
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {question.question}
              </p>
              
              {question.answer && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-4 border-primary-500">
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      className="h-6 w-6 rounded-full"
                      src={question.answer.user.avatar || '/placeholder-avatar.png'}
                      alt={question.answer.user.name}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {question.answer.user.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(question.answer.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {question.answer.content}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
        Documents & Attachments
      </h4>
      
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No documents available for this quote.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <motion.div
              key={document.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                {getFileIcon(document.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {document.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(document.size)} • {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}
                  </p>
                  {document.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {document.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(document.url, '_blank')}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Download
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quote from {quote.manufacturer?.companyName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Quote #{quote.id} • {format(new Date(quote.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {onSelect && (
                <Button onClick={() => onSelect(quote)}>
                  Select Quote
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'breakdown', label: 'Pricing', icon: DollarSign },
                { id: 'timeline', label: 'Timeline', icon: Calendar },
                { id: 'qa', label: 'Q&A', icon: MessageCircle },
                { id: 'documents', label: 'Documents', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm',
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'breakdown' && <QuotePricingChart quote={quote} chartType="breakdown" />}
            {activeTab === 'timeline' && <QuoteTimelineViz quote={quote} />}
            {activeTab === 'qa' && renderQATab()}
            {activeTab === 'documents' && renderDocumentsTab()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuoteDetailModal; 