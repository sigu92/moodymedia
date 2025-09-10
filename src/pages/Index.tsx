import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 mr-2" />
              The Future of SEO Link Building
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Premium SEO
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Marketplace
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed">
              Connect with verified publishers, get quality backlinks, and grow your online presence. 
              <span className="text-primary font-medium"> Transparent pricing. Real metrics. Guaranteed results.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" className="px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" asChild>
                <Link to={user ? "/marketplace" : "/auth"}>
                  {user ? "Explore Marketplace" : "Start Building Links"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-primary/20 hover:bg-primary/5" asChild>
                <Link to="#features">
                  Learn More
                </Link>
              </Button>
            </div>

            {!user && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="text-primary hover:text-primary/80 underline font-medium">
                  Sign in here
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
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
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
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
      <section className="py-24 px-4 sm:px-6 lg:px-8">
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
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