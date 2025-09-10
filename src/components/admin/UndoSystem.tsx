import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RotateCcw } from 'lucide-react';

interface UndoAction {
  id: string;
  websiteId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  domain: string;
}

interface UndoSystemProps {
  onUndo: (websiteId: string, field: string, value: any) => void;
  recentActions: UndoAction[];
  onUndoAction: (actionId: string) => void;
}

export function UndoSystem({ onUndo, recentActions, onUndoAction }: UndoSystemProps) {
  if (recentActions.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <RotateCcw className="h-4 w-4" />
        Recent Changes (10 min undo window)
      </h4>
      <div className="space-y-2">
        {recentActions.slice(0, 5).map(action => (
          <div key={action.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {action.domain}: {action.field} changed
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUndoAction(action.id)}
              className="h-6 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Undo
            </Button>
          </div>
        ))}
        {recentActions.length > 5 && (
          <div className="text-xs text-muted-foreground">
            +{recentActions.length - 5} more actions
          </div>
        )}
      </div>
    </div>
  );
}