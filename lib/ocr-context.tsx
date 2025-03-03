"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { pipe, type OCRContent, type ContentItem } from "@screenpipe/browser";

// Define the shape of our context
interface OcrContextType {
  ocrData: OCRContent | null;
  isLoading: boolean;
  error: string | null;
  fetchLatestOCR: () => Promise<void>;
}

// Create the context with default values
const OcrContext = createContext<OcrContextType>({
  ocrData: null,
  isLoading: false,
  error: null,
  fetchLatestOCR: async () => {},
});

// Hook to use the OCR context
export const useOcr = () => useContext(OcrContext);

// Provider component
export function OcrProvider({ children }: { children: React.ReactNode }) {
  const [ocrData, setOcrData] = useState<OCRContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestOCR = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching latest OCR data...");
      
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
        contentType: "ocr",
        limit: 1,
      });
      
      // Restore original console.error
      console.error = originalConsoleError;
      
      if (!result || !result.data || result.data.length === 0) {
        console.log("No OCR data found");
        throw new Error("No OCR data available");
      }
      
      const item = result.data[0] as ContentItem & { type: "OCR" };
      console.log("Got OCR data:", item.content);
      setOcrData(item.content);
    } catch (error) {
      console.error("Error fetching OCR:", error);
      const errorMessage = error instanceof Error 
        ? error.message
        : "Failed to fetch OCR data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch OCR data when component mounts
  useEffect(() => {
    fetchLatestOCR();
  }, []);

  // Create the value object to be provided
  const contextValue: OcrContextType = {
    ocrData,
    isLoading,
    error,
    fetchLatestOCR,
  };

  return (
    <OcrContext.Provider value={contextValue}>
      {children}
    </OcrContext.Provider>
  );
}
