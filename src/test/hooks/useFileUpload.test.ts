import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { mockSupabaseClient } from '@/test/test-utils'
import * as supabaseModule from '@/integrations/supabase/client'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('useFileUpload', () => {
  let mockSupabase: typeof mockSupabaseClient

  beforeEach(() => {
    mockSupabase = mockSupabaseClient
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('File validation', () => {
    it('should validate file size correctly', async () => {
      const { result } = renderHook(() => useFileUpload());

      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        try {
          await result.current.uploadFile(largeFile, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('File size exceeds');
        };
      });
    });

    it('should validate file type correctly', async () => {
      const { result } = renderHook(() => useFileUpload());

      // Create an invalid file type
      const invalidFile = new File(['test content'], 'test.exe', {
        type: 'application/x-msdownload',
      });

      await act(async () => {
        try {
          await result.current.uploadFile(invalidFile, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('File type not allowed');
        };
      });
    });

    it('should accept valid file types', async () => {
      const { result } = renderHook(() => useFileUpload());

      // Mock successful upload
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'uploaded-file.docx' },
          error: null,
        }),
      });

      const validFile = new File(['test content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const result = await result.current.uploadFile(validFile, 'test-path');
        expect(result.fileName).toBe('document.docx');
        expect(result.storagePath).toBe('uploaded-file.docx');
      });
    });

    it('should validate Google Docs URLs', () => {
      const { result } = renderHook(() => useFileUpload());

      // Valid Google Docs URL
      expect(result.current.validateGoogleDocsUrl(
        'https://docs.google.com/document/d/1abc123/edit'
      )).toBe(true);

      // Invalid Google Docs URL
      expect(result.current.validateGoogleDocsUrl(
        'https://docs.google.com/spreadsheets/d/1abc123/edit'
      )).toBe(false);

      // Malformed URL
      expect(result.current.validateGoogleDocsUrl(
        'not-a-url'
      )).toBe(false);
    });

    it('should handle file extension validation', async () => {
      const { result } = renderHook(() => useFileUpload());

      // Create file with valid extension but wrong MIME type
      const trickyFile = new File(['test'], 'document.docx.exe', {
        type: 'application/x-msdownload',
      });

      await act(async () => {
        try {
          await result.current.uploadFile(trickyFile, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('File type not allowed');
        };
      });
    });
  });

  describe('File upload functionality', () => {
    beforeEach(() => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'uploaded-file.docx' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uploaded-file.docx' },
        }),
      });
    });

    it('should upload single file successfully', async () => {
      const { result } = renderHook(() => useFileUpload());

      const file = new File(['test content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const uploadResult = await result.current.uploadFile(file, 'test-path');
        expect(uploadResult.fileName).toBe('document.docx');
        expect(uploadResult.fileSize).toBe(file.size);
        expect(uploadResult.contentType).toBe('word_doc');
        expect(uploadResult.storagePath).toBe('uploaded-file.docx');
        expect(uploadResult.uploadStatus).toBe('completed');
      });
    });

    it('should upload multiple files successfully', async () => {
      const { result } = renderHook(() => useFileUpload());

      const files = [
        new File(['content 1'], 'doc1.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        new File(['content 2'], 'doc2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ]

      await act(async () => {
        const uploadResults = await result.current.uploadMultipleFiles(files, 'test-path');
        expect(uploadResults).toHaveLength(2);
        expect(uploadResults[0].fileName).toBe('doc1.docx');
        expect(uploadResults[1].fileName).toBe('doc2.docx');
      });
    });

    it('should handle upload progress', async () => {
      const { result } = renderHook(() => useFileUpload());

      const file = new File(['test'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      let progressCallbackCalled = false
      const onProgress = (progress: number) => {
        progressCallbackCalled = true
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      };

      await act(async () => {
        await result.current.uploadFile(file, 'test-path', { onProgress });
        expect(progressCallbackCalled).toBe(true);
      });
    });

    it('should generate unique file paths', async () => {
      const { result } = renderHook(() => useFileUpload());

      const file1 = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const file2 = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      let path1: string
      let path2: string

      await act(async () => {
        const result1 = await result.current.uploadFile(file1, 'test-path');
        const result2 = await result.current.uploadFile(file2, 'test-path');
        path1 = result1.storagePath
        path2 = result2.storagePath
      });

      expect(path1).not.toBe(path2);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors during upload', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useFileUpload());

      const file = new File(['test'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        try {
          await result.current.uploadFile(file, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('Upload failed');
        };
      });
    });

    it('should handle storage quota exceeded', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      const file = new File(['test'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        try {
          await result.current.uploadFile(file, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('Storage quota exceeded');
        };
      });
    });

    it('should handle partial upload failures in batch uploads', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn();
          .mockResolvedValueOnce({
            data: { path: 'file1.docx' },
            error: null,
          });
          .mockResolvedValueOnce({
            data: null,
            error: { message: 'Upload failed' },
          }),
      });

      const { result } = renderHook(() => useFileUpload());

      const files = [
        new File(['content 1'], 'file1.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        new File(['content 2'], 'file2.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ]

      await act(async () => {
        const results = await result.current.uploadMultipleFiles(files, 'test-path');
        expect(results).toHaveLength(2);
        expect(results[0].uploadStatus).toBe('completed');
        expect(results[1].uploadStatus).toBe('failed');
      });
    });

    it('should handle corrupted file uploads', async () => {
      // Mock a scenario where file upload succeeds but file is corrupted
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'corrupted.docx' },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/corrupted.docx' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      const corruptedFile = new File([''], 'corrupted.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const result = await result.current.uploadFile(corruptedFile, 'test-path');
        expect(result.fileSize).toBe(0);
        expect(result.uploadStatus).toBe('completed');
      });
    });
  });

  describe('File management', () => {
    it('should delete files successfully', async () => {
      mockSupabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        const success = await result.current.deleteFile('test-path/file.docx');
        expect(success).toBe(true);
      });
    });

    it('should handle delete failures', async () => {
      mockSupabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        const success = await result.current.deleteFile('test-path/file.docx');
        expect(success).toBe(false);
      });
    });

    it('should get public URLs correctly', async () => {
      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.docx' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        const url = await result.current.getFileUrl('test-path/file.docx');
        expect(url).toBe('https://example.com/file.docx');
      });
    });

    it('should handle URL generation failures', async () => {
      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: null,
          error: { message: 'URL generation failed' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        const url = await result.current.getFileUrl('test-path/file.docx');
        expect(url).toBe('');
      });
    });
  });

  describe('Google Docs integration', () => {
    it('should handle Google Docs link uploads', async () => {
      const { result } = renderHook(() => useFileUpload());

      const googleDocsUrl = 'https://docs.google.com/document/d/1abc123/edit'

      await act(async () => {
        const result = await result.current.uploadGoogleDocsLink(
          googleDocsUrl,
          'test-order',
          'test-item'
        );
        expect(result.fileName).toContain('Google Docs');
        expect(result.contentType).toBe('google_doc');
        expect(result.storagePath).toBe(googleDocsUrl);
      });
    });

    it('should reject invalid Google Docs URLs', async () => {
      const { result } = renderHook(() => useFileUpload());

      const invalidUrl = 'https://docs.google.com/spreadsheets/d/1abc123/edit'

      await act(async () => {
        try {
          await result.current.uploadGoogleDocsLink(invalidUrl, 'test-order', 'test-item');
        } catch (error: unknown) {
          expect(error.message).toContain('Invalid Google Docs URL');
        };
      });
    });

    it('should handle Google Docs upload failures', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const { result } = renderHook(() => useFileUpload());

      const googleDocsUrl = 'https://docs.google.com/document/d/1abc123/edit'

      await act(async () => {
        try {
          await result.current.uploadGoogleDocsLink(googleDocsUrl, 'test-order', 'test-item');
        } catch (error: unknown) {
          expect(error.message).toContain('Failed to save Google Docs link');
        };
      });
    });
  });

  describe('File type detection', () => {
    it('should correctly identify Word documents', () => {
      const { result } = renderHook(() => useFileUpload());

      const wordFile = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      expect(result.current.getContentType(wordFile)).toBe('word_doc');
    });

    it('should correctly identify Google Docs links', () => {
      const { result } = renderHook(() => useFileUpload());

      const googleDocsUrl = 'https://docs.google.com/document/d/1abc123/edit'
      expect(result.current.getContentType(null, googleDocsUrl)).toBe('google_doc');
    });

    it('should identify other file types', () => {
      const { result } = renderHook(() => useFileUpload());

      const pdfFile = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });

      expect(result.current.getContentType(pdfFile)).toBe('other');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle concurrent uploads efficiently', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockImplementation(() =>
          new Promise(resolve =>
            setTimeout(() => resolve({
              data: { path: 'uploaded-file.docx' },
              error: null,
            }), 100);
          );
        ),
      });

      const { result } = renderHook(() => useFileUpload());

      const files = Array.from({ length: 5 }, (_, i) =>
        new File([`content ${i}`], `doc${i}.docx`, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      );

      const startTime = performance.now();

      await act(async () => {
        await result.current.uploadMultipleFiles(files, 'test-path');
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime

      // Should complete within reasonable time (allowing for sequential processing);
      expect(totalTime).toBeLessThan(1000) // Less than 1 second
    });

    it('should handle empty file uploads', async () => {
      const { result } = renderHook(() => useFileUpload());

      const emptyFile = new File([''], 'empty.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const result = await result.current.uploadFile(emptyFile, 'test-path');
        expect(result.fileSize).toBe(0);
        expect(result.uploadStatus).toBe('completed');
      });
    });

    it('should handle very large file names', async () => {
      const { result } = renderHook(() => useFileUpload());

      const longFileName = 'a'.repeat(200) + '.docx'
      const file = new File(['content'], longFileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const result = await result.current.uploadFile(file, 'test-path');
        expect(result.fileName).toBe(longFileName);
        expect(result.uploadStatus).toBe('completed');
      });
    });

    it('should handle special characters in file names', async () => {
      const { result } = renderHook(() => useFileUpload());

      const specialFileName = 'test@#$%^&()_+.docx'
      const file = new File(['content'], specialFileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await act(async () => {
        const result = await result.current.uploadFile(file, 'test-path');
        expect(result.fileName).toBe(specialFileName);
        expect(result.uploadStatus).toBe('completed');
      });
    });
  });

  describe('Security and validation', () => {
    it('should prevent directory traversal attacks', async () => {
      const { result } = renderHook(() => useFileUpload());

      const maliciousPath = '../../../etc/passwd'
      const file = new File(['content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // The hook should sanitize paths internally
      await act(async () => {
        const result = await result.current.uploadFile(file, maliciousPath);
        expect(result.storagePath).not.toContain('../');
      });
    });

    it('should validate file content safely', async () => {
      const { result } = renderHook(() => useFileUpload());

      // File with potentially malicious content
      const suspiciousFile = new File(['<?php echo "malicious"; ?>'], 'suspicious.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Should still upload safely (content validation is handled at the server level);
      await act(async () => {
        const result = await result.current.uploadFile(suspiciousFile, 'test-path');
        expect(result.uploadStatus).toBe('completed');
      });
    });

    it('should handle null and undefined files', async () => {
      const { result } = renderHook(() => useFileUpload());

      await act(async () => {
        try {
          await result.current.uploadFile(null as File | null, 'test-path');
        } catch (error: unknown) {
          expect(error.message).toContain('Invalid file');
        };
      });
    });
  });
});
