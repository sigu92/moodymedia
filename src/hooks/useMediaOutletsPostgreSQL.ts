import { useState, useEffect } from 'react';
import { mediaOutlets } from '@/integrations/postgresql/helpers';
import { MediaWithMetrics } from '@/types';

export const useMediaOutlets = () => {
  const [media, setMedia] = useState<MediaWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMediaOutlets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Hämta media outlets med metrics
      const mediaData = await mediaOutlets.getAllWithMetrics();
      
      // Hämta niche rules för alla media outlets
      const nicheRulesData = await mediaOutlets.getWithNicheRules();

      // Gruppera niche rules per media outlet
      const nicheRulesMap = new Map<string, any[]>();
      nicheRulesData.forEach(rule => {
        if (!nicheRulesMap.has(rule.id)) {
          nicheRulesMap.set(rule.id, []);
        }
        nicheRulesMap.get(rule.id)!.push(rule);
      });

      // Transformera data till våra typer
      const transformedMedia: MediaWithMetrics[] = mediaData.map(outlet => {
        const outletNicheRules = nicheRulesMap.get(outlet.id) || [];
        
        return {
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
          isFavorite: false, // Kommer att uppdateras från favorites
          nicheRules: outletNicheRules.map(rule => ({
            id: rule.rule_id,
            mediaOutletId: outlet.id,
            nicheId: rule.niche_id,
            accepted: rule.accepted,
            multiplier: rule.multiplier,
            nicheSlug: rule.niche_slug,
            nicheLabel: rule.niche_label
          })),
          metrics: {
            id: outlet.id, // Använd outlet id som metrics id för nu
            mediaOutletId: outlet.id,
            ahrefsDR: outlet.ahrefs_dr || 0,
            mozDA: outlet.moz_da || 0,
            semrushAS: outlet.semrush_as || 0,
            spamScore: outlet.spam_score || 0,
            organicTraffic: outlet.organic_traffic || 0,
            referringDomains: outlet.referring_domains || 0,
            updatedAt: outlet.metrics_updated_at || outlet.updated_at
          }
        };
      });

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
