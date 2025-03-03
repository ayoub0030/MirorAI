"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Download, Copy, RefreshCw, AlertTriangle } from "lucide-react";
import { getGeminiResponse, TranscriptContext } from "@/services/gemini-ai";

interface VideoGenerationFormProps {
  transcriptContext: TranscriptContext;
  onClose?: () => void;
}

interface VideoGenerationData {
  title: string;
  logoPrompt: string;
  description: string;
  script: string;
  seo: string;
  videoScenePrompt: string;
}

export function VideoGenerationForm({ transcriptContext, onClose }: VideoGenerationFormProps) {
  const [data, setData] = useState<VideoGenerationData>({
    title: "",
    logoPrompt: "",
    description: "",
    script: "",
    seo: "",
    videoScenePrompt: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  
  // Generate content on mount
  useEffect(() => {
    generateContent();
  }, []);
  
  // Handle copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
    console.log(`Copied ${field} to clipboard`);
  };

  // Export all content as a text file
  const exportContent = () => {
    const fileName = `video-content-${new Date().toISOString().slice(0, 10)}.txt`;
    const content = `# ${data.title}
    
## Logo Prompt
${data.logoPrompt}

## Description
${data.description}

## Script
${data.script}

## SEO Keywords
${data.seo}

## Video Scene Prompts
${data.videoScenePrompt}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  // Generate content using Gemini AI
  const generateContent = async () => {
    setLoading(true);
    setError(null);
    setIsQuotaError(false);
    
    try {
      // Send a prompt to Gemini to generate video content
      const prompt = `Based on the following video transcripts, generate creative content for a new video that combines their themes and insights.
      
For the new video, generate:
1. A catchy title (no more than 60 characters)
2. A logo design prompt for an AI image generator (describe what the logo should look like in detail)
3. A compelling video description (150-200 words)
4. A script outline (400-600 words) with introduction, main points, and conclusion
5. SEO keywords and tags (comma-separated list)
6. Visual scene descriptions for key moments (3-5 scenes, 50-80 words each)

Format your response clearly with each section separated by headings.
Do not include any prefixes like "Title:**" or "Logo Design Prompt:**" - just provide the raw content for each section.

Here are the transcripts to analyze:
${transcriptContext.transcript}`;
      
      const response = await getGeminiResponse(transcriptContext, prompt);
      
      // Parse the response to extract different sections
      const sections = parseResponse(response);
      
      setData(sections);
    } catch (error) {
      console.error("Error generating video content:", error);
      
      // Check if it's a quota error (429)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      
      if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
        setIsQuotaError(true);
        
        // Set template placeholder data
        setData({
          title: "Minecraft Bedwars Immobile Challenge",
          logoPrompt: "A pixelated Minecraft-style bed with a fiery explosion behind it. The bed should be slightly tilted, as if being knocked over. Incorporate a small, immobile stick figure player nearby.",
          description: "Can you win a Minecraft Bedwars match WITHOUT MOVING? This challenge pushes the limits of strategy and creativity as we attempt to defend our bed and defeat opponents while remaining completely stationary. Watch as we use clever traps, projectiles, and teammate coordination to overcome this seemingly impossible restriction. Perfect for Minecraft fans looking for a fresh twist on the classic Bedwars gameplay!",
          script: "Introduction (0:00-1:30):\n- Welcome viewers and explain the immobile challenge concept\n- Brief overview of Bedwars for anyone unfamiliar\n- Explain the specific rules: no walking/swimming/flying, but can turn and place blocks\n- Introduce teammates who will help with the challenge\n\nStrategy Planning (1:30-3:00):\n- Discuss initial defense setup options\n- Plan resource gathering through teammates\n- Outline potential offensive strategies using projectiles and TNT\n- Set up communication system with teammates\n\nEarly Game (3:00-6:00):\n- Initial base fortification from stationary position\n- Directing teammates to collect resources\n- Building defensive structures around the bed\n- First encounter with enemies trying to reach our island\n\nMid Game (6:00-10:00):\n- Upgrading weapons and tools while remaining stationary\n- Setting up traps for approaching enemies\n- Coordinating teammate attacks on other islands\n- Clutch defense moments where immobility creates tension\n\nLate Game (10:00-15:00):\n- Adapting strategy as fewer teams remain\n- Creative uses of ender pearls and projectiles\n- Tense moments defending against coordinated attacks\n- Strategic communication with teammates for final assault\n\nConclusion (15:00-17:00):\n- Result of the challenge (win or valiant defeat)\n- Lessons learned from playing immobile\n- Thanking viewers and teammates\n- Suggestion for other challenge ideas in the comments",
          seo: "Minecraft, Bedwars, Challenge, Immobile Challenge, Gaming, Hypixel, Minecraft Strategy, No Movement Challenge, Gaming Challenge, Minecraft PVP, Bedwars Strategy, Minecraft Server, Hypixel Bedwars",
          videoScenePrompt: "Scene 1: Close-up of player character standing completely still on a Minecraft bed as chaos unfolds around them. Text overlay introduces the 'Immobile Bedwars Challenge' with animated question marks.\n\nScene 2: Split-screen showing the stationary player directing teammates via on-screen chat commands, while teammates gather resources and build defenses. Use speed-up effects to show the base being built around the immobile player.\n\nScene 3: Dramatic slow-motion sequence of the immobile player shooting arrows and throwing ender pearls precisely to defend the bed while enemies approach from multiple angles. Add tension with heartbeat sound effects and health bar prominently displayed."
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Parse Gemini response into sections
  const parseResponse = (response: string): VideoGenerationData => {
    const result: VideoGenerationData = {
      title: "",
      logoPrompt: "",
      description: "",
      script: "",
      seo: "",
      videoScenePrompt: ""
    };
    
    // Clean up the response text first
    const cleanText = response.replace(/^\s*\d+\.\s*/gm, '')  // Remove numbered list markers
                             .replace(/^\s*(Title|Logo Design Prompt|Description|Video Description|Script|Script Outline|SEO|Keywords|Tags|Visual|Scenes|Scene Descriptions)[:*]+\s*/gim, '') // Remove section headers
                             .replace(/\*\*/g, ''); // Remove any markdown formatting
    
    // Split by common section headers
    const lines = cleanText.split('\n');
    let currentSection = '';
    let currentContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect section headers
      if (line.match(/^Title\b/i) || 
          (line.match(/^Logo\b/i) && currentSection !== 'title') ||
          line.match(/^Description\b/i) || 
          line.match(/^Script\b/i) || 
          line.match(/^SEO\b/i) || line.match(/^Keywords\b/i) || 
          line.match(/^Visual\b/i) || line.match(/^Scene\b/i)) {
        
        // Save previous section content if we've accumulated any
        if (currentSection && currentContent) {
          switch(currentSection.toLowerCase()) {
            case 'title': result.title = currentContent.trim(); break;
            case 'logo': result.logoPrompt = currentContent.trim(); break;
            case 'description': result.description = currentContent.trim(); break;
            case 'script': result.script = currentContent.trim(); break;
            case 'seo': case 'keywords': result.seo = currentContent.trim(); break;
            case 'visual': case 'scene': result.videoScenePrompt = currentContent.trim(); break;
          }
        }
        
        // Start new section
        if (line.match(/^Title\b/i)) currentSection = 'title';
        else if (line.match(/^Logo\b/i)) currentSection = 'logo';
        else if (line.match(/^Description\b/i)) currentSection = 'description';
        else if (line.match(/^Script\b/i)) currentSection = 'script';
        else if (line.match(/^SEO\b/i) || line.match(/^Keywords\b/i)) currentSection = 'seo';
        else if (line.match(/^Visual\b/i) || line.match(/^Scene\b/i)) currentSection = 'visual';
        
        currentContent = line.replace(/^(Title|Logo|Description|Script|SEO|Keywords|Visual|Scene)[^:]*[:]*\s*/i, '');
      } else {
        // Continue accumulating content for the current section
        currentContent += (currentContent ? '\n' : '') + line;
      }
    }
    
    // Don't forget to save the last section
    if (currentSection && currentContent) {
      switch(currentSection.toLowerCase()) {
        case 'title': result.title = currentContent.trim(); break;
        case 'logo': result.logoPrompt = currentContent.trim(); break;
        case 'description': result.description = currentContent.trim(); break;
        case 'script': result.script = currentContent.trim(); break;
        case 'seo': case 'keywords': result.seo = currentContent.trim(); break;
        case 'visual': case 'scene': result.videoScenePrompt = currentContent.trim(); break;
      }
    }
    
    // If parsing fails, try a simpler approach based on paragraph breaks
    if (!result.title && !result.logoPrompt && !result.script) {
      const paragraphs = response.split(/\n\s*\n/);
      if (paragraphs.length >= 6) {
        result.title = paragraphs[0].replace(/^(Title|.*:)/i, '').trim();
        result.logoPrompt = paragraphs[1].replace(/^(Logo.*:)/i, '').trim();
        result.description = paragraphs[2].replace(/^(Description.*:)/i, '').trim();
        result.script = paragraphs[3].replace(/^(Script.*:)/i, '').trim();
        result.seo = paragraphs[4].replace(/^(SEO.*:|Keywords.*:)/i, '').trim();
        result.videoScenePrompt = paragraphs[5].replace(/^(Visual.*:|Scene.*:)/i, '').trim();
      }
    }
    
    // Ensure we have some script content - very important section
    if (!result.script || result.script.length < 50) {
      // Find script content in original response if our parsing missed it
      const scriptMatch = response.match(/script[^:]*:(.*?)(?=\n\s*\n\s*[a-z]+[^:]*:|$)/is);
      if (scriptMatch && scriptMatch[1]) {
        result.script = scriptMatch[1].trim();
      }
    }
    
    return result;
  };

  return (
    <div className="border rounded-lg shadow-sm w-full overflow-hidden bg-white mt-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <h2 className="text-xl font-semibold">AI Video Generation</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {loading ? (
          <div className="col-span-12 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Generating creative video content from selected videos...</p>
          </div>
        ) : error && !isQuotaError ? (
          <div className="col-span-12 bg-red-50 p-4 rounded-lg text-red-700">
            <p className="font-medium mb-2">Error generating content</p>
            <p>{error}</p>
            <Button onClick={generateContent} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        ) : isQuotaError ? (
          <div className="col-span-12 bg-amber-50 p-4 rounded-lg text-amber-700 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">API Quota Limit Reached</p>
                <p className="text-sm mt-1">Your Gemini API quota has been exhausted. We've provided a template you can edit manually below.</p>
                <p className="text-sm mt-2">To fix this issue:</p>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  <li>Wait a while before trying again (quotas often reset hourly or daily)</li>
                  <li>Check your Gemini API console for quota information</li>
                  <li>Consider upgrading your API tier if you need more capacity</li>
                </ul>
                <Button 
                  variant="outline" 
                  onClick={generateContent} 
                  className="mt-3"
                  size="sm"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        
        {(!loading && !error) || isQuotaError ? (
          <>
            {/* Title */}
            <div className="col-span-12 md:col-span-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Title</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.title, 'title')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input value={data.title} onChange={e => setData({...data, title: e.target.value})} />
            </div>
            
            {/* Script */}
            <div className="col-span-12 md:col-span-8 border rounded-lg p-4 row-span-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Script</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.script, 'script')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea 
                value={data.script} 
                onChange={e => setData({...data, script: e.target.value})}
                className="h-[300px]"
              />
            </div>
            
            {/* Logo Prompt */}
            <div className="col-span-12 md:col-span-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Logo Prompt</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.logoPrompt, 'logo prompt')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea 
                value={data.logoPrompt} 
                onChange={e => setData({...data, logoPrompt: e.target.value})}
                className="h-[80px]"
              />
            </div>
            
            {/* Description */}
            <div className="col-span-12 md:col-span-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Description</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.description, 'description')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea 
                value={data.description} 
                onChange={e => setData({...data, description: e.target.value})}
                className="h-[100px]"
              />
            </div>
            
            {/* SEO */}
            <div className="col-span-12 md:col-span-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">SEO Keywords</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.seo, 'SEO keywords')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea 
                value={data.seo} 
                onChange={e => setData({...data, seo: e.target.value})}
                className="h-[80px]"
              />
            </div>
            
            {/* Video Scene Prompts */}
            <div className="col-span-12 md:col-span-8 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Video Scene Prompts</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(data.videoScenePrompt, 'video scene prompts')}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea 
                value={data.videoScenePrompt} 
                onChange={e => setData({...data, videoScenePrompt: e.target.value})}
                className="h-[100px]"
              />
            </div>
          </>
        ) : null}
      </div>
      
      {/* Footer */}
      <div className="border-t p-4 flex justify-between bg-slate-50">
        {onClose && (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )}
        
        <div className="flex gap-2 ml-auto">
          <Button 
            variant="outline" 
            onClick={generateContent} 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
          
          <Button
            onClick={() => {
              const fullContent = `# ${data.title}
              
## Logo Prompt
${data.logoPrompt}

## Description
${data.description}

## Script
${data.script}

## SEO Keywords
${data.seo}

## Video Scene Prompts
${data.videoScenePrompt}
`;
              copyToClipboard(fullContent, 'all content');
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          
          <Button variant="default" onClick={exportContent}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
