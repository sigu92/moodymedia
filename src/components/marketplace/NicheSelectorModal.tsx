import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NICHES, formatMultiplier } from "./niches";
import { Separator } from "@/components/ui/separator";

interface NicheSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nicheId: string | null, multiplier: number) => void;
  basePrice: number;
  currency: string;
  domain: string;
  nicheRules?: { nicheSlug: string; accepted: boolean; multiplier: number }[];
}

export function NicheSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  basePrice, 
  currency,
  domain,
  nicheRules = []
}: NicheSelectorModalProps) {
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

  const handleSelect = (nicheSlug: string | null) => {
    setSelectedNiche(nicheSlug);
    
    if (nicheSlug === null) {
      onSelect(null, 1.0);
      return;
    }

    // Find the niche rule for this specific outlet
    const nicheRule = nicheRules.find(rule => rule.nicheSlug === nicheSlug);
    const niche = NICHES.find(n => n.slug === nicheSlug);
    const multiplier = nicheRule?.multiplier || niche?.defaultMultiplier || 1.0;
    
    onSelect(nicheSlug, multiplier);
  };

  const getAvailableNiches = () => {
    // Get accepted niches based on the outlet's niche rules
    const acceptedNicheSlugs = nicheRules
      .filter(rule => rule.accepted)
      .map(rule => rule.nicheSlug);
    
    return NICHES.filter(niche => acceptedNicheSlugs.includes(niche.slug));
  };

  const availableNiches = getAvailableNiches();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass-modal">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Niche Pricing</DialogTitle>
          <DialogDescription>
            Choose a niche for your publication on <span className="font-semibold">{domain}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* General Option */}
          <Card 
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${
              selectedNiche === null ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleSelect(null)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">General Publication</CardTitle>
                  <CardDescription>Standard pricing - No niche specialization</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {currency} {basePrice}
                  </div>
                  <Badge variant="outline">x1.0</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Separator />

          {/* Specialized Niches */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Specialized Niches</h3>
            {availableNiches.length === 0 ? (
              <Card className="bg-muted/20">
                <CardContent className="py-6 text-center text-muted-foreground">
                  This media outlet doesn't accept specialized niche content.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableNiches.map((niche) => {
                  const nicheRule = nicheRules.find(rule => rule.nicheSlug === niche.slug);
                  const multiplier = nicheRule?.multiplier || niche.defaultMultiplier;
                  const finalPrice = Math.round(basePrice * multiplier);
                  const Icon = niche.icon;

                  return (
                    <Card 
                      key={niche.slug}
                      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${
                        selectedNiche === niche.slug ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSelect(niche.slug)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{niche.label}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {formatMultiplier(multiplier)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-orange-600">
                              {currency} {finalPrice}
                            </div>
                            {multiplier > 1 && (
                              <div className="text-sm text-muted-foreground line-through">
                                {currency} {basePrice}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="glass-button">
              Cancel
            </Button>
            <Button 
              onClick={() => onClose()} 
              disabled={selectedNiche === undefined}
              className="glass-button-primary"
            >
              Add to Cart
              {selectedNiche && (
                <span className="ml-2">
                  ({currency} {Math.round(basePrice * (availableNiches.find(n => n.slug === selectedNiche)?.defaultMultiplier || 1.0))})
                </span>
              )}
              {selectedNiche === null && (
                <span className="ml-2">({currency} {basePrice})</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}