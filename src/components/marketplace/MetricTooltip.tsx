import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface MetricTooltipProps {
  children: ReactNode;
  metric: string;
  description: string;
  className?: string;
}

const metricExplanations = {
  "DR": "Ahrefs Domain Rating (0-100) measures the strength of a website's backlink profile. Higher DR indicates more authoritative linking domains.",
  "DA": "Moz Domain Authority (0-100) predicts how well a website will rank on search engines. Based on linking root domains and total links.",
  "AS": "Semrush Authority Score (0-100) measures domain trust and authority based on backlink quality, quantity, and referring domains.",
  "Spam Score": "Moz Spam Score (0-17) indicates the percentage of sites with similar features that have been penalized. Lower is better.",
  "Organic Traffic": "Estimated monthly organic search traffic from search engines. Higher numbers indicate better SEO performance.",
  "Referring Domains": "Number of unique domains linking to this website. More referring domains typically means higher authority.",
  "Price": "Cost per published article with your link. Prices vary based on domain authority, traffic, and niche relevance.",
  "Lead Time": "Average time from order acceptance to content publication. Some sites may publish faster or slower."
};

export const MetricTooltip = ({ children, metric, description, className = "" }: MetricTooltipProps) => {
  const explanation = metricExplanations[metric as keyof typeof metricExplanations] || description;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            {children}
            <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="glass-card max-w-xs">
          <div className="space-y-2">
            <div className="font-medium text-primary">{metric}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {explanation}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};