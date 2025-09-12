import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Edit, 
  Save, 
  X, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  DollarSign,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './DataTable';
import { UndoSystem } from './UndoSystem';

interface MediaOutlet {
  id: string;
  domain: string;
  price: number;
  currency: string;
  admin_tags: string[];
  category: string;
  source: string;
  is_active: boolean;
  status: 'pending' | 'active' | 'rejected';
  updated_at: string;
  publisher_id: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

interface BulkAction {
  type: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price';
  value: number;
  floor?: number;
  ceiling?: number;
  round_to_99?: boolean;
}

interface BulkActionPreview {
  website_id: string;
  domain: string;
  old_price: number;
  new_price: number;
}

export function BulkWebsiteEditor() {
  const { toast } = useToast();
  const [websites, setWebsites] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Bulk action states
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>({
    type: 'percentage_increase',
    value: 0
  });
  const [bulkPreview, setBulkPreview] = useState<BulkActionPreview[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [recentActions, setRecentActions] = useState<any[]>([]);

  const fetchWebsites = async () => {
    setLoading(true);
    try {
      // Only fetch active listings for bulk operations (buyers can only see active listings)
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('status', 'active')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error fetching websites:', error);
      toast({
        title: "Error",
        description: "Failed to fetch websites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    
    // Clear old actions every minute
    const interval = setInterval(() => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      setRecentActions(prev => prev.filter(action => action.timestamp > tenMinutesAgo));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const startEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    let processedValue: any = editValue;

    if (field === 'price') {
      processedValue = parseFloat(editValue);
      if (isNaN(processedValue) || processedValue < 0) {
        toast({
          title: "Invalid price",
          description: "Price must be a positive number",
          variant: "destructive"
        });
        return;
      }
    } else if (field === 'admin_tags') {
      processedValue = editValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    try {
      const oldValue = websites.find(w => w.id === id)?.[field as keyof MediaOutlet];
      
      const { error } = await supabase
        .from('media_outlets')
        .update({ [field]: processedValue })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const website = websites.find(w => w.id === id);
      setWebsites(prev => prev.map(website => 
        website.id === id 
          ? { ...website, [field]: processedValue, updated_at: new Date().toISOString() }
          : website
      ));

      // Add to undo system
      if (website) {
        const newAction = {
          id: crypto.randomUUID(),
          websiteId: id,
          field,
          oldValue,
          newValue: processedValue,
          domain: website.domain,
          timestamp: new Date()
        };
        setRecentActions(prev => [newAction, ...prev.slice(0, 9)]);
      }

      // Log the change
      await logAuditEntry(id, field, oldValue, processedValue);

      toast({
        title: "Updated",
        description: `${field} updated successfully`,
      });

      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating website:', error);
      toast({
        title: "Error",
        description: "Failed to update website",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleUndoAction = async (actionId: string) => {
    const action = recentActions.find(a => a.id === actionId);
    if (!action) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({ [action.field]: action.oldValue })
        .eq('id', action.websiteId);

      if (error) throw error;

      handleUndo(action.websiteId, action.field, action.oldValue);
      
      // Remove the action from the list
      setRecentActions(prev => prev.filter(a => a.id !== actionId));

      toast({
        title: "Change undone",
        description: `Reverted ${action.field} for ${action.domain}`,
      });

    } catch (error) {
      console.error('Undo error:', error);
      toast({
        title: "Undo failed",
        description: "Could not revert the change",
        variant: "destructive"
      });
    }
  };

  const handleUndo = (websiteId: string, field: string, value: any) => {
    setWebsites(prev => prev.map(website => 
      website.id === websiteId 
        ? { ...website, [field]: value, updated_at: new Date().toISOString() }
        : website
    ));
  };

  const logAuditEntry = async (websiteId: string, field: string, oldValue: any, newValue: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('admin-audit-log', {
        body: {
          action: 'website_field_update',
          target_table: 'media_outlets',
          target_id: websiteId,
          before_data: { [field]: oldValue },
          after_data: { [field]: newValue },
          metadata: { field_updated: field }
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  };

  const calculateBulkPreview = () => {
    const selectedWebsites = websites.filter(w => selectedRows.includes(w.id));
    const preview: BulkActionPreview[] = [];

    for (const website of selectedWebsites) {
      let newPrice = website.price;

      switch (bulkAction.type) {
        case 'percentage_increase':
          newPrice = website.price * (1 + bulkAction.value / 100);
          break;
        case 'percentage_decrease':
          newPrice = website.price * (1 - bulkAction.value / 100);
          break;
        case 'fixed_increase':
          newPrice = website.price + bulkAction.value;
          break;
        case 'fixed_decrease':
          newPrice = website.price - bulkAction.value;
          break;
        case 'set_price':
          newPrice = bulkAction.value;
          break;
      }

      // Apply constraints
      if (bulkAction.floor && newPrice < bulkAction.floor) {
        newPrice = bulkAction.floor;
      }
      if (bulkAction.ceiling && newPrice > bulkAction.ceiling) {
        newPrice = bulkAction.ceiling;
      }
      if (bulkAction.round_to_99) {
        newPrice = Math.floor(newPrice) + 0.99;
      }

      // Ensure non-negative
      if (newPrice < 0) newPrice = 0;

      // Round to 2 decimals
      newPrice = Math.round(newPrice * 100) / 100;

      preview.push({
        website_id: website.id,
        domain: website.domain,
        old_price: website.price,
        new_price: newPrice
      });
    }

    setBulkPreview(preview);
  };

  const executeBulkAction = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const selectedIds = Array.from(selectedRows);
      
      const response = await supabase.functions.invoke('admin-websites-bulk-update', {
        body: {
          action: bulkAction.type,
          website_ids: selectedIds,
          percentage: bulkAction.type.includes('percentage') ? bulkAction.value : undefined,
          fixed_amount: bulkAction.type.includes('fixed') ? bulkAction.value : undefined,
          new_price: bulkAction.type === 'set_price' ? bulkAction.value : undefined,
          floor: bulkAction.floor,
          ceiling: bulkAction.ceiling,
          round_to_99: bulkAction.round_to_99
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Bulk update completed",
        description: `Updated ${response.data.updated_count} websites`,
      });

      // Refresh data
      await fetchWebsites();
      
      // Reset states
      setSelectedRows([]);
      setShowBulkDialog(false);
      setShowConfirmDialog(false);
      setBulkPreview([]);

    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: "Failed to execute bulk update",
        variant: "destructive"
      });
    }
  };

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = searchTerm === '' ||
      website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || website.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(websites.map(w => w.category))].filter(Boolean);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const columns = [
    {
      key: 'domain' as keyof MediaOutlet,
      header: 'Domain',
      sortable: true,
      render: (value: string, row: MediaOutlet) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'admin_tags' as keyof MediaOutlet,
      header: 'Tags',
      render: (value: string[], row: MediaOutlet) => {
        if (editingCell?.id === row.id && editingCell?.field === 'admin_tags') {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="h-8"
                placeholder="Comma separated tags"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={saveEdit}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <div 
            className="flex flex-wrap gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => startEdit(row.id, 'admin_tags', value)}
          >
            {(value || []).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(!value || value.length === 0) && (
              <span className="text-muted-foreground text-sm">Click to add tags</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'price' as keyof MediaOutlet,
      header: 'Price',
      sortable: true,
      render: (value: number, row: MediaOutlet) => {
        if (editingCell?.id === row.id && editingCell?.field === 'price') {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="h-8 w-24"
                step="0.01"
                min="0"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={saveEdit}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <div 
            className="cursor-pointer hover:bg-muted/50 p-1 rounded font-medium"
            onClick={() => startEdit(row.id, 'price', value)}
          >
            {formatCurrency(value, row.currency)}
          </div>
        );
      }
    },
    {
      key: 'category' as keyof MediaOutlet,
      header: 'Category',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    {
      key: 'source' as keyof MediaOutlet,
      header: 'Source',
      render: (value: string) => (
        <Badge variant={value === 'db' ? 'default' : 'secondary'}>
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'status' as keyof MediaOutlet,
      header: 'Approval Status',
      render: (value: string, row: MediaOutlet) => {
        const getStatusBadge = (status: string, isActive: boolean) => {
          if (!isActive) {
            return <Badge variant="secondary">Inactive</Badge>;
          }

          switch (status) {
            case 'active':
              return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active Listing</Badge>;
            case 'pending':
              return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending Review</Badge>;
            case 'rejected':
              return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
            default:
              return <Badge variant="secondary">Unknown</Badge>;
          }
        };

        return getStatusBadge(value, row.is_active);
      }
    },
    {
      key: 'updated_at' as keyof MediaOutlet,
      header: 'Updated',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Active Listings Editor</h2>
          <p className="text-muted-foreground">
            Manage prices and settings for active marketplace listings (approved websites only)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <Badge variant="secondary">
                {selectedRows.length} selected
              </Badge>
              <Button 
                onClick={() => setShowBulkDialog(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Bulk Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search websites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <UndoSystem 
            recentActions={recentActions}
            onUndo={handleUndo}
            onUndoAction={handleUndoAction} 
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredWebsites}
        columns={columns}
        loading={loading}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
            <DialogDescription>
              Apply price changes to {selectedRows.length} selected websites
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Action Type</label>
                <Select
                  value={bulkAction.type}
                  onValueChange={(value: any) => setBulkAction(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage_increase">Increase by %</SelectItem>
                    <SelectItem value="percentage_decrease">Decrease by %</SelectItem>
                    <SelectItem value="fixed_increase">Add fixed amount</SelectItem>
                    <SelectItem value="fixed_decrease">Subtract fixed amount</SelectItem>
                    <SelectItem value="set_price">Set exact price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Value</label>
                <Input
                  type="number"
                  value={bulkAction.value}
                  onChange={(e) => setBulkAction(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Floor (min price)</label>
                <Input
                  type="number"
                  value={bulkAction.floor || ''}
                  onChange={(e) => setBulkAction(prev => ({ ...prev, floor: parseFloat(e.target.value) || undefined }))}
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ceiling (max price)</label>
                <Input
                  type="number"
                  value={bulkAction.ceiling || ''}
                  onChange={(e) => setBulkAction(prev => ({ ...prev, ceiling: parseFloat(e.target.value) || undefined }))}
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={bulkAction.round_to_99 || false}
                    onChange={(e) => setBulkAction(prev => ({ ...prev, round_to_99: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Round to .99</span>
                </label>
              </div>
            </div>

            <Button onClick={calculateBulkPreview} className="w-full">
              Preview Changes
            </Button>

            {bulkPreview.length > 0 && (
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-2">Preview ({bulkPreview.length} websites)</h4>
                <div className="space-y-1 text-sm">
                  {bulkPreview.slice(0, 10).map(preview => (
                    <div key={preview.website_id} className="flex justify-between">
                      <span className="truncate">{preview.domain}</span>
                      <span>
                        {formatCurrency(preview.old_price)} → {formatCurrency(preview.new_price)}
                      </span>
                    </div>
                  ))}
                  {bulkPreview.length > 10 && (
                    <div className="text-muted-foreground">
                      ...and {bulkPreview.length - 10} more websites
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={bulkPreview.length === 0}
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply these price changes to {bulkPreview.length} websites? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}