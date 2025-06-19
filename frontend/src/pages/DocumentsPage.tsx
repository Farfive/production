import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentIcon,
  FolderIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  DocumentTextIcon,
  ShareIcon,
  XMarkIcon,
  FunnelIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Import real API
import { documentsApi, Document, Folder, DocumentStats } from '../lib/api/documentsApi';

const DocumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();

  // Fetch data
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', searchTerm, selectedFolder],
    queryFn: () => documentsApi.fetchDocuments({
      search: searchTerm || undefined,
      folderId: selectedFolder === 'ALL' ? undefined : selectedFolder || undefined
    }),
    refetchInterval: 30000
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: documentsApi.fetchFolders
  });

  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: documentsApi.fetchStats,
    refetchInterval: 60000
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string }) => 
      documentsApi.uploadDocument(file, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      setShowUploadModal(false);
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: documentsApi.analyzeDocument,
    onSuccess: (result, documentId) => {
      // Update the document with AI analysis
      queryClient.setQueryData(['documents'], (old: Document[] | undefined) => {
        if (!old) return old;
        return old.map(doc => 
          doc.id === documentId ? { ...doc, aiAnalysis: result } : doc
        );
      });
    }
  });

  // Filtered documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFolder = selectedFolder === 'ALL' || doc.folderId === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return { icon: DocumentTextIcon, color: 'text-red-600' };
      case 'excel':
      case 'xlsx': return { icon: DocumentIcon, color: 'text-green-600' };
      case 'cad':
      case 'dwg': return { icon: DocumentIcon, color: 'text-blue-600' };
      case 'word':
      case 'docx': return { icon: DocumentIcon, color: 'text-blue-800' };
      default: return { icon: DocumentIcon, color: 'text-gray-600' };
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadMutation.mutate({ file: files[0] });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMutation.mutate({ file: files[0] });
    }
  };

  const handleAnalyzeDocument = (documentId: string) => {
    analyzeMutation.mutate(documentId);
  };

  if (documentsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-6 max-w-7xl mx-auto"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DocumentIcon className="w-8 h-8 mr-3 text-cyan-600" />
              AI Document Management
            </h1>
            <p className="text-gray-600 mt-2">Intelligent document processing with AI-powered insights</p>
          </div>
          <div className="flex space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.png"
            />
            <motion.button 
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg"
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              <span>Upload Documents</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
              <p className="text-xs text-cyan-600">+{stats?.recentUploads || 0} this week</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Folders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalFolders || 0}</p>
              <p className="text-xs text-blue-600">Organized structure</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats?.storageUsed || 0)}</p>
              <p className="text-xs text-green-600">{Math.round(((stats?.storageUsed || 0) / (stats?.storageLimit || 1)) * 100)}% of limit</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShareIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Shared Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.sharedDocuments || 0}</p>
              <p className="text-xs text-purple-600">Collaborative access</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents by name, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="ALL">All Folders</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name} ({folder.documentsCount})
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Documents Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
      >
        <AnimatePresence>
          {filteredDocuments.map((document, index) => {
            const { icon: Icon, color } = getFileIcon(document.type);
            return (
              <motion.div
                key={document.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedDocument(document);
                  setShowDocumentDetails(true);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gray-50`}>
                    <Icon className={`w-8 h-8 ${color}`} />
                  </div>
                  <div className="flex items-center space-x-1">
                    {document.isShared && (
                      <ShareIcon className="w-4 h-4 text-gray-400" />
                    )}
                    {document.aiAnalysis && (
                      <SparklesIcon className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{document.name}</h3>
                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Size</span>
                    <span>{formatFileSize(document.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downloads</span>
                    <span>{document.downloadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modified</span>
                    <span>{formatDate(document.updatedAt)}</span>
                  </div>
                </div>
                
                {document.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {document.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{document.tags.length - 3}</span>
                    )}
                  </div>
                )}
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Preview"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </motion.button>
                    {!document.aiAnalysis && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeDocument(document.id);
                        }}
                        disabled={analyzeMutation.isPending}
                        className="text-yellow-600 hover:text-yellow-700 p-1 disabled:opacity-50"
                        title="AI Analysis"
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">v{document.version}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No documents found</p>
          <p className="text-gray-400">Upload your first document or adjust your search criteria</p>
        </div>
      )}

      {/* Drag and Drop Overlay */}
      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-cyan-600 bg-opacity-20 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-xl p-8 shadow-xl border-2 border-dashed border-cyan-400">
              <CloudArrowUpIcon className="w-16 h-16 text-cyan-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900 text-center">Drop files here to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Details Modal */}
      <AnimatePresence>
        {showDocumentDetails && selectedDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg bg-gray-50 mr-4`}>
                      {(() => {
                        const { icon: Icon, color } = getFileIcon(selectedDocument.type);
                        return <Icon className={`w-8 h-8 ${color}`} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedDocument.name}</h3>
                      <p className="text-gray-600">{selectedDocument.folderName || 'Root folder'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocumentDetails(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Document Info */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Document Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Type:</span>
                        <span className="font-medium">{selectedDocument.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium">{formatFileSize(selectedDocument.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Version:</span>
                        <span className="font-medium">v{selectedDocument.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uploaded by:</span>
                        <span className="font-medium">{selectedDocument.uploadedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Downloads:</span>
                        <span className="font-medium">{selectedDocument.downloadCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(selectedDocument.uploadedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modified:</span>
                        <span className="font-medium">{formatDate(selectedDocument.updatedAt)}</span>
                      </div>
                    </div>

                    {selectedDocument.tags.length > 0 && (
                      <div className="mt-6">
                        <h5 className="font-medium text-gray-900 mb-2">Tags</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedDocument.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                            >
                              <TagIcon className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Analysis */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">AI Analysis</h4>
                      {!selectedDocument.aiAnalysis && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleAnalyzeDocument(selectedDocument.id)}
                          disabled={analyzeMutation.isPending}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                        >
                          <SparklesIcon className="w-4 h-4" />
                          <span>{analyzeMutation.isPending ? 'Analyzing...' : 'Analyze with AI'}</span>
                        </motion.button>
                      )}
                    </div>
                    
                    {selectedDocument.aiAnalysis ? (
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                            Document Type
                          </h5>
                          <p className="text-gray-700">{selectedDocument.aiAnalysis.documentType}</p>
                          <div className="mt-1 flex items-center">
                            <span className="text-sm text-gray-500">Confidence: </span>
                            <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${selectedDocument.aiAnalysis.confidence * 100}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm text-gray-500">
                              {Math.round(selectedDocument.aiAnalysis.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Summary</h5>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {selectedDocument.aiAnalysis.summary}
                          </p>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Key Terms</h5>
                          <div className="flex flex-wrap gap-2">
                            {selectedDocument.aiAnalysis.keyTerms.map((term, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <SparklesIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>No AI analysis available</p>
                        <p className="text-sm">Click "Analyze with AI" to generate insights</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDocumentDetails(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-lg hover:bg-cyan-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentsPage; 