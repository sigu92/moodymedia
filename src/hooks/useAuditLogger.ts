import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { MarginType } from '@/utils/marginUtils';

interface AuditLogEntry {
  operationId: string;
  operationType: 'single_approval' | 'bulk_approval' | 'bulk_margin_application' | 'bulk_rejection' | 'bulk_rollback';
  submissionId: string;
  previousPrice?: number;
  newPrice?: number;
  purchasePrice?: number;
  marginType?: MarginType['type'];
  marginValue?: number;
  marginPercentage?: number;
  reviewNotes?: string;
  bulkOperationCount?: number;
  bulkOperationIndex?: number;
  metadata?: Record<string, unknown>;
}

interface UseAuditLoggerReturn {
  logMarginOperation: (entry: AuditLogEntry) => Promise<void>;
  logBulkOperationStart: (operationId: string, operationType: string, totalCount: number) => Promise<void>;
  logBulkOperationEnd: (operationId: string, successCount: number, failureCount: number) => Promise<void>;
}

/**
 * Hook for logging audit trails of margin operations and approvals
 */
export function useAuditLogger(): UseAuditLoggerReturn {

  const logMarginOperation = useCallback(async (entry: AuditLogEntry) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.warn('Cannot log audit entry: User not authenticated');
        return;
      }

      // Generate a proper UUID for operation_id if it's not already one
      let operationId = entry.operationId;

      // Proper UUID v4 validation function
      const isValidUUIDv4 = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      if (typeof operationId === 'string' && !isValidUUIDv4(operationId)) {
        // Generate a UUID v4 for bulk operations
        operationId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const { error } = await supabase
        .from('margin_operation_audit')
        .insert({
          operation_id: operationId,
          operation_type: entry.operationType,
          submission_id: entry.submissionId,
          admin_user_id: userData.user.id,
          previous_price: entry.previousPrice,
          new_price: entry.newPrice,
          purchase_price: entry.purchasePrice,
          margin_type: entry.marginType,
          margin_value: entry.marginValue,
          margin_percentage: entry.marginPercentage,
          review_notes: entry.reviewNotes,
          bulk_operation_count: entry.bulkOperationCount || 1,
          bulk_operation_index: entry.bulkOperationIndex || 1,
          metadata: entry.metadata || {}
        });

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }, []);

  const logBulkOperationStart = useCallback(async (
    operationId: string,
    operationType: string,
    totalCount: number
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Log the start of bulk operation
      await supabase
        .from('margin_operation_audit')
        .insert({
          operation_id: operationId,
          operation_type: operationType,
          submission_id: operationId, // Use operationId as placeholder
          admin_user_id: userData.user.id,
          metadata: {
            operation_start: true,
            total_operations: totalCount,
            timestamp: new Date().toISOString()
          }
        });
    } catch (err) {
      console.error('Bulk operation start logging error:', err);
    }
  }, []);

  const logBulkOperationEnd = useCallback(async (
    operationId: string,
    successCount: number,
    failureCount: number
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Log the end of bulk operation
      await supabase
        .from('margin_operation_audit')
        .insert({
          operation_id: operationId,
          operation_type: 'bulk_completion',
          submission_id: operationId, // Use operationId as placeholder
          admin_user_id: userData.user.id,
          metadata: {
            operation_end: true,
            success_count: successCount,
            failure_count: failureCount,
            timestamp: new Date().toISOString()
          }
        });
    } catch (err) {
      console.error('Bulk operation end logging error:', err);
    }
  }, []);

  return {
    logMarginOperation,
    logBulkOperationStart,
    logBulkOperationEnd
  };
}
