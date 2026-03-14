import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plane, Shield, IndianRupee, Sparkles, Zap, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-950 dark:via-purple-950 dark:to-blue-950 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center relative z-10 animate-slide-in-up">
        <div className="text-2xl font-bold gradient-text font-display">PaarcelMate</div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost" className="hover:scale-105 transition-transform">Log In</Button>
          </Link>
          <Link href="/register">
            <Button className="btn-gradient shadow-glow">Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="animate-scale-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-bounce-subtle">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">India's Smartest Parcel Delivery</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white font-display leading-tight">
            Deliver Smarter,<br />
            <span className="gradient-text">Travel Better</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect travelers with senders for efficient, affordable, and secure peer-to-peer deliveries across India.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="btn-gradient text-lg px-10 py-6 shadow-glow-lg hover:shadow-glow-lg">
                <Zap className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-10 py-6 border-2 hover:scale-105 transition-transform">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-12 animate-slide-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white font-display">
            How It Works
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Simple, secure, and rewarding for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-2 hover:scale-105 hover:shadow-glow transition-all duration-300 animate-slide-in-up group" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 flex items-center justify-center mb-4 group-hover:animate-bounce-subtle">
                <Package className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-display">Send Parcels</CardTitle>
              <CardDescription className="text-base">
                Create a parcel request with pickup and delivery locations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card border-2 hover:scale-105 hover:shadow-glow transition-all duration-300 animate-slide-in-up group" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 flex items-center justify-center mb-4 group-hover:animate-bounce-subtle">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-display">Travel Smart</CardTitle>
              <CardDescription className="text-base">
                Post your trips and earn money by delivering parcels along your route
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card border-2 hover:scale-105 hover:shadow-glow transition-all duration-300 animate-slide-in-up group" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 w-16 h-16 flex items-center justify-center mb-4 group-hover:animate-bounce-subtle">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-display">Smart Matching</CardTitle>
              <CardDescription className="text-base">
                Our AI matches parcels with trips based on route, schedule, and preferences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card border-2 hover:scale-105 hover:shadow-glow transition-all duration-300 animate-slide-in-up group" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 w-16 h-16 flex items-center justify-center mb-4 group-hover:animate-bounce-subtle">
                <IndianRupee className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-display">Secure Payment</CardTitle>
              <CardDescription className="text-base">
                Escrow system ensures payment is released only after successful delivery
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { icon: TrendingUp, value: '10K+', label: 'Active Users' },
            { icon: Package, value: '50K+', label: 'Deliveries' },
            { icon: Plane, value: '5K+', label: 'Travelers' },
            { icon: IndianRupee, value: '₹2Cr+', label: 'Earned' },
          ].map((stat, index) => (
            <div key={index} className="text-center animate-scale-in" style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center relative z-10">
        <Card className="max-w-2xl mx-auto bg-gradient-primary text-white border-0 shadow-glow-lg animate-scale-in overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-shine opacity-0 hover:opacity-100 transition-opacity duration-1000" style={{ backgroundSize: '200% 100%', animation: 'shimmer 3s infinite' }} />
          <CardHeader className="relative z-10">
            <CardTitle className="text-4xl font-display mb-2">Ready to Get Started?</CardTitle>
            <CardDescription className="text-white/90 text-lg">
              Join thousands of travelers and senders using our platform across India
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-6 hover:scale-105 transition-transform shadow-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Create Free Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-gray-200 dark:border-gray-700 relative z-10">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="font-medium">&copy; 2026 PaarcelMate. All rights reserved.</p>
          <p className="text-sm mt-2">Made with ❤️ in India</p>
        </div>
      </footer>
    </div>
  );
}
