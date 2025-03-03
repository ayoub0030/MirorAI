"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, AlertTriangle, Search, Filter } from "lucide-react";
import { pipe, type OCRContent, type ContentItem } from "@screenpipe/browser";

// Define the shape of our website OCR data
export interface WebsiteOcrItem {
  timestamp: Date;
  date: string;
  time: string;
  type: string;
  content: string;
  screenshot: string | null;
  url: string;
  isAd?: boolean;
}

interface WebsiteOcrDisplayProps {
  defaultWebsite?: string;
  title?: string;
  namespace?: string;
  filterForAds?: boolean;
}

export function WebsiteOcrDisplay({ 
  defaultWebsite = "https://www.learn-html.org", 
  title = "Website OCR Results",
  namespace = "default",
  filterForAds = false
}: WebsiteOcrDisplayProps) {
  // Local state for this specific component instance
  const [ocrData, setOcrData] = useState<WebsiteOcrItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string>(defaultWebsite);
  const [localUrl, setLocalUrl] = useState(defaultWebsite);
  const [selectedItem, setSelectedItem] = useState<WebsiteOcrItem | null>(null);
  const [days, setDays] = useState(7);
  const [adsFilter, setAdsFilter] = useState<boolean>(filterForAds);

  // Initialize with default website
  useEffect(() => {
    if (defaultWebsite) {
      setWebsiteUrl(defaultWebsite);
      setLocalUrl(defaultWebsite);
      fetchWebsiteOCR(defaultWebsite, days);
    }
  }, [defaultWebsite]);

  // Helper function to check if text is ad-related
  const isAdRelated = (text: string): boolean => {
    if (!text) return false;
    
    const adTerms = [
      'ad', 'ads', 'advert', 'advertisement', 'advertising', 'sponsored', 
      'promotion', 'promoted', 'promo', 'sponsor', 'verified ad', 
      'google ads', 'facebook ads', 'instagram ads', 'youtube ads',
      'buy now', 'shop now', 'limited time', 'special offer', 'discount'
    ];
    
    const lowerText = text.toLowerCase();
    return adTerms.some(term => 
      lowerText.includes(term.toLowerCase()) || 
      lowerText.match(new RegExp(`\\b${term}\\b`, 'i'))
    );
  };

  const fetchWebsiteOCR = async (url: string, days = 7) => {
    if (!url) {
      setError("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setWebsiteUrl(url);
    
    try {
      console.log(`Fetching OCR data for website: ${url} [${namespace}]`);
      
      // Handle console error suppression for analytics connection issues
      const originalConsoleError = console.error;
      console.error = function(msg, ...args) {
        // Filter out analytics connection errors
        if (typeof msg === 'string' && 
           (msg.includes('failed to fetch settings') || 
            msg.includes('ERR_CONNECTION_REFUSED'))) {
          return;
        }
        originalConsoleError.apply(console, [msg, ...args]);
      };
      
      const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      
      const result = await pipe.queryScreenpipe({
        browserUrl: url,     // Target specific website
        contentType: "ocr",  // Get OCR content
        startTime,
        endTime,
        limit: 50,           // Increase limit to find more potential ad content
        includeFrames: true  // Include screenshots
      });
      
      // Restore original console.error
      console.error = originalConsoleError;
      
      if (!result || !result.data || result.data.length === 0) {
        console.log(`No OCR data found for website: ${url}`);
        throw new Error(`No OCR data available for ${url}`);
      }
      
      // Process the results
      let captures = result.data.map(item => {
        const itemContent = item.type === "OCR" ? item.content : null;
        if (!itemContent) return null;
        
        const timestamp = new Date(itemContent.timestamp);
        const textContent = itemContent.text || "";
        const isAd = isAdRelated(textContent);
        
        return {
          timestamp,
          date: timestamp.toLocaleDateString(),
          time: timestamp.toLocaleTimeString(),
          type: item.type,
          content: textContent,
          screenshot: itemContent.frame || null,
          url: itemContent.browserUrl || "",
          isAd
        } as WebsiteOcrItem;
      }).filter(Boolean) as WebsiteOcrItem[];
      
      // Apply ads filter if enabled
      if (adsFilter) {
        captures = captures.filter(item => item.isAd);
      }
      
      console.log(`Got ${captures.length} OCR items for website: ${url} [${namespace}]${adsFilter ? ' (filtered for ads)' : ''}`);
      setOcrData(captures);
      
      if (captures.length === 0) {
        throw new Error(`No${adsFilter ? ' ad-related' : ''} OCR data found for ${url}`);
      }
    } catch (error) {
      console.error(`Error fetching website OCR [${namespace}]:`, error);
      const errorMessage = error instanceof Error 
        ? error.message
        : `Failed to fetch OCR data for ${url}`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchWebsiteOCR(localUrl, days);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleAdsFilter = () => {
    const newFilterState = !adsFilter;
    setAdsFilter(newFilterState);
    fetchWebsiteOCR(websiteUrl, days);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 mb-8 px-4">
      <div className="bg-zinc-900 rounded-lg shadow-md border-2 border-zinc-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <Button 
            onClick={toggleAdsFilter} 
            variant={adsFilter ? "default" : "outline"}
            size="sm"
            className={adsFilter ? "bg-yellow-600 hover:bg-yellow-700" : "text-zinc-400 hover:text-zinc-200"}
          >
            <Filter className="h-4 w-4 mr-1" />
            {adsFilter ? "Ads Only" : "All Content"}
          </Button>
        </div>

        {/* Search Form */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1">
            <Input
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter website URL (e.g., learn-html.org)"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !localUrl}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search</span>
          </Button>
          <Button
            onClick={() => fetchWebsiteOCR(websiteUrl, days)}
            disabled={isLoading || !websiteUrl}
            variant="outline"
            className="flex items-center gap-1 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {error ? (
          <div className="bg-red-900/30 text-red-300 p-4 rounded-md mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm mt-1">
                  {adsFilter 
                    ? "No ad-related content found. Try disabling the ads filter or visiting a different website."
                    : "Make sure Screenpipe is running and has captured data from this website."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mb-2" />
            <p className="text-zinc-500">Loading{adsFilter ? ' ad-related' : ''} OCR data for {websiteUrl}...</p>
          </div>
        ) : ocrData && ocrData.length > 0 ? (
          <div className="space-y-4">
            {/* Results list */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-zinc-400">
                Found {ocrData.length} {adsFilter ? 'ad-related ' : ''}OCR results:
              </h3>
              <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-2">
                {ocrData.map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedItem(item)}
                    className={`bg-zinc-800 p-3 rounded-md cursor-pointer hover:bg-zinc-700 transition-colors border-l-4 ${
                      selectedItem === item 
                        ? 'border-l-blue-500 border-zinc-700' 
                        : item.isAd 
                          ? 'border-l-yellow-500 border-zinc-700/50'
                          : 'border-l-transparent border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-zinc-200 font-medium truncate">
                        {item.url.replace(/https?:\/\//, '').split('/')[0]}
                        {item.isAd && <span className="ml-2 text-xs text-yellow-500 font-bold">AD</span>}
                      </p>
                      <span className="text-xs text-zinc-400">{item.date} {item.time}</span>
                    </div>
                    <p className="text-zinc-400 text-xs truncate mt-1">{item.url}</p>
                    <p className="text-zinc-300 text-sm line-clamp-2 mt-2">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selected item detail view */}
            {selectedItem && (
              <div className="border border-zinc-700 rounded-md bg-zinc-800 p-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-zinc-400">URL</p>
                    <p className="text-zinc-200 break-all">
                      {selectedItem.url}
                      {selectedItem.isAd && <span className="ml-2 text-xs text-yellow-500 font-bold">AD</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Timestamp</p>
                    <p className="text-zinc-200">{selectedItem.date} {selectedItem.time}</p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-zinc-400 mb-1">Extracted Text:</p>
                  <div className="bg-zinc-950 border border-zinc-700 rounded p-3 overflow-auto max-h-[200px] whitespace-pre-wrap font-mono text-xs text-zinc-300">
                    {selectedItem.content || "No text extracted"}
                  </div>
                </div>
                
                {selectedItem.screenshot && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Screenshot:</p>
                    <div className="bg-zinc-950 border border-zinc-700 rounded p-2 overflow-hidden">
                      <img 
                        src={selectedItem.screenshot} 
                        alt="Page screenshot" 
                        className="w-full object-contain max-h-[300px]" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : websiteUrl ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-800 rounded-md">
            <p className="text-zinc-500">No{adsFilter ? ' ad-related' : ''} OCR data available for {websiteUrl}</p>
            <p className="text-zinc-600 text-sm mt-2">
              {adsFilter 
                ? "Try disabling the ads filter or visiting a different website."
                : "Try visiting the website first in your browser with Screenpipe running"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-800 rounded-md">
            <p className="text-zinc-500">Enter a website URL to search for OCR data</p>
          </div>
        )}
      </div>
    </div>
  );
}
