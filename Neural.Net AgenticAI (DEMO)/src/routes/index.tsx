import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Zap, Shield, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-8">
              <Sparkles className="h-12 w-12 text-indigo-600" />
              <span className="text-3xl font-bold text-gray-900">Neural.Net</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Creative Studio
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Transform your ideas into stunning campaigns with collaborative AI agents. 
              From concept to creation in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition group"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition border-2 border-gray-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powered by Multi-Agent AI
          </h2>
          <p className="text-xl text-gray-600">
            Specialized AI agents work together to create professional campaigns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="h-14 w-14 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
              <Zap className="h-7 w-7 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Lightning Fast
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Generate complete campaigns in minutes, not days. Our AI agents work in parallel to deliver results faster than ever.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="h-14 w-14 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <Shield className="h-7 w-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Brand Safe
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Built-in validation and legal review ensure your content is always on-brand and compliant with regulations.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="h-14 w-14 bg-pink-100 rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-7 w-7 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Data-Driven
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Every decision is backed by AI analysis and optimization, ensuring maximum impact for your campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Four specialized agents collaborate to bring your vision to life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                agent: "WriterAgent",
                description: "Crafts compelling copy based on your brief, tone, and target audience",
                color: "indigo",
              },
              {
                step: "02",
                agent: "BrandChecker",
                description: "Validates brand consistency and ensures tone alignment across all content",
                color: "purple",
              },
              {
                step: "03",
                agent: "LegalAgent",
                description: "Reviews content for compliance and flags potential legal issues",
                color: "pink",
              },
              {
                step: "04",
                agent: "DesignerAgent",
                description: "Generates stunning visuals that perfectly match your messaging",
                color: "indigo",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className={`text-6xl font-bold text-${item.color}-100 mb-4`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {item.agent}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Creative Process?
          </h2>
          <p className="text-xl mb-8 text-indigo-100">
            Join thousands of creators using AI to build better campaigns
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition group"
          >
            Start Creating Now
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6" />
            <span className="text-xl font-bold">Neural.Net</span>
          </div>
          <p className="text-center text-gray-400">
            © 2024 Neural.Net. AI-Powered Creative Studio.
          </p>
        </div>
      </footer>
    </div>
  );
}
