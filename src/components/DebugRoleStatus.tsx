import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface DebugRoleStatusProps {
  className?: string;
}

interface DebugInfo {
  userId: string;
  rlsRecursionError?: boolean;
  error?: string;
  message?: string;
  userRoles: string[];
  currentRole: string | null;
  hasBuyerRole: boolean;
  hasPublisherRole: boolean;
  hasBothRoles: boolean;
  profile?: {
    id: string;
    role: string;
    created_at: string;
  };
  databaseRoles?: Array<{
    id: string;
    user_id: string;
    role: string;
    assigned_by: string;
    assigned_at: string;
  }>;
  supabaseUser?: {
    id: string;
    email: string;
    created_at: string;
  };
}

export function DebugRoleStatus({ className = "" }: DebugRoleStatusProps) {
  const { user, userRoles, currentRole, hasRole, fetchUserRoles } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugInfo = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch roles directly from database
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select('*')
        .eq('user_id', user.id);

      // Check for RLS recursion error
      if (rolesError && (rolesError.message?.includes('infinite recursion') || rolesError.code === '42P17')) {
        console.warn('⚠️ RLS recursion detected in debug fetch');
        setDebugInfo({
          userId: user.id,
          rlsRecursionError: true,
          error: 'RLS Infinite Recursion Error',
          message: 'Database has RLS policy issues. Please run the fix script.',
          userRoles,
          currentRole,
          hasBuyerRole: hasRole('buyer'),
          hasPublisherRole: hasRole('publisher'),
          hasBothRoles: hasRole('buyer') && hasRole('publisher')
        });
        setLoading(false);
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch media outlets
      const { data: mediaOutlets, error: mediaError } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('publisher_id', user.id);

      setDebugInfo({
        userId: user.id,
        rolesData,
        rolesError,
        profileData,
        profileError,
        mediaOutlets,
        mediaError,
        userRoles,
        currentRole,
        hasBuyerRole: hasRole('buyer'),
        hasPublisherRole: hasRole('publisher'),
        hasBothRoles: hasRole('buyer') && hasRole('publisher')
      });
    } catch (error) {
      console.error('Debug fetch error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const hasDualRoles = hasRole('buyer') && hasRole('publisher');

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Debug Role Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Current State</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">User ID:</span>
                <Badge variant="outline" className="text-xs">
                  {user?.id ? user.id.slice(0, 8) + '...' : 'Not logged in'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Current Role:</span>
                <Badge variant="default">{currentRole || 'None'}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">All Roles:</span>
                <div className="flex gap-1">
                  {userRoles?.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  )) || <Badge variant="outline">None</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Role Checks</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${hasRole('buyer') ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm">Has Buyer Role</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${hasRole('publisher') ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm">Has Publisher Role</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${hasDualRoles ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm">Dual Role User</span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDebugInfo}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch Debug Info
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => user && fetchUserRoles(user.id)}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Roles
          </Button>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Database Debug Info</h4>
            {debugInfo.rlsRecursionError ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h5 className="font-medium text-red-800 mb-2">🚨 RLS Recursion Error Detected</h5>
                  <p className="text-sm text-red-700 mb-3">
                    Your database has Row Level Security (RLS) policy issues that prevent proper role queries.
                  </p>
                  <div className="bg-red-100 p-3 rounded text-sm">
                    <strong>🔧 To Fix:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to your Supabase Dashboard → SQL Editor</li>
                      <li>Copy and paste the contents of <code>fix-rls-recursion.sql</code></li>
                      <li>Run the SQL script</li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Current State:</strong> Using cached roles from AuthContext
                </div>
              </div>
            ) : (
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Troubleshooting */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Steps</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click "Fetch Debug Info" to see database state</li>
            <li>If you see "RLS Recursion Error", run the fix script in Supabase</li>
            <li>Check if you have both 'buyer' and 'publisher' roles</li>
            <li>If missing publisher role, the RoleSwitcher won't appear</li>
            <li>Try "Refresh Roles" if the state seems stale</li>
            <li>Check browser console for any error messages</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default DebugRoleStatus;
