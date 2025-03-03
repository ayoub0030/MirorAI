"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useOcr } from "@/lib/ocr-context";

export function OcrImageDisplay() {
  const { ocrData, isLoading, error, fetchLatestOCR } = useOcr();

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 px-4">
      <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Latest OCR Result</h2>
          <Button 
            onClick={fetchLatestOCR} 
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="flex items-center gap-1 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </>
            )}
          </Button>
        </div>
        
        {error ? (
          <div className="bg-red-900/30 text-red-300 p-4 rounded-md">
            <p>{error}</p>
            <p className="text-sm mt-1">Make sure Screenpipe is running and capturing OCR data.</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mb-2" />
            <p className="text-zinc-500">Loading OCR data...</p>
          </div>
        ) : ocrData ? (
          <div className="space-y-4">
            {/* Metadata section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-800 p-3 rounded-md">
              <div>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-zinc-400">App:</span> 
                  <span className="text-zinc-200">{ocrData.appName || "Unknown"}</span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-zinc-400">Window:</span> 
                  <span className="text-zinc-200">{ocrData.windowName || "Unknown"}</span>
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-zinc-400">Timestamp:</span> 
                  <span className="text-zinc-200">{new Date(ocrData.timestamp).toLocaleString()}</span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="font-medium text-zinc-400">Source:</span> 
                  <span className="text-zinc-200">Window Capture</span>
                </p>
              </div>
            </div>
            
            {/* Extracted Text - Full Width */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-zinc-400">Extracted Text:</h3>
              <div className="bg-zinc-950 border border-zinc-700 rounded p-3 overflow-auto h-[300px] whitespace-pre-wrap font-mono text-xs text-zinc-300">
                {ocrData.text || "No text extracted"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-800 rounded-md">
            <p className="text-zinc-500">No OCR data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
