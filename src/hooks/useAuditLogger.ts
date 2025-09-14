import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { MarginType } from '@/utils/marginUtils';
import type { TablesInsert, Json } from '@/integrations/supabase/types';

// Shared UUID v4 validator
const isValidUUIDv4 = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper to safely pass through metadata constrained to Supabase Json type
function buildAuditMetadata<T extends Json>(metadata: T): T {
  return metadata;
}

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
  metadata?: Json;
}

type AuditInsertPayload = TablesInsert<'margin_operation_audit'>;

interface AuditStartMetadata {
  operation_start: boolean;
  total_operations: number;
  timestamp: string;
  operation_id: string;
}

interface AuditEndMetadata {
  operation_end: boolean;
  success_count: number;
  failure_count: number;
  timestamp: string;
  operation_id: string;
}

type BulkOperationType = Exclude<AuditLogEntry['operationType'], 'single_approval'>;

interface UseAuditLoggerReturn {
  logMarginOperation: (entry: AuditLogEntry) => Promise<void>;
  logBulkOperationStart: (operationId: string, operationType: BulkOperationType, totalCount: number) => Promise<void>;
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

      // Normalize operationId
      let operationId = entry.operationId;
      if (typeof operationId !== 'string' || !isValidUUIDv4(operationId)) {
        operationId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const { error } = await supabase
        .from('margin_operation_audit')
        .insert((() => {
          const payload: AuditInsertPayload = {
            operation_type: entry.operationType,
            operation_id: operationId,
            submission_id: entry.submissionId,
            admin_user_id: userData.user.id,
            previous_price: entry.previousPrice,
            new_price: entry.newPrice,
            purchase_price: entry.purchasePrice,
            margin_type: entry.marginType,
            margin_value: entry.marginValue,
            margin_percentage: entry.marginPercentage,
            review_notes: entry.reviewNotes,
            bulk_operation_count: entry.bulkOperationCount ?? 1,
            bulk_operation_index: entry.bulkOperationIndex ?? 1,
            metadata: buildAuditMetadata({
              ...(
                entry.metadata !== null &&
                typeof entry.metadata === 'object' &&
                !Array.isArray(entry.metadata)
                  ? (entry.metadata as Record<string, Json>)
                  : {}
              ),
              operation_id: operationId,
            })
          };
          return payload;
        })());

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }, []);

  const logBulkOperationStart = useCallback(async (
    operationIdInput: string,
    operationType: BulkOperationType,
    totalCount: number
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Validate/normalize operation id
      let operationId = operationIdInput;
      if (!isValidUUIDv4(operationId)) {
        operationId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      await supabase
        .from('margin_operation_audit')
        .insert((() => {
          const metadata: Record<string, Json> = {
            operation_start: true,
            total_operations: totalCount,
            timestamp: new Date().toISOString(),
            operation_id: operationId,
          };
          const payload: AuditInsertPayload = {
            operation_type: operationType,
            operation_id: operationId,
            submission_id: operationId, // Use operationId as placeholder
            admin_user_id: userData.user.id,
            metadata: buildAuditMetadata(metadata),
          };
          return payload;
        })());
    } catch (err) {
      console.error('Bulk operation start logging error:', err);
    }
  }, []);

  const logBulkOperationEnd = useCallback(async (
    operationIdInput: string,
    successCount: number,
    failureCount: number
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      let operationId = operationIdInput;
      if (!isValidUUIDv4(operationId)) {
        operationId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      await supabase
        .from('margin_operation_audit')
        .insert((() => {
          const metadata: Record<string, Json> = {
            operation_end: true,
            success_count: successCount,
            failure_count: failureCount,
            timestamp: new Date().toISOString(),
            operation_id: operationId,
          };
          const payload: AuditInsertPayload = {
            operation_type: 'bulk_completion',
            operation_id: operationId,
            submission_id: operationId, // Use operationId as placeholder
            admin_user_id: userData.user.id,
            metadata: buildAuditMetadata(metadata),
          };
          return payload;
        })());
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
