import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MediaWithMetrics } from '@/types';

export const useMediaOutlets = () => {
  const [media, setMedia] = useState<MediaWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMediaOutlets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch media outlets with their metrics and niche rules
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_outlets')
        .select(`
          *,
          metrics (
            ahrefs_dr,
            moz_da,
            semrush_as,
            spam_score,
            organic_traffic,
            referring_domains,
            updated_at
          ),
          outlet_niche_rules (
            id,
            niche_id,
            accepted,
            multiplier,
            niches (
              slug,
              label
            )
          )
        `)
        .eq('is_active', true)
        .eq('status', 'active');

      if (mediaError) {
        throw mediaError;
      }

      // Transform data to match our types
      const transformedMedia: MediaWithMetrics[] = (mediaData || []).map(outlet => ({
        id: outlet.id,
        domain: outlet.domain,
        language: outlet.language,
        country: outlet.country,
        niches: outlet.niches || [],
        category: outlet.category,
        price: Number(outlet.price),
        currency: outlet.currency,
        guidelines: outlet.guidelines || '',
        leadTimeDays: outlet.lead_time_days,
        isActive: outlet.is_active,
        publisherId: outlet.publisher_id,
        createdAt: outlet.created_at,
        updatedAt: outlet.updated_at,
        acceptsNoLicense: outlet.accepts_no_license,
        acceptsNoLicenseStatus: outlet.accepts_no_license_status as 'yes' | 'no' | 'depends' | undefined,
        sponsorTagStatus: outlet.sponsor_tag_status as 'yes' | 'no' | undefined,
        sponsorTagType: outlet.sponsor_tag_type as 'image' | 'text' | undefined,
        isFavorite: false, // Will be updated from favorites
        nicheRules: (outlet.outlet_niche_rules || []).map((rule: any) => ({
          id: rule.id,
          mediaOutletId: outlet.id,
          nicheId: rule.niche_id,
          accepted: rule.accepted,
          multiplier: rule.multiplier,
          nicheSlug: rule.niches?.slug,
          nicheLabel: rule.niches?.label
        })),
        metrics: {
          id: outlet.id, // Use outlet id as metrics id for now
          mediaOutletId: outlet.id,
          ahrefsDR: outlet.metrics?.[0]?.ahrefs_dr || 0,
          mozDA: outlet.metrics?.[0]?.moz_da || 0,
          semrushAS: outlet.metrics?.[0]?.semrush_as || 0,
          spamScore: outlet.metrics?.[0]?.spam_score || 0,
          organicTraffic: outlet.metrics?.[0]?.organic_traffic || 0,
          referringDomains: outlet.metrics?.[0]?.referring_domains || 0,
          updatedAt: outlet.metrics?.[0]?.updated_at || outlet.updated_at
        }
      }));

      setMedia(transformedMedia);
    } catch (err) {
      console.error('Error fetching media outlets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch media outlets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaOutlets();
  }, []);

  const refetch = () => {
    fetchMediaOutlets();
  };

  return {
    media,
    loading,
    error,
    refetch
  };
};