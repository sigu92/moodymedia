import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingIconsHero, type FloatingIconsHeroProps } from "@/components/ui/floating-icons-hero-section";
import {
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  Users,
  Star,
  CheckCircle,
  Globe,
  TrendingUp,
  Target,
  Clock,
  Award,
  MessageSquare,
  Sparkles
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";

// Media platform icons for hero section
const IconGoogle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const IconYouTube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
  </svg>
);

const IconTwitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
  </svg>
);

const IconFacebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const IconInstagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#E4405F"/>
  </svg>
);

const IconLinkedIn = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
  </svg>
);

const IconBBC = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 12.5h7v-1h-7v1zm0-2h7v-1h-7v1zm0-2h7v-1h-7v1zm-2 6h2v-8h-2v8z" fill="#BB0000"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#BB0000"/>
  </svg>
);

const IconCNN = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#CC0000"/>
  </svg>
);

const IconGuardian = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#052962" strokeWidth="2" fill="none"/>
  </svg>
);

const IconNYT = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#000000"/>
  </svg>
);

// Define the media platform icons with their unique positions for the hero section.
const heroIcons: FloatingIconsHeroProps['icons'] = [
  { id: 1, icon: IconGoogle, className: 'top-[15%] left-[10%]' },
  { id: 2, icon: IconYouTube, className: 'top-[25%] right-[12%]' },
  { id: 3, icon: IconTwitter, className: 'top-[75%] left-[15%]' },
  { id: 4, icon: IconFacebook, className: 'bottom-[15%] right-[15%]' },
  { id: 5, icon: IconInstagram, className: 'top-[10%] left-[35%]' },
  { id: 6, icon: IconLinkedIn, className: 'top-[8%] right-[35%]' },
  { id: 7, icon: IconBBC, className: 'bottom-[12%] left-[30%]' },
  { id: 8, icon: IconCNN, className: 'top-[45%] left-[18%]' },
  { id: 9, icon: IconGuardian, className: 'top-[70%] right-[28%]' },
  { id: 10, icon: IconNYT, className: 'top-[88%] left-[65%]' },
  { id: 11, icon: IconGoogle, className: 'top-[52%] right-[8%]' },
  { id: 12, icon: IconYouTube, className: 'top-[58%] left-[8%]' },
  { id: 13, icon: IconTwitter, className: 'top-[12%] left-[60%]' },
  { id: 14, icon: IconFacebook, className: 'bottom-[8%] right-[50%]' },
  { id: 15, icon: IconInstagram, className: 'top-[30%] right-[22%]' },
  { id: 16, icon: IconLinkedIn, className: 'top-[65%] left-[45%]' },
];

const Index = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Target,
      title: "Advanced Targeting",
      description: "Filter by DR, DA, traffic, location, and niche to find your perfect media outlets.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Verified Publishers",
      description: "All publishers are vetted with real metrics and transparent pricing.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Clear timelines, order tracking, and guaranteed publication dates.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: BarChart3,
      title: "Real Metrics",
      description: "Ahrefs DR, Moz DA, Semrush AS, and traffic data you can trust.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageSquare,
      title: "Price Negotiation",
      description: "Make offers, negotiate prices, and build long-term partnerships.",
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: Award,
      title: "Quality Control",
      description: "Content guidelines, review process, and satisfaction guarantee.",
      color: "from-red-500 to-rose-500"
    }
  ];

  const stats = [
    { label: "Media Outlets", value: "500+", icon: Globe },
    { label: "Active Users", value: "2,000+", icon: Users },
    { label: "Orders Completed", value: "10,000+", icon: CheckCircle },
    { label: "Average DR", value: "45+", icon: TrendingUp }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "SEO Manager at TechCorp",
      content: "This platform has revolutionized how we acquire backlinks. The transparency and quality are unmatched.",
      rating: 5
    },
    {
      name: "Marcus Weber",
      role: "Publisher at Nordic News",
      content: "Finally, a platform that respects both publishers and SEO professionals. Great earnings and fair pricing.",
      rating: 5
    },
    {
      name: "Elena Rodriguez",
      role: "Digital Marketing Director",
      content: "The filtering system is incredible. We found the perfect outlets for our niche in minutes.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <FloatingIconsHero
        title="Stay in the Moody side of SEO"
        subtitle="Moody Media connects you with strong, relevant links that boosts authority and rankings."
        ctaText="Explore Marketplace"
        ctaHref={user ? "/marketplace" : "/auth"}
        secondaryCtaText="Learn More"
        secondaryCtaHref="#dashboard"
        icons={heroIcons}
      />

      {/* Marketplace Preview Section */}
      <section id="dashboard" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Explore Our <span className="text-teal-600 tracking-wide">Marketplace</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover premium publishers and high-quality backlink opportunities. 
              Our curated marketplace connects you with the best media outlets for your SEO campaigns.
            </p>
          </div>

          {/* Marketplace Preview */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Browser Header */}
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 text-sm text-gray-500 ml-4">
                moodymedia.com/marketplace
              </div>
            </div>

            {/* Marketplace Content */}
            <div className="p-8">
              {/* Marketplace Header */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Premium Publishers</h3>
                  <p className="text-gray-600">High-quality backlink opportunities from trusted media outlets</p>
                </div>
                <div className="flex gap-3">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Categories</option>
                    <option>Technology</option>
                    <option>Business</option>
                    <option>Health</option>
                  </select>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>DR: 40+</option>
                    <option>DR: 50+</option>
                    <option>DR: 60+</option>
                  </select>
                </div>
              </div>

              {/* Marketplace Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Publisher Card 1 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">T</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">TechNews.se</h4>
                        <p className="text-sm text-gray-600">Technology & Innovation</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Domain Rating</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">47</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Organic Traffic</span>
                      <span className="text-sm font-medium text-gray-800">2.1K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-lg font-bold text-gray-800">€450</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                    Add to Cart
                  </button>
                </div>

                {/* Publisher Card 2 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">B</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">BusinessInsider.se</h4>
                        <p className="text-sm text-gray-600">Finance & Business</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Domain Rating</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">60</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Organic Traffic</span>
                      <span className="text-sm font-medium text-gray-800">5.2K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-lg font-bold text-gray-800">€320</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                    Add to Cart
                  </button>
                </div>

                {/* Publisher Card 3 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">H</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">HealthNews.se</h4>
                        <p className="text-sm text-gray-600">Health & Wellness</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Domain Rating</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">42</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Organic Traffic</span>
                      <span className="text-sm font-medium text-gray-800">1.8K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-lg font-bold text-gray-800">€280</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-12 bg-gray-50 rounded-xl p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <div className="text-3xl font-bold text-teal-600 mb-2">500+</div>
                    <div className="text-gray-600">Premium Publishers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-teal-600 mb-2">2,000+</div>
                    <div className="text-gray-600">Active Users</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-teal-600 mb-2">10,000+</div>
                    <div className="text-gray-600">Links Delivered</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-teal-600 mb-2">45+</div>
                    <div className="text-gray-600">Average DR</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional CTA Section below hero */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-primary/20 hover:bg-primary/5" asChild>
              <Link to="#features">
                Learn More
              </Link>
            </Button>
          </div>

          {!user && (
            <p className="text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:text-primary/80 underline font-medium">
                Sign in here
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 border-primary/20 bg-primary/5">
              Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Everything you need for
              <span className="text-primary"> successful link building</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines transparency, quality control, and user experience 
              to deliver the best link building marketplace on the market.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-r ${feature.color} p-0.5 mb-4 group-hover:scale-110 transition-transform`}>
                    <div className="h-full w-full bg-background rounded-xl flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 border-primary/20 bg-primary/5">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Simple process,
              <span className="text-primary"> powerful results</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Browse & Filter</h3>
              <p className="text-muted-foreground">
                Use our advanced filters to find media outlets that match your niche, 
                budget, and quality requirements.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Order & Pay</h3>
              <p className="text-muted-foreground">
                Add outlets to cart, negotiate prices if needed, and complete 
                secure payment with full transparency.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Get Published</h3>
              <p className="text-muted-foreground">
                Track your order progress, receive publication URLs, and 
                watch your search rankings improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 border-primary/20 bg-primary/5">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Trusted by
              <span className="text-primary"> SEO professionals</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to grow your
            <span className="text-primary"> online presence?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of SEO professionals and publishers who are already 
            building better backlinks with our platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 py-4 text-lg font-semibold" asChild>
              <Link to={user ? "/marketplace" : "/auth"}>
                {user ? "Browse Marketplace" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-primary/20" asChild>
              <Link to="/referral">
                Earn with Referrals
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            No setup fees • Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;