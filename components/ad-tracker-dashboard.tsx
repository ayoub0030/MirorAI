"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pipe } from "@screenpipe/browser";
import { WebsiteOcrItem } from "./website-ocr-display";
import { Loader2, RefreshCw, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type WebsiteName = "youtube" | "amazon" | "facebook" | "google";

interface WebsiteStats {
  name: WebsiteName;
  url: string;
  color: string;
  adCount: number;
  totalScans: number;
  adPercentage: number;
  adItems: WebsiteOcrItem[];
  isLoading: boolean;
  error: string | null;
}

export function AdTrackerDashboard() {
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<WebsiteStats | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [websites, setWebsites] = useState<WebsiteStats[]>([
    { 
      name: "youtube", 
      url: "https://www.youtube.com", 
      color: "#FF0000", 
      adCount: 0, 
      totalScans: 0,
      adPercentage: 0,
      adItems: [],
      isLoading: true,
      error: null
    },
    { 
      name: "amazon", 
      url: "https://www.amazon.com", 
      color: "#FF9900", 
      adCount: 0, 
      totalScans: 0,
      adPercentage: 0,
      adItems: [],
      isLoading: true,
      error: null
    },
    { 
      name: "facebook", 
      url: "https://www.facebook.com", 
      color: "#1877F2", 
      adCount: 0, 
      totalScans: 0,
      adPercentage: 0,
      adItems: [],
      isLoading: true,
      error: null
    },
    { 
      name: "google", 
      url: "https://www.google.com", 
      color: "#A142F4", 
      adCount: 0, 
      totalScans: 0,
      adPercentage: 0,
      adItems: [],
      isLoading: true,
      error: null
    }
  ]);

  // Function to check if text is ad-related
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

  const fetchWebsiteData = async (site: WebsiteStats, index: number) => {
    try {
      const updatedWebsites = [...websites];
      updatedWebsites[index] = {
        ...updatedWebsites[index],
        isLoading: true,
        error: null
      };
      setWebsites(updatedWebsites);

      const days = 7;
      const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      
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
      
      const result = await pipe.queryScreenpipe({
        browserUrl: site.url,
        contentType: "ocr",
        startTime,
        endTime,
        limit: 100,
        includeFrames: true
      });
      
      // Restore original console.error
      console.error = originalConsoleError;
      
      if (!result || !result.data || result.data.length === 0) {
        throw new Error(`No OCR data available for ${site.name}`);
      }
      
      // Process the results
      const totalCaptures = result.data.length;
      const allCaptures = result.data.map(item => {
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
      
      // Filter ad related content
      const adCaptures = allCaptures.filter(item => item.isAd);

      // Calculate percentage (handle divide by zero)
      const percentage = totalCaptures > 0 ? Math.round((adCaptures.length / totalCaptures) * 100) : 0;
      
      // Update state
      const updatedSites = [...websites];
      updatedSites[index] = {
        ...updatedSites[index],
        adCount: adCaptures.length,
        totalScans: totalCaptures,
        adPercentage: percentage,
        adItems: adCaptures,
        isLoading: false,
        error: null
      };
      
      setWebsites(updatedSites);
      
      // Update selected site if it's currently selected in the dialog
      if (selectedSite && selectedSite.name === site.name) {
        setSelectedSite(updatedSites[index]);
      }
      
    } catch (error) {
      console.error(`Error fetching data for ${site.name}:`, error);
      
      // Update state to show error
      const updatedSites = [...websites];
      updatedSites[index] = {
        ...updatedSites[index],
        isLoading: false,
        error: error instanceof Error ? error.message : `Failed to fetch data for ${site.name}`
      };
      
      setWebsites(updatedSites);
      
      toast({
        title: `Error retrieving ${site.name} data`,
        description: error instanceof Error ? error.message : "Failed to fetch OCR data",
        variant: "destructive"
      });
    }
  };

  // Fetch data for each website on load
  useEffect(() => {
    const fetchAllData = async () => {
      for (let i = 0; i < websites.length; i++) {
        await fetchWebsiteData(websites[i], i);
      }
    };
    
    fetchAllData();
  }, []);

  const handleSiteClick = (site: WebsiteStats) => {
    if (site.isLoading) return;
    
    setSelectedSite(site);
    setShowDialog(true);
  };

  const refreshData = (site: WebsiteStats, index: number) => {
    fetchWebsiteData(site, index);
  };
  
  const refreshAllData = async () => {
    setIsRefreshingAll(true);
    
    try {
      for (let i = 0; i < websites.length; i++) {
        await fetchWebsiteData(websites[i], i);
      }
      
      toast({
        title: "Data refreshed",
        description: "All website ad data has been updated",
      });
    } catch (error) {
      console.error("Error refreshing all data:", error);
      
      toast({
        title: "Refresh failed",
        description: "Some data could not be updated. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Function to export ad data to CSV
  const exportAdData = (site: WebsiteStats) => {
    if (!site || site.adItems.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no ad data available to export.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV header
    let csvContent = "Timestamp,Date,Time,URL,Content\n";

    // Add data rows
    site.adItems.forEach(item => {
      // Escape content text to handle commas and quotes
      const escapedContent = item.content.replace(/"/g, '""');
      // Create CSV row
      csvContent += `${item.timestamp.toISOString()},${item.date},${item.time},"${item.url}","${escapedContent}"\n`;
    });

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${site.name}-ads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Ad data for ${site.name} has been exported to CSV.`
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 mb-8 px-4">
      <div className="bg-zinc-900 rounded-lg shadow-md border-2 border-zinc-700 p-4">
        {/* Navbar with title and refresh all button */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-center text-zinc-200">Ad Tracker Dashboard</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshAllData}
            disabled={isRefreshingAll || websites.some(site => site.isLoading)}
            className="text-zinc-300 border-zinc-600 hover:bg-zinc-700"
          >
            {isRefreshingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh All
          </Button>
        </div>

        {/* Website grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {websites.map((site, index) => (
            <div 
              key={site.name}
              className={`bg-zinc-800 rounded-lg p-4 flex flex-col items-center border-2 ${
                site.error 
                  ? 'border-red-800 hover:border-red-700' 
                  : 'border-zinc-700 hover:border-zinc-600'
              } transition-colors cursor-pointer`}
              onClick={() => handleSiteClick(site)}
            >
              <div className="mb-3 w-full bg-zinc-700 rounded-md p-2">
                <p className="text-center text-lg font-medium capitalize text-zinc-200">{site.name}</p>
              </div>
              
              <div className="relative w-32 h-32 my-2">
                {site.isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
                  </div>
                ) : site.error ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                  </div>
                ) : (
                  <>
                    {/* Background circle */}
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#333"
                        strokeWidth="8"
                      />
                      
                      {/* Progress arc */}
                      {site.adPercentage > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={site.color}
                          strokeWidth="8"
                          strokeDasharray={`${site.adPercentage * 2.51} 251`}
                          strokeDashoffset="0"
                          transform="rotate(-90 50 50)"
                        />
                      )}
                    </svg>
                    
                    {/* Percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xl font-bold text-zinc-300">{site.adPercentage}%</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-2 text-center">
                {site.isLoading ? (
                  <p className="text-sm text-zinc-400">Loading data...</p>
                ) : site.error ? (
                  <p className="text-sm text-red-400">Error loading data</p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-400">
                      {site.adCount} {site.adCount === 1 ? 'ad' : 'ads'} detected
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      from {site.totalScans} OCR {site.totalScans === 1 ? 'scan' : 'scans'}
                    </p>
                  </>
                )}
                <button 
                  className={`mt-2 text-xs px-2 py-1 rounded-sm ${
                    site.isLoading 
                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-300'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!site.isLoading) refreshData(site, index);
                  }}
                  disabled={site.isLoading}
                >
                  {site.isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog to show ad details */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="capitalize">{selectedSite?.name}</span> - 
                <span style={{ color: selectedSite?.color }}>
                  {selectedSite?.adCount} {selectedSite?.adCount === 1 ? 'Ad' : 'Ads'} Detected
                </span>
              </div>
              {selectedSite && selectedSite.adItems.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => exportAdData(selectedSite)}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSite && selectedSite.adItems.length > 0 ? (
            <div className="space-y-4 mt-2">
              {selectedSite.adItems.map((item, index) => (
                <div 
                  key={index}
                  className="bg-zinc-800 p-4 rounded-md border-l-4"
                  style={{ borderLeftColor: selectedSite.color }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-zinc-200 font-medium">
                      <span className="text-xs px-2 py-0.5 rounded mr-2" style={{ backgroundColor: selectedSite.color }}>
                        AD
                      </span>
                      {new URL(item.url).hostname.replace('www.', '')}
                    </p>
                    <span className="text-xs text-zinc-400">{item.date} {item.time}</span>
                  </div>
                  
                  <p className="text-zinc-300 text-sm mb-3">{item.content}</p>
                  
                  {item.screenshot && (
                    <div className="mt-2 bg-zinc-900 p-2 rounded">
                      <img 
                        src={item.screenshot} 
                        alt="Ad screenshot" 
                        className="w-full object-contain max-h-[200px]" 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : selectedSite && selectedSite.error ? (
            <div className="py-8 text-center text-red-400">
              <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
              <p>{selectedSite.error}</p>
              <p className="text-sm text-zinc-500 mt-2">
                Try refreshing the data or make sure Screenpipe is capturing information from this website
              </p>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">
              <p>No ad content detected for {selectedSite?.name}</p>
              <p className="text-sm mt-2">
                Try visiting {selectedSite?.name} in your browser with Screenpipe running to capture more data
              </p>
            </div>
          )}
          
        </DialogContent>
      </Dialog>

      {/* Analytics Summary */}
      <div className="mt-8 bg-zinc-900 rounded-lg shadow-md border-2 border-zinc-700 p-4">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Ad Analytics Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="text-md font-medium text-zinc-300 mb-2">Total Ads Detected</h3>
            <p className="text-2xl font-bold text-zinc-100">
              {websites.reduce((sum, site) => sum + site.adCount, 0)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Across {websites.reduce((sum, site) => sum + site.totalScans, 0)} OCR scans
            </p>
          </div>
          
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
            <h3 className="text-md font-medium text-zinc-300 mb-2">Ad Percentage by Website</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {websites
                .filter(site => !site.isLoading && !site.error)
                .map(site => (
                  <div 
                    key={site.name} 
                    className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                    style={{ backgroundColor: `${site.color}33` }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: site.color }}
                    ></span>
                    <span className="capitalize">{site.name}</span>
                    <span className="font-bold">{site.adPercentage}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
