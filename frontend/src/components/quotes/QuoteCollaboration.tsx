import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Reply,
  Edit3,
  Trash2,
  MoreHorizontal,
  AtSign,
  Paperclip,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Bell,
  BellOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../lib/utils';

interface Comment {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
  is_internal: boolean;
  mentions: Array<{
    id: number;
    name: string;
  }>;
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
  }>;
  replies: Comment[];
  parent_id?: number;
}

interface QuoteCollaborationProps {
  quoteId: number;
  isManufacturer?: boolean;
  className?: string;
}

const QuoteCollaboration: React.FC<QuoteCollaborationProps> = ({
  quoteId,
  isManufacturer = false,
  className
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [showInternal, setShowInternal] = useState(true);
  const [isInternal, setIsInternal] = useState(false);
  const [mentions, setMentions] = useState<Array<{ id: number; name: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['quote-comments', quoteId],
    queryFn: () => quotesApi.getComments(quoteId),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: {
      content: string;
      is_internal: boolean;
      parent_id?: number;
      mentions?: number[];
    }) => quotesApi.addComment(quoteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-comments', quoteId] });
      setNewComment('');
      setReplyingTo(null);
      setMentions([]);
      toast.success('Comment added successfully');
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      quotesApi.updateComment(commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-comments', quoteId] });
      setEditingComment(null);
      toast.success('Comment updated successfully');
    },
    onError: () => {
      toast.error('Failed to update comment');
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => quotesApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-comments', quoteId] });
      toast.success('Comment deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      content: newComment,
      is_internal: isInternal,
      parent_id: replyingTo || undefined,
      mentions: mentions.map(m => m.id)
    });
  };

  const handleEditComment = (commentId: number, content: string) => {
    updateCommentMutation.mutate({ commentId, content });
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleMention = (text: string) => {
    // Simple mention detection - in real app, this would be more sophisticated
    const mentionRegex = /@(\w+)/g;
    const foundMentions = [...text.matchAll(mentionRegex)];
    // This would typically search users and add them to mentions array
  };

  const filteredComments = comments.filter(comment => 
    showInternal || !comment.is_internal
  );

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? 'ml-12' : ''} mb-4`}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-lg border ${
        comment.is_internal ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700'
      } p-4`}>
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              {comment.author.avatar ? (
                <img
                  src={comment.author.avatar}
                  alt={comment.author.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {comment.author.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {comment.author.role}
                </span>
                {comment.is_internal && (
                  <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                    Internal
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(comment.created_at)}</span>
                {comment.updated_at !== comment.created_at && (
                  <span>(edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* Comment Actions */}
          {(String(user?.id) === String(comment.author.id) || user?.role === 'admin') && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingComment(comment.id)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteComment(comment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Comment Content */}
        {editingComment === comment.id ? (
          <div className="space-y-3">
            <TextArea
              defaultValue={comment.content}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleEditComment(comment.id, e.currentTarget.value);
                }
              }}
              placeholder="Edit your comment..."
              rows={3}
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={(e) => {
                  const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                  if (textarea) {
                    handleEditComment(comment.id, textarea.value);
                  }
                }}
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingComment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
              {comment.content}
            </div>

            {/* Mentions */}
            {comment.mentions.length > 0 && (
              <div className="flex items-center space-x-2 mb-3">
                <AtSign className="h-4 w-4 text-gray-400" />
                <div className="flex space-x-1">
                  {comment.mentions.map(mention => (
                    <span
                      key={mention.id}
                      className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded"
                    >
                      {mention.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {comment.attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {comment.attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <Paperclip className="h-4 w-4" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary-600 underline"
                    >
                      {attachment.name}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Actions */}
            <div className="flex items-center space-x-4 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
            </div>
          </>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Discussion ({filteredComments.length})
          </h3>
        </div>

        {/* Filters */}
        {isManufacturer && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInternal(!showInternal)}
            >
              {showInternal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showInternal ? 'Hide Internal' : 'Show Internal'}
            </Button>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSpinner center />
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No comments yet. Start the discussion!
            </p>
          </div>
        ) : (
          filteredComments.map(comment => renderComment(comment))
        )}
      </div>

      {/* Reply Form */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Replying to comment
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Comment Form */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <TextArea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              handleMention(e.target.value);
            }}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmitComment();
              }
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Internal Comment Toggle */}
              {isManufacturer && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Internal comment
                  </span>
                </label>
              )}

              {/* File Attachment */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  // Handle file upload
                  console.log('Files selected:', e.target.files);
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                Ctrl+Enter to send
              </span>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                loading={addCommentMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {replyingTo ? 'Reply' : 'Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCollaboration; 