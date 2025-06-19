import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  X,
  Send,
  Plus,
  Eye,
  Clock,
  Check,
  AlertCircle,
  UserCheck,
  Edit,
  Save,
  XCircle as Cancel,
  BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { Quote, User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { formatCurrency, cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import { quotesApi } from '../../lib/api';

interface CollaborativeEvaluationProps {
  orderId: string;
  quotes: Quote[];
  onClose: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department: string;
  status: 'online' | 'offline' | 'away';
}

interface Evaluation {
  id: string;
  quoteId: string;
  userId: string;
  user: TeamMember;
  rating: number;
  pros: string[];
  cons: string[];
  notes: string;
  recommendation: 'approve' | 'reject' | 'conditional';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
}

interface Discussion {
  id: string;
  quoteId: string;
  userId: string;
  user: TeamMember;
  message: string;
  timestamp: Date;
  replies: Discussion[];
  type: 'comment' | 'question' | 'concern' | 'approval';
}

interface CollaborativeSession {
  id: string;
  orderId: string;
  participants: TeamMember[];
  evaluations: Evaluation[];
  discussions: Discussion[];
  status: 'active' | 'completed' | 'cancelled';
  deadline?: Date;
  finalDecision?: {
    selectedQuoteId: string;
    decidedBy: string;
    decidedAt: Date;
    reasoning: string;
  };
}

const CollaborativeEvaluation: React.FC<CollaborativeEvaluationProps> = ({
  orderId,
  quotes,
  onClose
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'evaluations' | 'discussions' | 'summary'>('evaluations');
  const [newEvaluation, setNewEvaluation] = useState({
    rating: 0,
    pros: [''],
    cons: [''],
    notes: '',
    recommendation: 'conditional' as const
  });
  const [newMessage, setNewMessage] = useState('');
  const [editingEvaluation, setEditingEvaluation] = useState<string | null>(null);

  // Fetch collaborative session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['collaborative-session', orderId],
    queryFn: () => quotesApi.getCollaborativeSession(parseInt(orderId)),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', orderId],
    queryFn: () => quotesApi.getTeamMembers(parseInt(orderId)),
  });

  // Real-time updates
  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join-evaluation', orderId);

    socket.on('evaluation-updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-session', orderId] });
      toast(`${data.user.name} updated their evaluation`);
    });

    socket.on('new-discussion', (data) => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-session', orderId] });
      toast(`New comment from ${data.user.name}`);
    });

    socket.on('user-joined', (data) => {
      toast.success(`${data.user.name} joined the evaluation`);
    });

    socket.on('user-left', (data) => {
      toast(`${data.user.name} left the evaluation`);
    });

    return () => {
      socket.off('evaluation-updated');
      socket.off('new-discussion');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket, orderId, queryClient]);

  // Mutations
  const submitEvaluationMutation = useMutation({
    mutationFn: (data: any) => quotesApi.submitEvaluation(parseInt(orderId), parseInt(selectedQuoteId!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-session', orderId] });
      toast.success('Evaluation submitted successfully');
      setNewEvaluation({
        rating: 0,
        pros: [''],
        cons: [''],
        notes: '',
        recommendation: 'conditional'
      });
    },
  });

  const addDiscussionMutation = useMutation({
    mutationFn: (data: any) => quotesApi.addDiscussion(parseInt(orderId), parseInt(selectedQuoteId!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-session', orderId] });
      setNewMessage('');
    },
  });

  const finalizeDecisionMutation = useMutation({
    mutationFn: (data: any) => quotesApi.finalizeDecision(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-session', orderId] });
      toast.success('Final decision recorded');
    },
  });

  const handleSubmitEvaluation = () => {
    if (!selectedQuoteId || newEvaluation.rating === 0) {
      toast.error('Please select a quote and provide a rating');
      return;
    }

    submitEvaluationMutation.mutate(newEvaluation);
  };

  const handleAddDiscussion = () => {
    if (!selectedQuoteId || !newMessage.trim()) {
      toast.error('Please select a quote and enter a message');
      return;
    }

    addDiscussionMutation.mutate({
      message: newMessage,
      type: 'comment'
    });
  };

  const updateArrayField = (
    field: 'pros' | 'cons',
    index: number,
    value: string
  ) => {
    setNewEvaluation(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'pros' | 'cons') => {
    setNewEvaluation(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'pros' | 'cons', index: number) => {
    setNewEvaluation(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const getQuoteEvaluations = (quoteId: string) => {
    return session?.evaluations.filter((e: Evaluation) => e.quoteId === quoteId) || [];
  };

  const getQuoteDiscussions = (quoteId: string) => {
    return session?.discussions.filter((d: Discussion) => d.quoteId === quoteId) || [];
  };

  const getAverageRating = (quoteId: string) => {
    const evaluations = getQuoteEvaluations(quoteId);
    if (evaluations.length === 0) return 0;
    return evaluations.reduce((sum: number, e: Evaluation) => sum + e.rating, 0) / evaluations.length;
  };

  const getRecommendationCounts = (quoteId: string) => {
    const evaluations = getQuoteEvaluations(quoteId);
    return {
      approve: evaluations.filter((e: Evaluation) => e.recommendation === 'approve').length,
      reject: evaluations.filter((e: Evaluation) => e.recommendation === 'reject').length,
      conditional: evaluations.filter((e: Evaluation) => e.recommendation === 'conditional').length
    };
  };

  const renderQuoteSelector = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        Select Quote to Evaluate
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotes.map((quote) => {
          const evaluations = getQuoteEvaluations(quote.id);
          const avgRating = getAverageRating(quote.id);
          const recommendations = getRecommendationCounts(quote.id);
          const isSelected = selectedQuoteId === quote.id;

          return (
            <motion.div
              key={quote.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedQuoteId(quote.id)}
              className={cn(
                'border rounded-lg p-4 cursor-pointer transition-all',
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  {quote.manufacturer?.companyName}
                </h5>
                <div className="flex items-center">
                  {avgRating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1 text-sm">{avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {formatCurrency(quote.totalAmount, quote.currency)} • {quote.deliveryTime} days
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center space-x-2">
                  {recommendations.approve > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      ✓{recommendations.approve}
                    </span>
                  )}
                  {recommendations.reject > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      ✗{recommendations.reject}
                    </span>
                  )}
                  {recommendations.conditional > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      ?{recommendations.conditional}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderEvaluationForm = () => {
    if (!selectedQuoteId) return null;

    const quote = quotes.find(q => q.id === selectedQuoteId);
    const existingEvaluation = session?.evaluations.find(
      (e: Evaluation) => e.quoteId === selectedQuoteId && e.userId === user?.id.toString()
    );

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Your Evaluation for {quote?.manufacturer?.companyName}
        </h4>

        {existingEvaluation && !editingEvaluation ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-5 h-5',
                        i < existingEvaluation.rating ? 'fill-current' : ''
                      )}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {existingEvaluation.rating}/5
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingEvaluation(existingEvaluation.id)}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {existingEvaluation.notes || 'No notes provided'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pros:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {existingEvaluation.pros.map((pro: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <ThumbsUp className="w-3 h-3 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cons:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {existingEvaluation.cons.map((con: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <ThumbsDown className="w-3 h-3 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Recommendation:
              </span>
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                existingEvaluation.recommendation === 'approve'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : existingEvaluation.recommendation === 'reject'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              )}>
                {existingEvaluation.recommendation}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Overall Rating
              </label>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setNewEvaluation(prev => ({ ...prev, rating: i + 1 }))}
                    className="focus:outline-none"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 text-yellow-500 transition-colors',
                        i < newEvaluation.rating ? 'fill-current' : ''
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {newEvaluation.rating}/5
                </span>
              </div>
            </div>

            {/* Pros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pros
              </label>
              <div className="space-y-2">
                {newEvaluation.pros.map((pro, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={pro}
                      onChange={(e) => updateArrayField('pros', index, e.target.value)}
                      placeholder="Enter a positive aspect"
                      className="flex-1"
                    />
                    {newEvaluation.pros.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem('pros', index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('pros')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Pro
                </Button>
              </div>
            </div>

            {/* Cons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cons
              </label>
              <div className="space-y-2">
                {newEvaluation.cons.map((con, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={con}
                      onChange={(e) => updateArrayField('cons', index, e.target.value)}
                      placeholder="Enter a concern or limitation"
                      className="flex-1"
                    />
                    {newEvaluation.cons.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem('cons', index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('cons')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Con
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <TextArea
                value={newEvaluation.notes}
                onChange={(e) => setNewEvaluation(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional comments or observations..."
                rows={3}
              />
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recommendation
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'approve', label: 'Approve', color: 'green' },
                  { value: 'conditional', label: 'Conditional', color: 'yellow' },
                  { value: 'reject', label: 'Reject', color: 'red' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNewEvaluation(prev => ({ 
                      ...prev, 
                      recommendation: option.value as any 
                    }))}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                      newEvaluation.recommendation === option.value
                        ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20 text-${option.color}-700 dark:text-${option.color}-300`
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {editingEvaluation && (
                <Button
                  variant="outline"
                  onClick={() => setEditingEvaluation(null)}
                  leftIcon={<Cancel className="w-4 h-4" />}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmitEvaluation}
                disabled={submitEvaluationMutation.isPending}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {editingEvaluation ? 'Update' : 'Submit'} Evaluation
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDiscussions = () => {
    if (!selectedQuoteId) return null;

    const discussions = getQuoteDiscussions(selectedQuoteId);

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Discussion
          </h4>
          
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {discussions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No discussions yet. Start the conversation!
              </p>
            ) : (
              discussions.map((discussion: Discussion) => (
                <div key={discussion.id} className="flex space-x-3">
                  <img
                    className="h-8 w-8 rounded-full"
                    src={discussion.user.avatar || '/placeholder-avatar.png'}
                    alt={discussion.user.name}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {discussion.user.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(discussion.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {discussion.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddDiscussion();
                }
              }}
            />
            <Button
              onClick={handleAddDiscussion}
              disabled={!newMessage.trim() || addDiscussionMutation.isPending}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEvaluationsTab = () => (
    <div className="space-y-6">
      {renderQuoteSelector()}
      {selectedQuoteId && (
        <>
          {renderEvaluationForm()}
          {renderDiscussions()}
        </>
      )}
    </div>
  );

  const renderSummaryTab = () => {
    const quoteScores = quotes.map(quote => ({
      quote,
      avgRating: getAverageRating(quote.id),
      evaluationCount: getQuoteEvaluations(quote.id).length,
      recommendations: getRecommendationCounts(quote.id)
    })).sort((a, b) => b.avgRating - a.avgRating);

    return (
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          Evaluation Summary
        </h4>

        <div className="grid grid-cols-1 gap-4">
          {quoteScores.map((item, index) => (
            <div
              key={item.quote.id}
              className={cn(
                'bg-white dark:bg-gray-800 border rounded-lg p-4',
                index === 0 && 'border-green-500 bg-green-50 dark:bg-green-900/20'
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {index === 0 && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Star className="w-5 h-5 mr-1 fill-current" />
                      <span className="text-sm font-medium">Top Rated</span>
                    </div>
                  )}
                  <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                    {item.quote.manufacturer?.companyName}
                  </h5>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="ml-1 text-lg font-bold">
                      {item.avgRating > 0 ? item.avgRating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {item.evaluationCount} evaluation{item.evaluationCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Price</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.quote.totalAmount, item.quote.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Delivery</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {item.quote.deliveryTime} days
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Approvals</div>
                  <div className="text-lg font-medium text-green-600 dark:text-green-400">
                    {item.recommendations.approve}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Rejections</div>
                  <div className="text-lg font-medium text-red-600 dark:text-red-400">
                    {item.recommendations.reject}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {item.recommendations.approve > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {item.recommendations.approve} Approve
                    </span>
                  )}
                  {item.recommendations.conditional > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {item.recommendations.conditional} Conditional
                    </span>
                  )}
                  {item.recommendations.reject > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {item.recommendations.reject} Reject
                    </span>
                  )}
                </div>
                
                {index === 0 && item.avgRating > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => finalizeDecisionMutation.mutate({
                      selectedQuoteId: item.quote.id,
                      reasoning: 'Selected based on highest team evaluation score'
                    })}
                  >
                    Select This Quote
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            <span className="text-gray-900 dark:text-white">Loading collaborative session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Collaborative Evaluation
            </h2>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session?.participants.length || 0} participants
              </span>
              <div className="flex items-center space-x-1">
                {session?.participants.slice(0, 5).map((participant: TeamMember) => (
                  <img
                    key={participant.id}
                    className="h-6 w-6 rounded-full"
                    src={participant.avatar || '/placeholder-avatar.png'}
                    alt={participant.name}
                    title={participant.name}
                  />
                ))}
                {session && session.participants.length > 5 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{session.participants.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'evaluations', label: 'Evaluations', icon: Star },
              { id: 'discussions', label: 'Discussions', icon: MessageSquare },
              { id: 'summary', label: 'Summary', icon: BarChart3 },
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
          {activeTab === 'evaluations' && renderEvaluationsTab()}
          {activeTab === 'discussions' && renderDiscussions()}
          {activeTab === 'summary' && renderSummaryTab()}
        </div>
      </div>
    </motion.div>
  );
};

export default CollaborativeEvaluation; 