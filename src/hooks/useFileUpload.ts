import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UploadProgress {
  fileId: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  storagePath?: string;
  uploadedAt: Date;
}

export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
}

export interface UseFileUploadReturn {
  uploadFile: (file: File, options?: FileUploadOptions) => Promise<UploadedFile | null>;
  uploadMultipleFiles: (files: File[], options?: FileUploadOptions) => Promise<UploadedFile[]>;
  deleteFile: (fileId: string, storagePath: string) => Promise<boolean>;
  getFileUrl: (storagePath: string) => string;
  isUploading: boolean;
  progress: UploadProgress[];
}

/**
 * Hook for handling file uploads with Supabase Storage
 * Provides progress tracking, validation, and error handling
 */
export const useFileUpload = (): UseFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);

  /**
   * Upload a single file to Supabase Storage
   */
  const uploadFile = useCallback(async (
    file: File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile | null> => {
    const {
      bucket = 'checkout-files',
      folder = 'content',
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      onProgress,
      onComplete,
      onError,
    } = options;

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validation
      if (file.size > maxSize) {
        const error = `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
        onError?.(error);
        throw new Error(error);
      }

      // Validate file type - separate MIME types and extensions for clarity
      const mimeTypes = allowedTypes.filter(type => type.includes('/'));
      const extensions = allowedTypes.filter(type => type.startsWith('.')).map(ext => ext.toLowerCase());

      const hasValidMimeType = mimeTypes.length === 0 || mimeTypes.includes(file.type);
      const hasValidExtension = extensions.length === 0 || extensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!hasValidMimeType && !hasValidExtension) {
        const error = `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        onError?.(error);
        throw new Error(error);
      }

      setIsUploading(true);

      // Initialize progress
      const initialProgress: UploadProgress = {
        fileId,
        progress: 0,
        status: 'pending',
      };
      setProgress(prev => [...prev, initialProgress]);
      onProgress?.(initialProgress);

      // Update progress to uploading
      const uploadingProgress: UploadProgress = {
        fileId,
        progress: 10,
        status: 'uploading',
      };
      setProgress(prev => prev.map(p => p.fileId === fileId ? uploadingProgress : p));
      onProgress?.(uploadingProgress);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileId}.${fileExt}`;
      const storagePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        const uploadError = `Failed to upload file: ${error.message}`;
        const errorProgress: UploadProgress = {
          fileId,
          progress: 0,
          status: 'error',
          error: uploadError,
        };
        setProgress(prev => prev.map(p => p.fileId === fileId ? errorProgress : p));
        onError?.(uploadError);
        throw new Error(uploadError);
      }

      // Update progress to completed
      const completedProgress: UploadProgress = {
        fileId,
        progress: 100,
        status: 'completed',
      };
      setProgress(prev => prev.map(p => p.fileId === fileId ? completedProgress : p));
      onProgress?.(completedProgress);

      // Create uploaded file object
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath,
        uploadedAt: new Date(),
      };

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      uploadedFile.url = publicUrl;

      onComplete?.(uploadedFile);
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

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Upload multiple files
   */
  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<UploadedFile[]> => {
    const concurrency = Math.max(1, (options as any).concurrency ?? 3);
    const queue = [...files];
    const results: UploadedFile[] = [];

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;
        try {
          const uploaded = await uploadFile(file, options);
          if (uploaded) results.push(uploaded);
        } catch (_) {
          // already handled inside uploadFile
        }
      }
    });

    await Promise.all(workers);
    return results;
  }, [uploadFile]);

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(async (
    fileId: string,
    storagePath: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('checkout-files')
        .remove([storagePath]);

      if (error) {
        console.error('Failed to delete file:', error);
        return false;
      }

      // Remove from progress tracking
      setProgress(prev => prev.filter(p => p.fileId !== fileId));

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }, []);

  /**
   * Get public URL for a file
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
    deleteFile,
    getFileUrl,
    isUploading,
    progress,
  };
};

/**
 * Utility function to validate file before upload
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.doc', '.docx'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
    };
  }

  // Check file type
  const isValidType = allowedTypes.includes(file.type) ||
                     allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isValidType) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Utility function to format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
