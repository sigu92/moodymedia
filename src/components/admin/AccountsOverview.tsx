import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DataTable, Column } from './DataTable';
import { Users, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

interface Account {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  total_orders: number;
  total_spend: number;
  pending_payments: number;
  referral_earnings: number;
}

interface AccountsResponse {
  accounts: Account[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    total_items: number;
  };
}

export function AccountsOverview() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total_pages: 1,
    total_items: 0,
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    min_orders: '',
    min_spend: '',
    has_pending: 'all',
  });
  const { toast } = useToast();

  const columns: Column<Account>[] = [
    {
      key: 'user_id',
      header: 'User ID',
      render: (value) => (
        <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (value) => (
        <Badge variant={value === 'admin' ? 'default' : value === 'publisher' ? 'secondary' : 'outline'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'total_orders',
      header: 'Orders',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          {value}
        </div>
      ),
    },
    {
      key: 'total_spend',
      header: 'Total Spend',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          €{Number(value).toFixed(2)}
        </div>
      ),
    },
    {
      key: 'pending_payments',
      header: 'Pending',
      sortable: true,
      render: (value) => (
        <span className={Number(value) > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
          €{Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'referral_earnings',
      header: 'Referral Earnings',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          €{Number(value).toFixed(2)}
        </div>
      ),
    },
  ];

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortField,
        sort_order: sortDirection,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== 'all')),
      });

      const { data, error } = await supabase.functions.invoke('admin-accounts', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      const response: AccountsResponse = data;
      setAccounts(response.accounts);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error loading accounts",
        description: "Failed to fetch account data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortField, sortDirection, filters, toast]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== 'all')),
        export: 'csv',
      });

      const { data, error } = await supabase.functions.invoke('admin-accounts', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      // Create and download CSV
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'accounts_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Accounts data has been exported",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export accounts data",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  // Fetch data when inputs change using memoized callback
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Calculate summary stats
  const totalUsers = pagination.total_items;
  const totalRevenue = accounts.reduce((sum, account) => sum + Number(account.total_spend), 0);
  const totalPending = accounts.reduce((sum, account) => sum + Number(account.pending_payments), 0);
  const activeUsers = accounts.filter(account => account.total_orders > 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{activeUsers}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">€{totalPending.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter accounts by order count, spending, and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="min-orders">Minimum Orders</Label>
              <Input
                id="min-orders"
                type="number"
                placeholder="0"
                value={filters.min_orders}
                onChange={(e) => setFilters(prev => ({ ...prev, min_orders: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="min-spend">Minimum Spend (€)</Label>
              <Input
                id="min-spend"
                type="number"
                placeholder="0"
                value={filters.min_spend}
                onChange={(e) => setFilters(prev => ({ ...prev, min_spend: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="has-pending">Has Pending Payments</Label>
              <Select value={filters.has_pending} onValueChange={(value) => setFilters(prev => ({ ...prev, has_pending: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="true">With pending payments</SelectItem>
                  <SelectItem value="false">Without pending payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>Detailed view of all user accounts with order history and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={accounts}
            columns={columns}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onExport={handleExport}
            emptyMessage="No accounts found"
          />
        </CardContent>
      </Card>
    </div>
  );
}