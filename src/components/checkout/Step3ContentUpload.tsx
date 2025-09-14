import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Upload, FileText, X, CheckCircle, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { useCart } from '@/hooks/useCart';
import { useFileUpload, validateFile } from '@/hooks/useFileUpload';
import { toast } from '@/hooks/use-toast';

interface Step3ContentUploadProps {
  onValidationChange?: (isValid: boolean) => void;
}

interface UploadedFile {
  id: string;
  file?: File;
  googleDocsLink?: string;
  cartItemId: string;
  name: string;
  size?: number;
  type?: string;
  uploadedAt: Date;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.doc', '.docx'];

export const Step3ContentUpload: React.FC<Step3ContentUploadProps> = ({ onValidationChange }) => {
  const { cartItems, formData } = useCheckout();
  const { uploadFile, isUploading } = useFileUpload();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [googleDocsInputs, setGoogleDocsInputs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get cart items that require self-provided content
  const itemsNeedingContent = cartItems.filter(item => {
    const formItem = formData.cartItems?.find(fi => fi.id === item.id);
    return formItem?.contentOption === 'self-provided';
  });

  // If no items need self-provided content, skip this step
  const shouldShowUpload = itemsNeedingContent.length > 0;

  // Validation
  useEffect(() => {
    if (!shouldShowUpload) {
      onValidationChange?.(true);
      return;
    }

    // Check if all required items have at least one file uploaded
    const allItemsHaveContent = itemsNeedingContent.every(item => {
      return uploadedFiles.some(file => file.cartItemId === item.id && file.status === 'success');
    });

    onValidationChange?.(allItemsHaveContent);
  }, [uploadedFiles, itemsNeedingContent, shouldShowUpload, onValidationChange]);

  // using shared validateFile from hook

  const validateGoogleDocsLink = (url: string): { isValid: boolean; error?: string } => {
    // Support document, spreadsheets, and presentation types
    const googleDocsRegex = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[A-Za-z0-9_-]+(?:\/.*)?$/;
    if (!googleDocsRegex.test(url.trim())) {
      return { isValid: false, error: 'Please enter a valid Google Docs, Sheets, or Slides link' };
    }
    return { isValid: true };
  };

  const simulateUpload = useCallback(async (file: File | string, cartItemId: string): Promise<UploadedFile> => {
    if (typeof file === 'string') {
      const validation = validateGoogleDocsLink(file);
      if (!validation.isValid) throw new Error(validation.error);
      return {
        id: `${cartItemId}_${Date.now()}`,
        googleDocsLink: file,
        cartItemId,
        name: 'Google Docs Link',
        uploadedAt: new Date(),
        status: 'success',
      };
    }
    const { isValid, error } = validateFile(file, { maxSize: MAX_FILE_SIZE, allowedExtensions: ALLOWED_EXTENSIONS });
    if (!isValid) throw new Error(error);
    const uploaded = await uploadFile(file, { folder: `content/${cartItemId}` });
    if (!uploaded) throw new Error('Upload failed');
    return {
      id: uploaded.id,
      file,
      cartItemId,
      name: uploaded.name,
      size: uploaded.size,
      type: uploaded.type,
      uploadedAt: uploaded.uploadedAt,
      status: 'success',
    };
  }, [uploadFile]);

  const handleFileUpload = useCallback(async (files: FileList | File[], cartItemId: string) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        setUploadingFiles(prev => new Set([...prev, file.name]));
        const uploadedFile = await simulateUpload(file, cartItemId);
        setUploadedFiles(prev => [...prev, uploadedFile]);
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded`,
        });
      } catch (error) {
        const errorFile: UploadedFile = {
          id: `${cartItemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          cartItemId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        setUploadedFiles(prev => [...prev, errorFile]);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : 'Failed to upload file',
          variant: "destructive",
        });
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    }
  }, [simulateUpload]);

  const handleGoogleDocsInputChange = useCallback((cartItemId: string, value: string) => {
    setGoogleDocsInputs(prev => ({
      ...prev,
      [cartItemId]: value
    }));
  }, []);

  const handleGoogleDocsLink = useCallback(async (url: string, cartItemId: string) => {
    try {
      const uploadedFile = await simulateUpload(url, cartItemId);
      setUploadedFiles(prev => [...prev, uploadedFile]);

      // Clear the input after successful upload
      setGoogleDocsInputs(prev => ({
        ...prev,
        [cartItemId]: ''
      }));

      toast({
        title: "Link added successfully",
        description: "Google Docs link has been added",
      });
    } catch (error) {
      toast({
        title: "Invalid link",
        description: error instanceof Error ? error.message : 'Failed to add link',
        variant: "destructive",
      });
    }
  }, [simulateUpload]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast({
      title: "File removed",
      description: "File has been removed from upload list",
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, cartItemId: string) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files, cartItemId);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, cartItemId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files, cartItemId);
    }
  };

  const getFilesForCartItem = (cartItemId: string) => {
    return uploadedFiles.filter(file => file.cartItemId === cartItemId);
  };

  const getCartItemById = (id: string) => {
    return cartItems.find(item => item.id === id);
  };

  // If no items need self-provided content, show a message and return
  if (!shouldShowUpload) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Content Upload Required</h3>
        <p className="text-muted-foreground">
          All items in your cart use professional writing services. No content upload is needed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Content Upload</h3>
        <p className="text-muted-foreground">
          Upload your content files or provide Google Docs links for the selected items.
        </p>
      </div>

      {itemsNeedingContent.map((cartItem) => {
        const item = getCartItemById(cartItem.id);
        const itemFiles = getFilesForCartItem(cartItem.id);
        const hasFiles = itemFiles.length > 0;
        const hasSuccessfulUploads = itemFiles.some(file => file.status === 'success');

        return (
          <Card key={cartItem.id} className="p-6">
            <div className="space-y-4">
              {/* Item Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-base">{item?.domain}</h4>
                  <p className="text-sm text-muted-foreground">
                    Category: {item?.category} • Niche: {item?.niche}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    Self-Provided Content Required
                  </Badge>
                </div>
                {hasSuccessfulUploads && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : hasFiles
                    ? 'border-green-300 bg-green-50'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cartItem.id)}
              >
                {hasFiles ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-green-600" />
                      <span className="font-medium text-green-700">
                        {itemFiles.length} file{itemFiles.length > 1 ? 's' : ''} uploaded
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop more files or click below to add additional content
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                    <div>
                      <p className="font-medium">Drop your Word document here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse files (.doc, .docx files up to 10MB)
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={uploadingFiles.size > 0}
                  >
                    {uploadingFiles.size > 0 ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".doc,.docx"
                    multiple
                    onChange={(e) => handleFileInputChange(e, cartItem.id)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Google Docs Link Input */}
              <div className="space-y-3">
                <Label htmlFor={`google-docs-${cartItem.id}`}>
                  Or provide a Google Docs link
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`google-docs-${cartItem.id}`}
                    placeholder="https://docs.google.com/document/d/..."
                    className="flex-1"
                    value={googleDocsInputs[cartItem.id] || ''}
                    onChange={(e) => handleGoogleDocsInputChange(cartItem.id, e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const url = googleDocsInputs[cartItem.id]?.trim();
                      if (url) {
                        handleGoogleDocsLink(url, cartItem.id);
                      }
                    }}
                    variant="outline"
                    disabled={!googleDocsInputs[cartItem.id]?.trim()}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              </div>

              {/* Uploaded Files List */}
              {itemFiles.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-2">
                    {itemFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          file.status === 'success'
                            ? 'bg-green-50 border-green-200'
                            : file.status === 'error'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {file.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : file.status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}

                          <div>
                            <p className="font-medium text-sm">
                              {file.googleDocsLink ? 'Google Docs Link' : file.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {file.size && (
                                <span>{(file.size / 1024).toFixed(2)} KB</span>
                              )}
                              {file.type && (
                                <span>• {file.type}</span>
                              )}
                              <span>• {file.uploadedAt.toLocaleTimeString()}</span>
                            </div>
                            {file.googleDocsLink && (
                              <a
                                href={file.googleDocsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {file.googleDocsLink}
                              </a>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Message */}
              {!hasSuccessfulUploads && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Please upload at least one file or provide a Google Docs link for this item.
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
