import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MarginType } from '@/utils/marginUtils';
import { useAuditLogger } from '@/hooks/useAuditLogger';

interface BulkOperationResult {
  success: boolean;
  submissionId: string;
  error?: string;
}

interface UseBulkOperationsReturn {
  isProcessing: boolean;
  progress: { completed: number; total: number; currentOperation: string };
  results: BulkOperationResult[];
  applyMarginsToSelection: (
    submissionIds: string[],
    margin: MarginType,
    onProgress?: (completed: number, total: number) => void
  ) => Promise<boolean>;
  approveBulk: (
    submissionIds: string[],
    marketplacePrice: number,
    reviewNotes?: string,
    onProgress?: (completed: number, total: number) => void
  ) => Promise<boolean>;
  rejectBulk: (
    submissionIds: string[],
    reviewNotes: string,
    onProgress?: (completed: number, total: number) => void
  ) => Promise<boolean>;
  rollbackBulkOperation: (
    operationId: string,
    maxAgeMinutes?: number
  ) => Promise<{ success: boolean; rolledBackCount: number; errors: string[] }>;
  clearResults: () => void;
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentOperation: '' });
  const [results, setResults] = useState<BulkOperationResult[]>([]);
  const { toast } = useToast();
  const auditLogger = useAuditLogger();

  const clearResults = useCallback(() => {
    setResults([]);
    setProgress({ completed: 0, total: 0, currentOperation: '' });
  }, []);

  const applyMarginsToSelection = useCallback(async (
    submissionIds: string[],
    margin: MarginType,
    onProgress?: (completed: number, total: number) => void
  ): Promise<boolean> => {
    if (submissionIds.length === 0) return false;

    setIsProcessing(true);
    setProgress({ completed: 0, total: submissionIds.length, currentOperation: 'Applying margins...' });
    const operationResults: BulkOperationResult[] = [];

    try {
      // First, get the current data for all submissions to calculate new prices
      const { data: submissions, error: fetchError } = await supabase
        .from('media_outlets')
        .select('id, purchase_price')
        .in('id', submissionIds);

      if (fetchError) {
        throw new Error(`Failed to fetch submission data: ${fetchError.message}`);
      }

      if (!submissions) {
        throw new Error('No submissions found');
      }

      // Generate batch_id once before the loop for consistent batch identification
      const batchId = submissionIds.length > 1 ? 'bulk-margins-' + Date.now() : null;

      // Process each submission
      for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        const result: BulkOperationResult = {
          success: false,
          submissionId: submission.id
        };

        try {
          setProgress(prev => ({
            ...prev,
            currentOperation: `Processing ${i + 1}/${submissions.length}: ${submission.id.slice(0, 8)}...`
          }));

          // Calculate new price based on margin
          // Note: Moody websites use the same price calculation, but profit is calculated differently (100% of sale)
          let newPrice: number;
          const isMoody = submission.admin_tags?.includes('moody') || false;

          if (margin.type === 'fixed') {
            newPrice = (submission.purchase_price || 0) + margin.value;
          } else {
            const multiplier = 1 + (margin.value / 100);
            newPrice = (submission.purchase_price || 0) * multiplier;
          }

          // Update the submission with new marketplace price
          const { error: updateError } = await supabase
            .from('media_outlets')
            .update({
              price: Math.max(0, newPrice), // Ensure non-negative
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.id);

          if (updateError) {
            result.error = updateError.message;
          } else {
            result.success = true;

            // Log successful margin application
            await auditLogger.logMarginOperation({
              operationId: submissionIds.length === 1 ? submission.id : 'bulk-margins-' + Date.now(),
              operationType: submissionIds.length === 1 ? 'single_approval' : 'bulk_margin_application',
              submissionId: submission.id,
              previousPrice: submission.price,
              newPrice: newPrice,
              purchasePrice: submission.purchase_price,
              marginType: margin.type,
              marginValue: margin.value,
              marginPercentage: margin.type === 'fixed' ?
                (margin.value / (submission.purchase_price || 1)) * 100 :
                margin.value,
              bulkOperationCount: submissionIds.length,
              bulkOperationIndex: i + 1,
              metadata: {
                batch_id: batchId,
                applied_by_margin_controls: true,
                is_moody: isMoody
              }
            });
          }

        } catch (err) {
          result.error = err instanceof Error ? err.message : 'Unknown error';
        }

        operationResults.push(result);
        setProgress(prev => ({ ...prev, completed: i + 1 }));
        onProgress?.(i + 1, submissions.length);
      }

      setResults(operationResults);

      const successCount = operationResults.filter(r => r.success).length;
      const failureCount = operationResults.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Margins Applied",
          description: `Successfully applied margins to ${successCount} submissions${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: successCount === operationResults.length ? "default" : "destructive"
        });
      }

      return failureCount === 0;

    } catch (error) {
      console.error('Bulk margin application error:', error);
      toast({
        title: "Error",
        description: `Failed to apply margins: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const performDirectApproval = async (
    submissionId: string,
    submission: any,
    reviewNotes?: string
  ): Promise<boolean> => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated for direct approval');

      // Get current submission data
      const { data: currentSubmission, error: fetchError } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !currentSubmission) {
        throw new Error('Submission not found');
      }

      if (currentSubmission.status !== 'pending') {
        throw new Error(`Submission status is '${currentSubmission.status}', not 'pending'`);
      }

      if (currentSubmission.reviewed_by && currentSubmission.reviewed_at) {
        throw new Error('Submission already reviewed by another administrator');
      }

      // Update the media outlet directly
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('media_outlets')
        .update({
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          status: 'active',
          price: submission.price, // Ensure price is set
          is_active: true
        })
        .eq('id', submissionId)
        .eq('status', 'pending')
        .is('reviewed_by', null)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update submission: ' + updateError.message);
      }

      if (!updatedSubmission) {
        throw new Error('Concurrent modification detected');
      }

      // Activate the listing
      const { error: listingError } = await supabase
        .from('listings')
        .update({ is_active: true })
        .eq('media_outlet_id', submissionId);

      if (listingError) {
        console.warn('Listing activation failed:', listingError);
      }

      // Create notification (don't fail if RLS blocks this)
      try {
        const notificationData = {
          user_id: currentSubmission.publisher_id,
          type: 'submission_status',
          title: `Website Approved: ${currentSubmission.domain}`,
          message: `Great news! Your website ${currentSubmission.domain} has been approved and is now live on the marketplace.`,
          data: {
            submission_id: submissionId,
            domain: currentSubmission.domain,
            action: 'approve',
            marketplace_price: submission.price,
            review_notes: reviewNotes,
            reviewed_at: new Date().toISOString()
          }
        };

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.warn('Notification creation failed (RLS policy?):', notificationError);
          // Don't fail the approval for notification issues
        }
      } catch (notificationError) {
        console.warn('Notification creation exception:', notificationError);
        // Continue with approval even if notification fails
      }

      return true;
    } catch (error) {
      console.error('Direct approval failed:', error);
      return false;
    }
  };

  const approveBulk = useCallback(async (
    submissionIds: string[],
    marketplacePrice: number,
    reviewNotes?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<boolean> => {
    if (submissionIds.length === 0) return false;

    // First, filter to only submissions that have margins applied
    const { data: submissions, error: fetchError } = await supabase
      .from('media_outlets')
      .select('id, price, purchase_price')
      .in('id', submissionIds);

    if (fetchError) {
      toast({
        title: "Error",
        description: `Failed to check submission status: ${fetchError.message}`,
        variant: "destructive"
      });
      return false;
    }

    if (!submissions) {
      toast({
        title: "Error",
        description: "No submissions found",
        variant: "destructive"
      });
      return false;
    }

    // Only approve submissions that have margins applied (price set and different from purchase_price)
    const submissionsWithMargins = submissions.filter(s =>
      s.price && s.price > 0 && s.price !== s.purchase_price
    );

    if (submissionsWithMargins.length === 0) {
      toast({
        title: "No Margins Applied",
        description: "Please apply margins to selected websites before approving them.",
        variant: "destructive"
      });
      return false;
    }

    const validSubmissionIds = submissionsWithMargins.map(s => s.id);

    // Generate batch_id once before the loop for consistent batch identification
    const batchId = validSubmissionIds.length > 1 ? 'bulk-approval-' + Date.now() : null;

    setIsProcessing(true);
    setProgress({ completed: 0, total: validSubmissionIds.length, currentOperation: 'Approving submissions with margins...' });
    const operationResults: BulkOperationResult[] = [];

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if we're in development mode
      const isDevelopment = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.DEV;

      // Process each submission that has margins applied
      for (let i = 0; i < validSubmissionIds.length; i++) {
        const submissionId = validSubmissionIds[i];
        const submission = submissionsWithMargins.find(s => s.id === submissionId);
        const result: BulkOperationResult = {
          success: false,
          submissionId
        };

        if (!submission || !submission.price) {
          result.error = 'Submission missing price data';
          operationResults.push(result);
          setProgress(prev => ({ ...prev, completed: i + 1 }));
          continue;
        }

        try {
          setProgress(prev => ({
            ...prev,
            currentOperation: `Approving ${i + 1}/${validSubmissionIds.length}: ${submissionId.slice(0, 8)}...`
          }));

          let approvalSuccess = false;
          let edgeFunctionSuccess = false;

          if (isDevelopment) {
            // Development mode: Use direct approval
            console.log(`Using direct approval for ${submissionId} (development mode)`);
            approvalSuccess = await performDirectApproval(submissionId, submission, reviewNotes);
          } else {
            // Production mode: Try Edge Function first, then fallback
            edgeFunctionSuccess = false; // Reset for each submission
            try {
              const { error } = await supabase.functions.invoke('admin-approve', {
                body: {
                  submission_id: submissionId,
                  action: 'approve',
                  marketplace_price: submission.price, // Use the price already set in Step 1
                  review_notes: reviewNotes || null
                }
              });

              if (!error) {
                edgeFunctionSuccess = true;
                approvalSuccess = true;

                // Log successful Edge Function approval
                await auditLogger.logMarginOperation({
                  operationId: validSubmissionIds.length === 1 ? submissionId : batchId || submissionId,
                  operationType: validSubmissionIds.length === 1 ? 'single_approval' : 'bulk_approval',
                  submissionId,
                  newPrice: submission.price,
                  reviewNotes,
                  bulkOperationCount: validSubmissionIds.length,
                  bulkOperationIndex: i + 1,
                  metadata: {
                    batch_id: batchId,
                    marketplace_price: submission.price,
                    method: 'edge_function'
                  }
                });
              } else {
                console.warn(`Edge Function failed for ${submissionId}, falling back to direct approval:`, error.message);
              }
            } catch (edgeError) {
              console.warn(`Edge Function call failed for ${submissionId}, falling back to direct approval:`, edgeError);
            }

            // Fallback: Direct approval if Edge Function fails
            if (!edgeFunctionSuccess) {
              console.log(`Falling back to direct approval for ${submissionId}`);
              approvalSuccess = await performDirectApproval(submissionId, submission, reviewNotes);
            }
          }

          if (approvalSuccess) {
            result.success = true;

            // Log successful approval (for development mode or fallback)
            if (isDevelopment || !edgeFunctionSuccess) {
              await auditLogger.logMarginOperation({
                operationId: validSubmissionIds.length === 1 ? submissionId : batchId || submissionId,
                operationType: validSubmissionIds.length === 1 ? 'single_approval' : 'bulk_approval',
                submissionId,
                newPrice: submission.price,
                reviewNotes,
                bulkOperationCount: validSubmissionIds.length,
                bulkOperationIndex: i + 1,
                metadata: {
                  batch_id: batchId,
                  marketplace_price: submission.price,
                  method: isDevelopment ? 'direct_approval_dev' : 'direct_approval_fallback'
                }
              });
            }
          } else {
            result.error = 'Approval failed';
          }

        } catch (err) {
          result.error = err instanceof Error ? err.message : 'Unknown error';
        }

        operationResults.push(result);
        setProgress(prev => ({ ...prev, completed: i + 1 }));
        onProgress?.(i + 1, validSubmissionIds.length);
      }

      setResults(operationResults);

      const successCount = operationResults.filter(r => r.success).length;
      const failureCount = operationResults.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Bulk Approval Complete",
          description: `Successfully approved ${successCount} submissions and published them to the marketplace${failureCount > 0 ? `. ${failureCount} failed` : ''}`,
          variant: successCount === operationResults.length ? "default" : "destructive"
        });
      }

      return failureCount === 0;

    } catch (error) {
      console.error('Bulk approval error:', error);
      toast({
        title: "Error",
        description: `Bulk approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const rejectBulk = useCallback(async (
    submissionIds: string[],
    reviewNotes: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<boolean> => {
    if (submissionIds.length === 0) return false;

    setIsProcessing(true);
    setProgress({ completed: 0, total: submissionIds.length, currentOperation: 'Rejecting submissions...' });
    const operationResults: BulkOperationResult[] = [];

    try {
      // Generate batch_id once before the loop for consistent batch identification
      const batchId = submissionIds.length > 1 ? 'bulk-rejection-' + Date.now() : null;

      // Process each submission
      for (let i = 0; i < submissionIds.length; i++) {
        const submissionId = submissionIds[i];
        const result: BulkOperationResult = {
          success: false,
          submissionId
        };

        try {
          setProgress(prev => ({
            ...prev,
            currentOperation: `Rejecting ${i + 1}/${submissionIds.length}: ${submissionId.slice(0, 8)}...`
          }));

          // Call the admin-approve edge function with reject action
          const { error } = await supabase.functions.invoke('admin-approve', {
            body: {
              submission_id: submissionId,
              action: 'reject',
              review_notes: reviewNotes
            }
          });

          if (error) {
            result.error = error.message;
          } else {
            result.success = true;

            // Log successful rejection
            await auditLogger.logMarginOperation({
              operationId: submissionIds.length === 1 ? submissionId : batchId || submissionId,
              operationType: submissionIds.length === 1 ? 'single_approval' : 'bulk_rejection',
              submissionId,
              reviewNotes,
              bulkOperationCount: submissionIds.length,
              bulkOperationIndex: i + 1,
              metadata: {
                batch_id: batchId,
                rejection_reason: reviewNotes
              }
            });
          }

        } catch (err) {
          result.error = err instanceof Error ? err.message : 'Unknown error';
        }

        operationResults.push(result);
        setProgress(prev => ({ ...prev, completed: i + 1 }));
        onProgress?.(i + 1, submissionIds.length);
      }

      setResults(operationResults);

      const successCount = operationResults.filter(r => r.success).length;
      const failureCount = operationResults.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Bulk Rejection Complete",
          description: `Successfully rejected ${successCount} submissions${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          variant: successCount === operationResults.length ? "default" : "destructive"
        });
      }

      return failureCount === 0;

    } catch (error) {
      console.error('Bulk rejection error:', error);
      toast({
        title: "Error",
        description: `Bulk rejection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const rollbackBulkOperation = useCallback(async (
    operationId: string,
    maxAgeMinutes: number = 30
  ): Promise<{ success: boolean; rolledBackCount: number; errors: string[] }> => {
    const errors: string[] = [];
    let rolledBackCount = 0;

    try {
      setIsProcessing(true);
      setProgress({ completed: 0, total: 1, currentOperation: 'Rolling back operation...' });

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      // Check if operation exists and is within time window
      const { data: auditRecords, error: fetchError } = await supabase
        .from('margin_operation_audit')
        .select('*')
        .eq('operation_id', operationId)
        .eq('operation_status', 'completed')
        .gte('operation_timestamp', new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch audit records: ${fetchError.message}`);
      }

      if (!auditRecords || auditRecords.length === 0) {
        errors.push('Operation not found or too old to rollback');
        return { success: false, rolledBackCount: 0, errors };
      }

      // Group by submission_id and get the most recent change for each
      const submissionsToRollback = new Map<string, any>();
      auditRecords.forEach(record => {
        if (!submissionsToRollback.has(record.submission_id) ||
            new Date(record.operation_timestamp) > new Date(submissionsToRollback.get(record.submission_id).operation_timestamp)) {
          submissionsToRollback.set(record.submission_id, record);
        }
      });

      // Rollback each submission
      for (const [submissionId, record] of submissionsToRollback) {
        try {
          if (record.previous_price !== null) {
            // Restore the previous price
            const { error: rollbackError } = await supabase
              .from('media_outlets')
              .update({
                price: record.previous_price,
                status: 'pending', // Reset to pending status
                reviewed_by: null,
                reviewed_at: null,
                review_notes: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', submissionId);

            if (rollbackError) {
              errors.push(`Failed to rollback ${submissionId}: ${rollbackError.message}`);
            } else {
              rolledBackCount++;

              // Log the rollback
              await auditLogger.logMarginOperation({
                operationId: `rollback-${operationId}`,
                operationType: 'bulk_rollback',
                submissionId,
                previousPrice: record.new_price,
                newPrice: record.previous_price,
                reviewNotes: `Rolled back from operation ${operationId}`,
                metadata: {
                  original_operation_id: operationId,
                  rolled_back_at: new Date().toISOString(),
                  rolled_back_by: userData.user.id
                }
              });
            }
          }
        } catch (err) {
          errors.push(`Error rolling back ${submissionId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Mark audit records as rolled back
      const { error: updateError } = await supabase
        .from('margin_operation_audit')
        .update({
          operation_status: 'rolled_back',
          metadata: {
            rolled_back_at: new Date().toISOString(),
            rolled_back_by: userData.user.id
          }
        })
        .eq('operation_id', operationId);

      if (updateError) {
        errors.push(`Failed to update audit records: ${updateError.message}`);
      }

      setProgress({ completed: 1, total: 1, currentOperation: 'Rollback completed' });

      if (rolledBackCount > 0) {
        toast({
          title: "Rollback Successful",
          description: `Successfully rolled back ${rolledBackCount} submissions. They have been reset to pending status.`,
          variant: "default"
        });
      }

      return {
        success: errors.length === 0,
        rolledBackCount,
        errors
      };

    } catch (error) {
      console.error('Rollback error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      toast({
        title: "Rollback Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        rolledBackCount,
        errors
      };
    } finally {
      setIsProcessing(false);
    }
  }, [toast, auditLogger]);

  return {
    isProcessing,
    progress,
    results,
    applyMarginsToSelection,
    approveBulk,
    rejectBulk,
    rollbackBulkOperation,
    clearResults
  };
}
