import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Save, Filter, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FilterQuery as SearchFilters } from "@/components/marketplace/AdvancedFiltersModal";

interface SavedFilter {
  id: string;
  name: string;
  query: SearchFilters;
  created_at: string;
}

interface SavedFilterBarProps {
  currentFilters: SearchFilters;
  onLoadFilter: (filters: SearchFilters) => void;
  onResetFilters: () => void;
}

export const SavedFilterBar = ({ currentFilters, onLoadFilter, onResetFilters }: SavedFilterBarProps) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadSavedFilters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedFilters(data || []);
    } catch (error) {
      console.error('Error loading saved filters:', error);
      toast.error('Failed to load saved filters');
    }
  };

  const saveCurrentFilter = async () => {
    if (!user || !filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name: filterName.trim(),
          query: currentFilters
        });

      if (error) throw error;

      toast.success('Filter saved successfully');
      setFilterName("");
      setSaveDialogOpen(false);
      loadSavedFilters();
    } catch (error) {
      console.error('Error saving filter:', error);
      toast.error('Failed to save filter');
    } finally {
      setLoading(false);
    }
  };

  const deleteFilter = async (filterId: string) => {
    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;

      toast.success('Filter deleted');
      loadSavedFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast.error('Failed to delete filter');
    }
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, [user]);

  return (
    <Card className="glass-card-light mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Quick Filters:</span>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="glass-button"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}

          {/* Save Current Filter */}
          {hasActiveFilters && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="glass-button">
                  <Save className="h-3 w-3 mr-1" />
                  Save Current
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>Save Filter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="filter-name">Filter Name</Label>
                    <Input
                      id="filter-name"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="e.g., High DR Swedish Sites"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveCurrentFilter} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Filter'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Saved Filters */}
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((filter) => (
              <div key={filter.id} className="group relative">
                <Badge
                  variant="secondary"
                  className="cursor-pointer glass-button pr-6 hover:bg-primary/20"
                  onClick={() => onLoadFilter(filter.query)}
                >
                  {filter.name}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -right-1 -top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFilter(filter.id);
                  }}
                >
                  <Trash2 className="h-2 w-2" />
                </Button>
              </div>
            ))}
          </div>

          {savedFilters.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Save frequently used filters for quick access
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};