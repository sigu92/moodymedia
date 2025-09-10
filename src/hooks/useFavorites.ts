import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('media_outlet_id')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const favoriteIds = new Set(data?.map(fav => fav.media_outlet_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (mediaOutletId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add favorites",
        variant: "destructive",
      });
      return;
    }

    const isFavorite = favorites.has(mediaOutletId);

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('media_outlet_id', mediaOutletId);

        if (error) throw error;

        const newFavorites = new Set(favorites);
        newFavorites.delete(mediaOutletId);
        setFavorites(newFavorites);

        toast({
          title: "Removed from favorites",
          description: "Media outlet removed from your favorites",
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            media_outlet_id: mediaOutletId
          });

        if (error) throw error;

        const newFavorites = new Set(favorites);
        newFavorites.add(mediaOutletId);
        setFavorites(newFavorites);

        toast({
          title: "Added to favorites",
          description: "Media outlet added to your favorites",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  return {
    favorites,
    loading,
    toggleFavorite,
    refetch: fetchFavorites
  };
};