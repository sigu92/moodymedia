import { MediaOutlet, Metrics, MediaWithMetrics } from '@/types';

const mediaOutlets: MediaOutlet[] = [
  {
    id: '1',
    domain: 'badlands.nu',
    language: 'Swedish',
    country: 'SE',
    niches: ['Gaming', 'Entertainment'],
    category: 'Gaming',
    price: 155,
    currency: 'EUR',
    guidelines: 'No gambling content. Max 1 outbound link per 500 words. Swedish language required.',
    leadTimeDays: 3,
    isActive: true,
    publisherId: 'pub1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    domain: 'dittandralag.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Sports', 'Football'],
    category: 'Sports',
    price: 200,
    currency: 'EUR',
    guidelines: 'Sports-related content only. No competitor mentions. Min 800 words.',
    leadTimeDays: 5,
    isActive: true,
    publisherId: 'pub2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    domain: 'roda-dagar.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Lifestyle', 'Food', 'Travel'],
    category: 'Lifestyle',
    price: 245,
    currency: 'EUR',
    guidelines: 'High-quality lifestyle content. Professional images required. Min 1000 words.',
    leadTimeDays: 7,
    isActive: true,
    publisherId: 'pub3',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    domain: 'mediahyllan.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Technology', 'Media', 'Digital'],
    category: 'Technology',
    price: 175,
    currency: 'EUR',
    guidelines: 'Tech and media content focus. No adult content. Include relevant statistics.',
    leadTimeDays: 4,
    isActive: true,
    publisherId: 'pub4',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    domain: 'bengansbonus.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Business', 'Finance', 'Investment'],
    category: 'Business',
    price: 245,
    currency: 'EUR',
    guidelines: 'Financial and business content. Must comply with Swedish financial regulations.',
    leadTimeDays: 5,
    isActive: true,
    publisherId: 'pub5',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    domain: 'followusaik.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Sports', 'Football', 'Soccer'],
    category: 'Sports',
    price: 245,
    currency: 'EUR',
    guidelines: 'Football-focused content. Team-neutral stance required. Include match statistics.',
    leadTimeDays: 3,
    isActive: true,
    publisherId: 'pub6',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '7',
    domain: 'svenskhandelstidning.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Business', 'Trade', 'Commerce'],
    category: 'Business',
    price: 320,
    currency: 'EUR',
    guidelines: 'B2B content focus. Industry expertise required. Min 1200 words.',
    leadTimeDays: 7,
    isActive: true,
    publisherId: 'pub7',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '8',
    domain: 'teknikfokus.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Technology', 'Innovation', 'Startups'],
    category: 'Technology',
    price: 280,
    currency: 'EUR',
    guidelines: 'Cutting-edge tech content. Include technical details and sources.',
    leadTimeDays: 6,
    isActive: true,
    publisherId: 'pub8',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '9',
    domain: 'naturguiden.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Nature', 'Environment', 'Outdoor'],
    category: 'Lifestyle',
    price: 190,
    currency: 'EUR',
    guidelines: 'Nature and outdoor content. Environmental focus preferred. Include location details.',
    leadTimeDays: 4,
    isActive: true,
    publisherId: 'pub9',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '10',
    domain: 'halsokost.se',
    language: 'Swedish',
    country: 'SE',
    niches: ['Health', 'Nutrition', 'Wellness'],
    category: 'Health',
    price: 225,
    currency: 'EUR',
    guidelines: 'Evidence-based health content. Medical claims must be sourced. No supplements promotion.',
    leadTimeDays: 5,
    isActive: true,
    publisherId: 'pub10',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const metrics: Metrics[] = [
  { id: '1', mediaOutletId: '1', ahrefsDR: 11, mozDA: 15, semrushAS: 16, spamScore: 56, organicTraffic: 0, referringDomains: 32, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '2', mediaOutletId: '2', ahrefsDR: 32, mozDA: 13, semrushAS: 12, spamScore: 5, organicTraffic: 1250, referringDomains: 89, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '3', mediaOutletId: '3', ahrefsDR: 48, mozDA: 5, semrushAS: 8, spamScore: 2, organicTraffic: 3400, referringDomains: 156, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '4', mediaOutletId: '4', ahrefsDR: 15, mozDA: 17, semrushAS: 10, spamScore: 12, organicTraffic: 890, referringDomains: 67, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '5', mediaOutletId: '5', ahrefsDR: 38, mozDA: 6, semrushAS: 11, spamScore: 8, organicTraffic: 2100, referringDomains: 134, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '6', mediaOutletId: '6', ahrefsDR: 15, mozDA: 7, semrushAS: 11, spamScore: 15, organicTraffic: 670, referringDomains: 45, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '7', mediaOutletId: '7', ahrefsDR: 55, mozDA: 42, semrushAS: 35, spamScore: 1, organicTraffic: 8900, referringDomains: 298, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '8', mediaOutletId: '8', ahrefsDR: 43, mozDA: 28, semrushAS: 22, spamScore: 3, organicTraffic: 5600, referringDomains: 187, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '9', mediaOutletId: '9', ahrefsDR: 25, mozDA: 19, semrushAS: 18, spamScore: 7, organicTraffic: 1800, referringDomains: 98, updatedAt: '2024-01-01T00:00:00Z' },
  { id: '10', mediaOutletId: '10', ahrefsDR: 33, mozDA: 22, semrushAS: 20, spamScore: 4, organicTraffic: 2750, referringDomains: 145, updatedAt: '2024-01-01T00:00:00Z' }
];

export const getMediaWithMetrics = (): MediaWithMetrics[] => {
  return mediaOutlets.map(outlet => {
    const metric = metrics.find(m => m.mediaOutletId === outlet.id);
    return {
      ...outlet,
      metrics: metric!
    };
  });
};

export const getFilterOptions = () => {
  const data = getMediaWithMetrics();
  
  return {
    countries: [...new Set(data.map(m => m.country))],
    languages: [...new Set(data.map(m => m.language))],
    categories: [...new Set(data.map(m => m.category))],
    niches: [...new Set(data.flatMap(m => m.niches))],
    priceRange: {
      min: Math.min(...data.map(m => m.price)),
      max: Math.max(...data.map(m => m.price))
    },
    drRange: {
      min: Math.min(...data.map(m => m.metrics.ahrefsDR)),
      max: Math.max(...data.map(m => m.metrics.ahrefsDR))
    },
    organicTrafficRange: {
      min: Math.min(...data.map(m => m.metrics.organicTraffic)),
      max: Math.max(...data.map(m => m.metrics.organicTraffic))
    },
    referringDomainsRange: {
      min: Math.min(...data.map(m => m.metrics.referringDomains)),
      max: Math.max(...data.map(m => m.metrics.referringDomains))
    },
    spamScoreRange: {
      min: Math.min(...data.map(m => m.metrics.spamScore)),
      max: Math.max(...data.map(m => m.metrics.spamScore))
    },
    showLowMetricSites: false
  };
};