import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface UserGroup {
  userId: string;
  email?: string;
  name?: string;
  pendingCount: number;
  totalSubmissions: number;
  lastSubmissionDate: string;
}

interface UserSummaryCardProps {
  userGroup: UserGroup;
  isSelected: boolean;
  onClick: () => void;
  onSelectAll?: () => void;
}

export function UserSummaryCard({
  userGroup,
  isSelected,
  onClick,
  onSelectAll
}: UserSummaryCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-primary border-primary'
          : 'hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">{userGroup.pendingCount} pending</Badge>
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm truncate">{userGroup.name}</p>
          <p className="text-xs text-muted-foreground">
            {userGroup.totalSubmissions} total submissions
          </p>
          <p className="text-xs text-muted-foreground">
            Last: {new Date(userGroup.lastSubmissionDate).toLocaleDateString()}
          </p>
          {onSelectAll && userGroup.pendingCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAll();
              }}
            >
              Select All ({userGroup.pendingCount})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
