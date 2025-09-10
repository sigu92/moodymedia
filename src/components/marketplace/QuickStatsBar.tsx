import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaWithMetrics } from "@/types";
import { 
  TrendingUp, 
  Globe, 
  DollarSign, 
  Target,
  Star,
  Clock
} from "lucide-react";

interface QuickStatsBarProps {
  media: MediaWithMetrics[];
  allMedia: MediaWithMetrics[];
  favoriteCount: number;
}

export const QuickStatsBar = ({ media, allMedia, favoriteCount }: QuickStatsBarProps) => {
  const avgPrice = media.length > 0 
    ? Math.round(media.reduce((sum, m) => sum + m.price, 0) / media.length)
    : 0;
  
  const avgDR = media.length > 0
    ? Math.round(media.reduce((sum, m) => sum + m.metrics.ahrefsDR, 0) / media.length)
    : 0;

  const countries = new Set(media.map(m => m.country)).size;
  const languages = new Set(media.map(m => m.language)).size;
  
  const highQualitySites = media.filter(m => 
    m.metrics.ahrefsDR >= 30 && m.metrics.organicTraffic >= 2000
  ).length;

  return (
    <Card className="glass-card mb-4">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Showing:</span>
            <Badge variant="secondary">{media.length} of {allMedia.length} outlets</Badge>
          </div>

          {avgPrice > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Avg price:</span>
              <Badge variant="outline">€{avgPrice}</Badge>
            </div>
          )}

          {avgDR > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Avg DR:</span>
              <Badge variant="outline">{avgDR}</Badge>
            </div>
          )}

          {countries > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <span className="text-muted-foreground">Countries:</span>
              <Badge variant="outline">{countries}</Badge>
            </div>
          )}

          {highQualitySites > 0 && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <span className="text-muted-foreground">High quality:</span>
              <Badge variant="outline">{highQualitySites}</Badge>
            </div>
          )}

          {favoriteCount > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">Favorites:</span>
              <Badge variant="outline">{favoriteCount}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};