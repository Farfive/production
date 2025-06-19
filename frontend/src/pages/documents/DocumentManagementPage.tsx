import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  FolderIcon,

  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  DocumentArrowDownIcon,
  ShareIcon,

  EyeIcon,

  Squares2X2Icon,
  ListBulletIcon,

} from '@heroicons/react/24/outline';
import { DocumentIcon as DocumentIconSolid } from '@heroicons/react/24/solid';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
  version: string;
  url: string;
  thumbnail?: string;
  shared: boolean;
  tags: string[];
}

interface Folder {
  id: string;
  name: string;
  documentsCount: number;
  createdAt: string;
  color: string;
}

const DocumentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Mock data - replace with real API calls
  const [documents] = useState<Document[]>([
    {
      id: 'doc_1',
      name: 'Product Specifications.pdf',
      type: 'application/pdf',
      size: 2457600,
      category: 'specifications',
      uploadedAt: '2024-01-15T10:30:00Z',
      uploadedBy: 'John Smith',
      version: '1.2',
      url: '/documents/product-specs.pdf',
      shared: true,
      tags: ['product', 'specifications', 'technical']
    },
    {
      id: 'doc_2',
      name: 'Manufacturing Process.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1843200,
      category: 'processes',
      uploadedAt: '2024-01-14T14:20:00Z',
      uploadedBy: 'Sarah Johnson',
      version: '2.0',
      url: '/documents/manufacturing-process.docx',
      shared: false,
      tags: ['process', 'manufacturing', 'workflow']
    },
    {
      id: 'doc_3',
      name: 'Quality Control Checklist.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024000,
      category: 'quality',
      uploadedAt: '2024-01-13T09:15:00Z',
      uploadedBy: 'Mike Davis',
      version: '1.0',
      url: '/documents/qc-checklist.xlsx',
      shared: true,
      tags: ['quality', 'checklist', 'control']
    },
    {
      id: 'doc_4',
      name: 'CAD Assembly Drawing.dwg',
      type: 'application/acad',
      size: 15728640,
      category: 'drawings',
      uploadedAt: '2024-01-12T16:45:00Z',
      uploadedBy: 'Emily Chen',
      version: '3.1',
      url: '/documents/cad-assembly.dwg',
      shared: false,
      tags: ['cad', 'drawing', 'assembly']
    },
    {
      id: 'doc_5',
      name: 'Compliance Certificate.pdf',
      type: 'application/pdf',
      size: 891289,
      category: 'certificates',
      uploadedAt: '2024-01-11T11:00:00Z',
      uploadedBy: 'Legal Team',
      version: '1.0',
      url: '/documents/compliance-cert.pdf',
      shared: true,
      tags: ['compliance', 'certificate', 'legal']
    },
    {
      id: 'doc_6',
      name: 'Project Timeline.jpg',
      type: 'image/jpeg',
      size: 2048000,
      category: 'reports',
      uploadedAt: '2024-01-10T13:30:00Z',
      uploadedBy: 'Project Manager',
      version: '1.0',
      url: '/documents/timeline.jpg',
      thumbnail: '/thumbnails/timeline-thumb.jpg',
      shared: false,
      tags: ['timeline', 'project', 'schedule']
    }
  ]);

  const [folders] = useState<Folder[]>([
    { id: 'folder_1', name: 'Technical Specifications', documentsCount: 12, createdAt: '2024-01-01', color: 'blue' },
    { id: 'folder_2', name: 'Manufacturing Processes', documentsCount: 8, createdAt: '2024-01-02', color: 'green' },
    { id: 'folder_3', name: 'Quality Control', documentsCount: 15, createdAt: '2024-01-03', color: 'yellow' },
    { id: 'folder_4', name: 'Compliance Documents', documentsCount: 6, createdAt: '2024-01-04', color: 'red' },
    { id: 'folder_5', name: 'CAD Drawings', documentsCount: 23, createdAt: '2024-01-05', color: 'purple' }
  ]);

  const categories = [
    { id: 'all', name: 'All Documents', count: documents.length },
    { id: 'specifications', name: 'Specifications', count: documents.filter(d => d.category === 'specifications').length },
    { id: 'processes', name: 'Processes', count: documents.filter(d => d.category === 'processes').length },
    { id: 'quality', name: 'Quality Control', count: documents.filter(d => d.category === 'quality').length },
    { id: 'drawings', name: 'Drawings', count: documents.filter(d => d.category === 'drawings').length },
    { id: 'certificates', name: 'Certificates', count: documents.filter(d => d.category === 'certificates').length },
    { id: 'reports', name: 'Reports', count: documents.filter(d => d.category === 'reports').length }
  ];

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <PhotoIcon className="h-6 w-6" />;
    if (type.startsWith('video/')) return <FilmIcon className="h-6 w-6" />;
    if (type.includes('pdf')) return <DocumentTextIcon className="h-6 w-6" />;
    return <DocumentIcon className="h-6 w-6" />;
  };

  const getFileIconColor = (type: string) => {
    if (type.startsWith('image/')) return 'text-green-600';
    if (type.startsWith('video/')) return 'text-purple-600';
    if (type.includes('pdf')) return 'text-red-600';
    if (type.includes('word')) return 'text-blue-600';
    if (type.includes('sheet')) return 'text-green-600';
    return 'text-gray-600';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploadingFiles(fileArray);
    setShowUploadModal(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on documents:`, selectedDocuments);
    setSelectedDocuments([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-primary-600 bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <CloudArrowUpIcon className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center space-x-3">
          <DocumentIconSolid className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Document Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Organize, share, and manage your manufacturing documents
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FolderIcon className="w-4 h-4 mr-2" />
            New Folder
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md"
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            Upload Files
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {[
          { label: 'Total Documents', value: documents.length, icon: DocumentIcon, color: 'text-blue-600' },
          { label: 'Folders', value: folders.length, icon: FolderIcon, color: 'text-green-600' },
          { label: 'Shared Documents', value: documents.filter(d => d.shared).length, icon: ShareIcon, color: 'text-purple-600' },
          { label: 'Storage Used', value: '127 MB', icon: CloudArrowUpIcon, color: 'text-orange-600' }
        ].map((stat, index) => (
          <motion.div 
            key={index}
            variants={fadeInUp}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className={`${stat.color} dark:text-opacity-80`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Folders Section */}
      <motion.div 
        className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Folders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {folders.map((folder) => (
              <div 
                key={folder.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <FolderIcon className={`h-8 w-8 text-${folder.color}-600`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {folder.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {folder.documentsCount} files
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center justify-between"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      {selectedDocuments.length > 0 && (
        <motion.div 
          className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {selectedDocuments.length} document(s) selected
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('download')}
                className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-1 rounded border"
              >
                Download
              </button>
              <button
                onClick={() => handleBulkAction('share')}
                className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-1 rounded border"
              >
                Share
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Documents Grid/List */}
      <motion.div 
        className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-3'
        }`}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {filteredDocuments.map((document) => (
          <motion.div 
            key={document.id}
            variants={fadeInUp}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${
              selectedDocuments.includes(document.id) ? 'ring-2 ring-primary-500' : ''
            } ${viewMode === 'list' ? 'p-4' : 'p-6'}`}
          >
            {viewMode === 'grid' ? (
              // Grid View
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className={`${getFileIconColor(document.type)} dark:text-opacity-80`}>
                    {getFileIcon(document.type)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(document.id)}
                      onChange={() => handleDocumentSelection(document.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <button className="text-gray-400 hover:text-gray-600">
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {document.name}
                </h3>
                
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>Size: {formatFileSize(document.size)}</p>
                  <p>Version: {document.version}</p>
                  <p>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
                  <p>By: {document.uploadedBy}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {document.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {tag}
                    </span>
                  ))}
                  {document.tags.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{document.tags.length - 2} more
                    </span>
                  )}
                </div>

                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 text-xs bg-primary-600 hover:bg-primary-700 text-white py-2 rounded transition-colors">
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    View
                  </button>
                  <button className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors">
                    <DocumentArrowDownIcon className="h-4 w-4 inline mr-1" />
                    Download
                  </button>
                </div>
              </div>
            ) : (
              // List View
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedDocuments.includes(document.id)}
                  onChange={() => handleDocumentSelection(document.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                
                <div className={`${getFileIconColor(document.type)} dark:text-opacity-80`}>
                  {getFileIcon(document.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {document.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{formatFileSize(document.size)}</span>
                    <span>v{document.version}</span>
                    <span>{document.uploadedBy}</span>
                    <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {document.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  {document.shared && (
                    <ShareIcon className="h-4 w-4 text-green-600" />
                  )}
                  <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {filteredDocuments.length === 0 && (
        <motion.div 
          className="text-center py-12"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No documents found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by uploading your first document.'
            }
          </p>
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Upload Documents
              </h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="specifications">Specifications</option>
                    <option value="processes">Processes</option>
                    <option value="quality">Quality Control</option>
                    <option value="drawings">Drawings</option>
                    <option value="certificates">Certificates</option>
                    <option value="reports">Reports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter tags separated by commas"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadingFiles.length} file(s) selected
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFiles([]);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle upload logic here
                    setShowUploadModal(false);
                    setUploadingFiles([]);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentManagementPage; 