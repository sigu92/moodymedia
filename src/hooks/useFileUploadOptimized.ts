import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Performance-optimized file upload hook with memory management

export interface UploadProgress {
  fileId: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  storagePath?: string;
  uploadedAt: Date;
  checksum?: string;
}

export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  priority?: 'low' | 'normal' | 'high'; // Upload priority for queuing
  retryAttempts?: number;
  retryDelay?: number;
  chunkSize?: number; // For large file chunking
}

export interface UseFileUploadReturn {
  uploadFile: (file: File, options?: FileUploadOptions) => Promise<UploadedFile | null>;
  uploadMultipleFiles: (files: File[], options?: FileUploadOptions) => Promise<UploadedFile[]>;
  cancelUpload: (fileId: string) => void;
  cancelAllUploads: () => void;
  deleteFile: (fileId: string, storagePath: string) => Promise<boolean>;
  getFileUrl: (storagePath: string) => string;
  isUploading: boolean;
  progress: UploadProgress[];
  activeUploads: number;
  memoryUsage: number; // Current memory usage in bytes
}

// Upload queue for managing concurrent uploads
class UploadQueue {
  private queue: Array<{
    id: string;
    file: File;
    options: FileUploadOptions;
    resolve: (value: UploadedFile | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;
  private maxConcurrent = 3;

  add(upload: {
    id: string;
    file: File;
    options: FileUploadOptions;
    resolve: (value: UploadedFile | null) => void;
    reject: (error: Error) => void;
  }) {
    this.queue.push(upload);
    this.process();
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.options.priority || 'normal'] - priorityOrder[a.options.priority || 'normal'];
    });

    // Process uploads up to maxConcurrent limit
    const promises = this.queue.splice(0, this.maxConcurrent).map(async (upload) => {
      try {
        const result = await this.uploadFile(upload.file, upload.options);
        upload.resolve(result);
      } catch (error) {
        upload.reject(error as Error);
      }
    });

    await Promise.allSettled(promises);
    this.processing = false;
    this.process(); // Continue processing remaining items
  }

  private async uploadFile(file: File, options: FileUploadOptions): Promise<UploadedFile> {
    // Implementation will be in the hook
    throw new Error('Not implemented');
  }

  cancel(id: string) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  cancelAll() {
    this.queue.length = 0;
  }

  get size() {
    return this.queue.length;
  }
}

// Memory management for file uploads
class MemoryManager {
  private uploadedFiles = new Map<string, UploadedFile>();
  private maxMemoryUsage = 50 * 1024 * 1024; // 50MB
  private currentMemoryUsage = 0;

  trackFile(file: UploadedFile) {
    this.uploadedFiles.set(file.id, file);
    this.currentMemoryUsage += file.size;

    // Clean up old files if memory usage is too high
    if (this.currentMemoryUsage > this.maxMemoryUsage) {
      this.cleanup();
    }
  }

  untrackFile(fileId: string) {
    const file = this.uploadedFiles.get(fileId);
    if (file) {
      this.currentMemoryUsage -= file.size;
      this.uploadedFiles.delete(fileId);
    }
  }

  cleanup() {
    // Remove oldest files first (simple LRU)
    const entries = Array.from(this.uploadedFiles.entries());
    entries.sort(([, a], [, b]) => a.uploadedAt.getTime() - b.uploadedAt.getTime());

    let freedMemory = 0;
    for (const [id, file] of entries) {
      if (this.currentMemoryUsage - freedMemory <= this.maxMemoryUsage * 0.7) break;
      freedMemory += file.size;
      this.uploadedFiles.delete(id);
    }
    this.currentMemoryUsage -= freedMemory;
  }

  getMemoryUsage() {
    return this.currentMemoryUsage;
  }
}

/**
 * Optimized file upload hook with memory management and performance improvements
 */
export const useFileUploadOptimized = (): UseFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);

  const uploadQueueRef = useRef(new UploadQueue());
  const memoryManagerRef = useRef(new MemoryManager());
  const abortControllersRef = useRef(new Map<string, AbortController>());
  const performanceMetricsRef = useRef({
    totalUploads: 0,
    totalBytes: 0,
    averageSpeed: 0,
    averageTime: 0,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadQueueRef.current.cancelAll();
      abortControllersRef.current.forEach(controller => controller.abort());
    };
  }, []);

  /**
   * Generate checksum for file integrity
   */
  const generateChecksum = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  /**
   * Optimized file validation with better error messages
   */
  const validateFile = useCallback((file: File, options: FileUploadOptions) => {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    } = options;

    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit (${maxSize / (1024 * 1024)}MB)`);
    }

    const isTypeAllowed = allowedTypes.includes(file.type) ||
      allowedTypes.some(type => {
        const extension = type.replace('application/', '.');
        return file.name.toLowerCase().endsWith(extension);
      });

    if (!isTypeAllowed) {
      throw new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`);
    }

    return true;
  }, []);

  /**
   * Upload single file with optimizations
   */
  const uploadFile = useCallback(async (
    file: File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile | null> => {
    const startTime = performance.now();
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate file
      validateFile(file, options);

      const {
        bucket = 'checkout-files',
        folder = 'content',
        onProgress,
        onComplete,
        onError,
        retryAttempts = 3,
        retryDelay = 1000,
      } = options;

      // Create abort controller for cancellation
      const abortController = new AbortController();
      abortControllersRef.current.set(fileId, abortController);

      setIsUploading(true);
      setActiveUploads(prev => prev + 1);

      // Generate checksum for integrity
      const checksum = await generateChecksum(file);

      // Initialize progress
      const initialProgress: UploadProgress = {
        fileId,
        progress: 0,
        status: 'pending',
      };
      setProgress(prev => [...prev, initialProgress]);
      onProgress?.(initialProgress);

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'unknown';
      const fileName = `${fileId}.${fileExt}`;
      const storagePath = `${folder}/${fileName}`;

      // Update progress to uploading
      const uploadingProgress: UploadProgress = {
        fileId,
        progress: 5,
        status: 'uploading',
        speed: 0,
        timeRemaining: 0,
      };
      setProgress(prev => prev.map(p => p.fileId === fileId ? uploadingProgress : p));
      onProgress?.(uploadingProgress);

      let uploadResult;
      let attempts = 0;
      let lastError: Error | null = null;

      // Retry logic with exponential backoff
      while (attempts < retryAttempts) {
        try {
          uploadResult = await supabase.storage
            .from(bucket)
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
              duplex: 'half',
            });

          if (!uploadResult.error) break;
          lastError = new Error(uploadResult.error.message);

        } catch (error) {
          lastError = error as Error;
        }

        attempts++;
        if (attempts < retryAttempts) {
          const delay = retryDelay * Math.pow(2, attempts - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!uploadResult || uploadResult.error) {
        const error = lastError || new Error('Upload failed after retries');
        const errorProgress: UploadProgress = {
          fileId,
          progress: 0,
          status: 'error',
          error: error.message,
        };
        setProgress(prev => prev.map(p => p.fileId === fileId ? errorProgress : p));
        onError?.(error.message);
        throw error;
      }

      // Update progress to completed
      const uploadTime = performance.now() - startTime;
      const speed = file.size / (uploadTime / 1000); // bytes per second

      const completedProgress: UploadProgress = {
        fileId,
        progress: 100,
        status: 'completed',
        speed,
      };
      setProgress(prev => prev.map(p => p.fileId === fileId ? completedProgress : p));
      onProgress?.(completedProgress);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      // Create uploaded file object
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        storagePath,
        uploadedAt: new Date(),
        checksum,
      };

      // Track in memory manager
      memoryManagerRef.current.trackFile(uploadedFile);

      // Update performance metrics
      performanceMetricsRef.current.totalUploads++;
      performanceMetricsRef.current.totalBytes += file.size;
      performanceMetricsRef.current.averageSpeed =
        (performanceMetricsRef.current.averageSpeed + speed) / 2;
      performanceMetricsRef.current.averageTime =
        (performanceMetricsRef.current.averageTime + uploadTime) / 2;

      onComplete?.(uploadedFile);

      // Clean up abort controller
      abortControllersRef.current.delete(fileId);

      return uploadedFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      const errorProgress: UploadProgress = {
        fileId,
        progress: 0,
        status: 'error',
        error: errorMessage,
      };
      setProgress(prev => prev.map(p => p.fileId === fileId ? errorProgress : p));
      onError?.(errorMessage);

      // Clean up
      abortControllersRef.current.delete(fileId);

      return null;
    } finally {
      setActiveUploads(prev => {
        const next = Math.max(0, prev - 1);
        setIsUploading(next > 0); // Use functional update to avoid stale closure
        return next;
      });
    }
  }, [validateFile, generateChecksum]);

  /**
   * Upload multiple files with queue management
   */
  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = [];
    const errors: string[] = [];

    // Process files in batches to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => uploadFile(file, options));

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else if (result.status === 'rejected') {
            errors.push(result.reason?.message || 'Upload failed');
          }
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Batch upload failed');
      }
    }

    if (errors.length > 0) {
      console.warn('Some files failed to upload:', errors);
      toast({
        title: "Partial Upload Complete",
        description: `${results.length} of ${files.length} files uploaded successfully`,
        variant: "destructive",
      });
    }

    return results;
  }, [uploadFile]);

  /**
   * Cancel specific upload
   */
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);

      // Update progress
      setProgress(prev => prev.map(p =>
        p.fileId === fileId ? { ...p, status: 'cancelled' } : p
      ));
    }
  }, []);

  /**
   * Cancel all uploads
   */
  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    uploadQueueRef.current.cancelAll();

    setProgress([]);
    setActiveUploads(0);
    setIsUploading(false);
  }, []);

  /**
   * Delete file with cleanup
   */
  const deleteFile = useCallback(async (fileId: string, storagePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('checkout-files')
        .remove([storagePath]);

      if (error) throw error;

      // Clean up from memory manager
      memoryManagerRef.current.untrackFile(fileId);

      // Remove from progress
      setProgress(prev => prev.filter(p => p.fileId !== fileId));

      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }, []);

  /**
   * Get file URL
   */
  const getFileUrl = useCallback((storagePath: string): string => {
    const { data: { publicUrl } } = supabase.storage
      .from('checkout-files')
      .getPublicUrl(storagePath);

    return publicUrl;
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    cancelUpload,
    cancelAllUploads,
    deleteFile,
    getFileUrl,
    isUploading,
    progress,
    activeUploads,
    memoryUsage: memoryManagerRef.current.getMemoryUsage(),
  };
};
