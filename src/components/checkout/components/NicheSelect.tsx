import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '@/components/ui/select';

export interface OutletNicheRuleView {
  nicheSlug: string;
  nicheLabel: string;
  accepted: boolean;
  multiplier: number;
}

interface NicheSelectProps {
  value?: string;
  onChange: (slug: string) => void;
  rules: OutletNicheRuleView[];
  placeholder?: string;
}

export const NicheSelect: React.FC<NicheSelectProps> = ({ value, onChange, rules, placeholder = 'Select target niche' }) => {
  const acceptedWithMultiplier = rules.filter(r => r.accepted && (r.multiplier ?? 1) !== 1);
  const acceptedNoMultiplier = rules.filter(r => r.accepted && (r.multiplier ?? 1) === 1);
  const blocked = rules.filter(r => !r.accepted);

  const renderItem = (slug: string, label: string, badgeText: string, disabled?: boolean) => (
    <SelectItem key={slug} value={slug} disabled={disabled}>
      <div className="flex items-center justify-between w-full">
        <span>{label}</span>
        <Badge variant={disabled ? 'secondary' : 'outline'} className="ml-2">
          {badgeText}
        </Badge>
      </div>
    </SelectItem>
  );

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {acceptedWithMultiplier.length > 0 && (
          <SelectGroup>
            <SelectLabel>Accepted with multiplier</SelectLabel>
            {acceptedWithMultiplier.map(r => renderItem(r.nicheSlug, r.nicheLabel, `x${r.multiplier}`))}
          </SelectGroup>
        )}
        {acceptedWithMultiplier.length > 0 && (acceptedNoMultiplier.length > 0 || blocked.length > 0) && <SelectSeparator />}
        {acceptedNoMultiplier.length > 0 && (
          <SelectGroup>
            <SelectLabel>Accepted</SelectLabel>
            {acceptedNoMultiplier.map(r => renderItem(r.nicheSlug, r.nicheLabel, 'Accepted'))}
          </SelectGroup>
        )}
        {acceptedNoMultiplier.length > 0 && blocked.length > 0 && <SelectSeparator />}
        {blocked.length > 0 && (
          <SelectGroup>
            <SelectLabel>Not accepted</SelectLabel>
            {blocked.map(r => renderItem(r.nicheSlug, r.nicheLabel, 'Not accepted', true))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};


