import { ApiClient } from '../api-client';
import * as Sentry from '@sentry/react';

// Types for storage service
export interface StorageConfig {
  provider: 'aws-s3' | 'cloudflare-r2' | 'azure-blob' | 'gcp-storage';
  region?: string;
  bucket: string;
  endpoint?: string;
  cdnUrl?: string;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  cacheControl?: string;
  expires?: Date;
  encryption?: 'AES256' | 'aws:kms';
  acl?: 'private' | 'public-read' | 'public-read-write';
}

export interface UploadRequest {
  file: File;
  options?: UploadOptions;
}

export interface UploadResponse {
  id: string;
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  contentType: string;
  filename: string;
  folder?: string;
  metadata?: Record<string, string>;
  uploadedAt: string;
}

export interface PresignedUrlRequest {
  key: string;
  contentType: string;
  size: number;
  expiresIn?: number; // seconds
  options?: UploadOptions;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  fields?: Record<string, string>; // For multipart uploads
  expiresAt: string;
}

export interface FileInfo {
  id: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
  url: string;
  cdnUrl?: string;
  folder?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  isPublic: boolean;
  uploadedAt: string;
  lastModified: string;
  etag: string;
}

export interface FileListOptions {
  folder?: string;
  prefix?: string;
  limit?: number;
  marker?: string; // For pagination
  recursive?: boolean;
}

export interface FileListResponse {
  files: FileInfo[];
  nextMarker?: string;
  isTruncated: boolean;
  totalCount: number;
}

export interface BulkDeleteRequest {
  keys: string[];
}

export interface BulkDeleteResponse {
  deleted: string[];
  errors: Array<{
    key: string;
    error: string;
  }>;
}

export interface StorageUsage {
  totalFiles: number;
  totalSize: number;
  sizeByType: Record<string, number>;
  sizeByFolder: Record<string, number>;
  monthlyTransfer: number;
  storageQuota?: number;
  transferQuota?: number;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  rotate?: number;
  watermark?: {
    text?: string;
    image?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
}

export interface VideoProcessingOptions {
  format?: 'mp4' | 'webm' | 'mov';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  resolution?: '480p' | '720p' | '1080p' | '4k';
  bitrate?: number;
  fps?: number;
  startTime?: number; // seconds
  duration?: number; // seconds
  thumbnail?: {
    time?: number; // seconds
    width?: number;
    height?: number;
  };
}

// File validation
export interface FileValidationOptions {
  maxSize?: number; // bytes
  minSize?: number; // bytes
  allowedTypes?: string[];
  blockedTypes?: string[];
  maxWidth?: number; // for images
  maxHeight?: number; // for images
  minWidth?: number; // for images
  minHeight?: number; // for images
  maxDuration?: number; // for videos, in seconds
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Storage service class
export class StorageService {
  private apiClient: ApiClient;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.apiClient = new ApiClient({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
      timeout: 120000, // 2 minutes for file uploads
      retryAttempts: 3,
      enableLogging: true,
    });
  }

  /**
   * Upload a single file
   */
  public async uploadFile(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Validate file before upload
      const validation = this.validateFile(request.file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      const formData = new FormData();
      formData.append('file', request.file);
      
      if (request.options) {
        formData.append('options', JSON.stringify(request.options));
      }

      const response = await this.apiClient.post('/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          this.handleUploadProgress(request.file.name, percentCompleted);
        },
      });

      return response;
    } catch (error) {
      this.handleStorageError('upload_file', error, {
        filename: request.file.name,
        size: request.file.size,
        type: request.file.type,
      });
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  public async uploadFiles(requests: UploadRequest[]): Promise<UploadResponse[]> {
    try {
      const uploadPromises = requests.map(request => this.uploadFile(request));
      const results = await Promise.allSettled(uploadPromises);

      const successful: UploadResponse[] = [];
      const failed: Array<{ filename: string; error: any }> = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            filename: requests[index].file.name,
            error: result.reason,
          });
        }
      });

      if (failed.length > 0) {
        console.warn('Some file uploads failed:', failed);
        failed.forEach(({ error }) => {
          Sentry.captureException(error);
        });
      }

      return successful;
    } catch (error) {
      this.handleStorageError('upload_files', error, { count: requests.length });
      throw error;
    }
  }

  /**
   * Get presigned URL for direct upload
   */
  public async getPresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    try {
      const response = await this.apiClient.post('/storage/presigned-url', request);
      return response;
    } catch (error) {
      this.handleStorageError('get_presigned_url', error, request);
      throw error;
    }
  }

  /**
   * Complete multipart upload
   */
  public async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<UploadResponse> {
    try {
      const response = await this.apiClient.post('/storage/complete-multipart', {
        key,
        uploadId,
        parts,
      });
      return response;
    } catch (error) {
      this.handleStorageError('complete_multipart_upload', error, { key, uploadId });
      throw error;
    }
  }

  /**
   * Get file information
   */
  public async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const response = await this.apiClient.get(`/storage/files/${encodeURIComponent(key)}`);
      return response;
    } catch (error) {
      this.handleStorageError('get_file_info', error, { key });
      throw error;
    }
  }

  /**
   * List files
   */
  public async listFiles(options: FileListOptions = {}): Promise<FileListResponse> {
    try {
      const response = await this.apiClient.get('/storage/files', {
        params: options,
      });
      return response;
    } catch (error) {
      this.handleStorageError('list_files', error, options);
      throw error;
    }
  }

  /**
   * Delete a single file
   */
  public async deleteFile(key: string): Promise<void> {
    try {
      await this.apiClient.delete(`/storage/files/${encodeURIComponent(key)}`);
    } catch (error) {
      this.handleStorageError('delete_file', error, { key });
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  public async deleteFiles(keys: string[]): Promise<BulkDeleteResponse> {
    try {
      const response = await this.apiClient.delete('/storage/files/bulk', {
        data: { keys },
      });
      return response;
    } catch (error) {
      this.handleStorageError('delete_files', error, { keys });
      throw error;
    }
  }

  /**
   * Copy file
   */
  public async copyFile(
    sourceKey: string,
    destinationKey: string,
    options?: Partial<UploadOptions>
  ): Promise<FileInfo> {
    try {
      const response = await this.apiClient.post('/storage/copy', {
        sourceKey,
        destinationKey,
        options,
      });
      return response;
    } catch (error) {
      this.handleStorageError('copy_file', error, { sourceKey, destinationKey });
      throw error;
    }
  }

  /**
   * Move file
   */
  public async moveFile(
    sourceKey: string,
    destinationKey: string,
    options?: Partial<UploadOptions>
  ): Promise<FileInfo> {
    try {
      const response = await this.apiClient.post('/storage/move', {
        sourceKey,
        destinationKey,
        options,
      });
      return response;
    } catch (error) {
      this.handleStorageError('move_file', error, { sourceKey, destinationKey });
      throw error;
    }
  }

  /**
   * Generate download URL with expiration
   */
  public async generateDownloadUrl(
    key: string,
    expiresIn: number = 3600,
    filename?: string
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/storage/download-url', {
        key,
        expiresIn,
        filename,
      });
      return response.url;
    } catch (error) {
      this.handleStorageError('generate_download_url', error, { key, expiresIn });
      throw error;
    }
  }

  /**
   * Process image with transformations
   */
  public async processImage(
    key: string,
    options: ImageProcessingOptions,
    outputKey?: string
  ): Promise<UploadResponse> {
    try {
      const response = await this.apiClient.post('/storage/process-image', {
        key,
        options,
        outputKey,
      });
      return response;
    } catch (error) {
      this.handleStorageError('process_image', error, { key, options });
      throw error;
    }
  }

  /**
   * Process video with transformations
   */
  public async processVideo(
    key: string,
    options: VideoProcessingOptions,
    outputKey?: string
  ): Promise<UploadResponse> {
    try {
      const response = await this.apiClient.post('/storage/process-video', {
        key,
        options,
        outputKey,
      });
      return response;
    } catch (error) {
      this.handleStorageError('process_video', error, { key, options });
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  public async getStorageUsage(): Promise<StorageUsage> {
    try {
      const response = await this.apiClient.get('/storage/usage');
      return response;
    } catch (error) {
      this.handleStorageError('get_storage_usage', error);
      throw error;
    }
  }

  /**
   * Set file permissions
   */
  public async setFilePermissions(
    key: string,
    permissions: { isPublic: boolean; acl?: string }
  ): Promise<void> {
    try {
      await this.apiClient.put(`/storage/files/${encodeURIComponent(key)}/permissions`, permissions);
    } catch (error) {
      this.handleStorageError('set_file_permissions', error, { key, permissions });
      throw error;
    }
  }

  /**
   * Add file tags
   */
  public async addFileTags(key: string, tags: Record<string, string>): Promise<void> {
    try {
      await this.apiClient.put(`/storage/files/${encodeURIComponent(key)}/tags`, { tags });
    } catch (error) {
      this.handleStorageError('add_file_tags', error, { key, tags });
      throw error;
    }
  }

  /**
   * Search files by metadata or tags
   */
  public async searchFiles(query: {
    tags?: Record<string, string>;
    metadata?: Record<string, string>;
    contentType?: string;
    folder?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    sizeRange?: {
      min: number;
      max: number;
    };
  }): Promise<FileListResponse> {
    try {
      const response = await this.apiClient.post('/storage/search', query);
      return response;
    } catch (error) {
      this.handleStorageError('search_files', error, query);
      throw error;
    }
  }

  // File validation methods
  public validateFile(
    file: File,
    options: FileValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];

    // Size validation
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(options.maxSize)}`);
    }

    if (options.minSize && file.size < options.minSize) {
      errors.push(`File size is below minimum required size of ${this.formatFileSize(options.minSize)}`);
    }

    // Type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    if (options.blockedTypes && options.blockedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is blocked`);
    }

    // Image-specific validation (requires additional processing)
    if (file.type.startsWith('image/') && (options.maxWidth || options.maxHeight || options.minWidth || options.minHeight)) {
      // This would require loading the image to check dimensions
      // For now, we'll skip this validation in the client
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Utility methods
  public formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  public getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  public getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      xml: 'application/xml',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      
      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  public generateUniqueKey(filename: string, folder?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = this.getFileExtension(filename);
    const baseName = filename.replace(`.${extension}`, '');
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    const uniqueFilename = `${sanitizedBaseName}_${timestamp}_${random}.${extension}`;
    
    return folder ? `${folder}/${uniqueFilename}` : uniqueFilename;
  }

  // Private helper methods
  private handleUploadProgress(filename: string, percent: number): void {
    // Emit progress event for UI updates
    window.dispatchEvent(new CustomEvent('upload-progress', {
      detail: { filename, percent }
    }));
  }

  private handleStorageError(operation: string, error: any, context: any = {}): void {
    console.error(`[StorageService] ${operation} failed:`, error);

    Sentry.captureException(error, {
      tags: {
        service: 'storage',
        operation,
        provider: this.config.provider,
      },
      extra: {
        context,
        config: {
          provider: this.config.provider,
          region: this.config.region,
          bucket: this.config.bucket,
        },
      },
    });
  }
}

// Storage service instance
export const storageService = new StorageService({
  provider: (process.env.REACT_APP_STORAGE_PROVIDER as any) || 'aws-s3',
  region: process.env.REACT_APP_STORAGE_REGION,
  bucket: process.env.REACT_APP_STORAGE_BUCKET || '',
  endpoint: process.env.REACT_APP_STORAGE_ENDPOINT,
  cdnUrl: process.env.REACT_APP_CDN_URL,
});

// Helper functions for common storage operations
export const storageHelpers = {
  /**
   * Upload profile image
   */
  uploadProfileImage: async (file: File, userId: string): Promise<UploadResponse> => {
    return storageService.uploadFile({
      file,
      options: {
        folder: `profiles/${userId}`,
        isPublic: true,
        acl: 'public-read' as const,
        cacheControl: 'max-age=31536000', // 1 year
      },
    });
  },

  /**
   * Upload product images
   */
  uploadProductImages: async (files: File[], productId: string): Promise<UploadResponse[]> => {
    const uploadRequests = files.map(file => ({
      file,
      options: {
        folder: `products/${productId}`,
        isPublic: true,
        acl: 'public-read' as const,
        cacheControl: 'max-age=31536000',
      },
    }));

    return storageService.uploadFiles(uploadRequests);
  },

  /**
   * Upload document with processing
   */
  uploadDocument: async (file: File, orderId: string, isPublic: boolean = false): Promise<UploadResponse> => {
    return storageService.uploadFile({
      file,
      options: {
        folder: `documents/${orderId}`,
        isPublic,
        acl: isPublic ? 'public-read' : 'private',
        metadata: {
          orderId,
          uploadedBy: 'user', // This would come from auth context
        },
        tags: {
          type: 'document',
          orderId,
        },
      },
    });
  },

  /**
   * Create optimized image variants
   */
  createImageVariants: async (
    originalKey: string,
    variants: Array<{ size: string; width: number; height?: number; quality?: number }>
  ): Promise<UploadResponse[]> => {
    const processingPromises = variants.map(variant =>
      storageService.processImage(originalKey, {
        width: variant.width,
        height: variant.height,
        quality: variant.quality || 85,
        format: 'webp',
        fit: 'cover',
      }, `${originalKey}_${variant.size}`)
    );

    const results = await Promise.allSettled(processingPromises);
    return results
      .filter((result): result is PromiseFulfilledResult<UploadResponse> => result.status === 'fulfilled')
      .map(result => result.value);
  },
}; 