"use client";

import { SettingsProvider } from "@/lib/settings-provider";
import { LastOcrImage } from "@/components/ready-to-use-examples/last-ocr-image";
import { HealthStatus } from "@/components/ready-to-use-examples/health-status";
import { LastUiRecord } from "@/components/ready-to-use-examples/last-ui-record";
import { SimpleHealthStatus } from "@/components/simple-health-status";
import { PlaygroundCard } from "@/components/playground-card";
import { OcrImageDisplay } from "@/components/ocr-image-display";
import { GeminiChat } from "@/components/gemini-chat";
import { ClientOnly } from "@/lib/client-only";
import { OcrProvider } from "@/lib/ocr-context";
import { YouTubeVideosTable } from "@/components/youtube-videos-table";
import { AdTrackerDashboard } from "@/components/ad-tracker-dashboard";
import { Inter } from "next/font/google";
import healthStatusContent from '../content/health-status-card.json';
import { useEffect, useState } from "react";
import { Bot, FileText, Eye, Brain, BarChart3, TrendingUp, Clock, Database, Lightbulb } from "lucide-react";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

interface Pipe {
  id: string;
  name: string;
  description: string;
}

export default function Page() {
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://screenpi.pe/api/plugins/registry")
      .then((res) => res.json())
      .then((data) => {
        const transformedPipes = data.map((pipe: any) => ({
          id: pipe.id,
          name: pipe.name,
          description: pipe.description?.split('\n')[0] || ''
        }));
        setPipes(transformedPipes);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching pipes:", error);
        setLoading(false);
      });
  }, []);

  return (
    <SettingsProvider>
      <ClientOnly>
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 py-16 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block p-2 bg-indigo-900/30 backdrop-blur-md rounded-xl mb-4">
              <Eye className="h-8 w-8 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl mb-6">
              <span className="block">MirrorAI</span>
              <span className="block text-indigo-400">Know Yourself Better</span>
            </h1>
            <p className="mt-3 text-base text-zinc-300 sm:mt-5 sm:text-lg max-w-xl mx-auto mb-8">
              An intelligent agent that tracks your digital footprint to help you gain deeper insights into your behaviors, habits, and patterns.
            </p>
            
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                <Brain className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
                <h3 className="text-lg font-medium text-white mb-2">Self-Awareness</h3>
                <p className="text-sm text-zinc-400">Discover blind spots in your online behaviors you may not be conscious of</p>
              </div>
              
              <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                <BarChart3 className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
                <h3 className="text-lg font-medium text-white mb-2">Pattern Recognition</h3>
                <p className="text-sm text-zinc-400">Identify recurring patterns that shape your digital experience</p>
              </div>
              
              <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                <TrendingUp className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
                <h3 className="text-lg font-medium text-white mb-2">Growth Tracking</h3>
                <p className="text-sm text-zinc-400">Measure progress towards your goals with quantifiable metrics</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex flex-col gap-6 items-center justify-center h-full px-4 pb-12 ${inter.className}`}>  
        </div> 
        
        <OcrProvider>
          {/* Main Content - Reordered components: OCR, Chat, Ads */}
          <OcrImageDisplay />
          <GeminiChat />
          
          {/* How It Works Section */}
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-center my-8">
            <div className="max-w-3xl mx-auto">
              <div className="inline-block p-2 bg-purple-900/30 backdrop-blur-md rounded-xl mb-4">
                <Brain className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
                <span className="block">How MirrorAI Works</span>
                <span className="block text-purple-400">Your Digital Reflection</span>
              </h2>
              <p className="mt-3 text-base text-zinc-300 sm:mt-5 sm:text-lg max-w-xl mx-auto mb-8">
                MirrorAI observes and learns from your digital behaviors to create a personalized understanding of who you are.
              </p>
              
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  <Eye className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-white mb-2">Ad Tracking</h3>
                  <p className="text-sm text-zinc-400">Analyzes ads you see to understand your interests and desires, revealing patterns in your consumer behavior</p>
                </div>
                
                <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  <Clock className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-white mb-2">Habit Monitoring</h3>
                  <p className="text-sm text-zinc-400">Identifies repetitive tasks and behaviors like late-night YouTube sessions or horror movie preferences</p>
                </div>
                
                <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  <Database className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-white mb-2">Memory Storage</h3>
                  <p className="text-sm text-zinc-400">Securely saves your activity patterns in a retrieval-augmented language model (RAG LLM)</p>
                </div>
                
                <div className="p-6 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  <Lightbulb className="h-8 w-8 text-purple-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-white mb-2">Insight Generation</h3>
                  <p className="text-sm text-zinc-400">Combines all data points to create a comprehensive understanding of your preferences and behaviors</p>
                </div>
              </div>
            </div>
          </div>
          
          <AdTrackerDashboard />
        </OcrProvider>
      </ClientOnly>
    </SettingsProvider>
  );
}
