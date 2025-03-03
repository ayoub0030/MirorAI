"use client";

import { useState, useEffect } from "react";
import { transcriptStore, TranscriptEntry } from "@/services/transcript-store";
import { Button } from "@/components/ui/button";
import { Clipboard, X, PlayCircle, Download, RefreshCw, MessageSquare } from "lucide-react";
import { TranscriptChat } from "@/components/transcript-chat";

interface TranscriptViewerProps {
  videoId: string | null;
  videoTitle?: string;
  onClose: () => void;
}

export function TranscriptViewer({ videoId, videoTitle, onClose }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSupadata, setUseSupadata] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    const fetchTranscript = async () => {
      setLoading(true);
      setError(null);
      try {
        // Check if we already have this transcript
        let storedTranscript = transcriptStore.getTranscript(videoId);
        
        if (!storedTranscript) {
          // Fetch it if we don't have it
          storedTranscript = await transcriptStore.fetchAndStoreTranscript(videoId, {
            useSupadata
          });
        }
        
        setTranscript(storedTranscript);
      } catch (err) {
        console.error("Error fetching transcript:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch transcript");
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [videoId, useSupadata]);

  const refreshTranscript = async () => {
    if (!videoId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const refreshedTranscript = await transcriptStore.fetchAndStoreTranscript(
        videoId,
        {
          forceRefresh: true,
          useSupadata
        }
      );
      setTranscript(refreshedTranscript);
    } catch (err) {
      console.error("Error refreshing transcript:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh transcript");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (transcript?.transcript) {
      navigator.clipboard.writeText(transcript.transcript)
        .then(() => {
          alert("Transcript copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy:", err);
        });
    }
  };

  const downloadTranscript = () => {
    if (!transcript?.transcript) return;
    
    const blob = new Blob([transcript.transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!videoId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-medium flex items-center">
            <PlayCircle className="h-5 w-5 mr-2 text-red-600" />
            {videoTitle ? `Transcript: ${videoTitle}` : `Transcript for Video ID: ${videoId}`}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between border-b px-4 py-2 bg-slate-50">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-500">
              {transcript && (
                <span>
                  Fetched: {new Date(transcript.fetchedAt).toLocaleString()}
                  {transcript.source && ` (Source: ${transcript.source})`}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-700">API:</label>
              <select
                className="text-xs border rounded px-2 py-1 bg-white"
                value={useSupadata ? 'supadata' : 'youtube-transcript'}
                onChange={(e) => setUseSupadata(e.target.value === 'supadata')}
                disabled={loading}
              >
                <option value="youtube-transcript">YouTube-Transcript</option>
                <option value="supadata">Supadata</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTranscript}
                disabled={loading}
                className="text-xs h-7"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={showChat ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowChat(!showChat)}
              disabled={!transcript || loading}
              className={`text-xs ${showChat ? "bg-blue-50 text-blue-700" : ""}`}
            >
              <MessageSquare className="h-3 w-3 mr-1" /> 
              {showChat ? "Hide Analysis" : "Analyze with Gemini AI"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={!transcript || loading}
              className="text-xs"
            >
              <Clipboard className="h-3 w-3 mr-1" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTranscript}
              disabled={!transcript || loading}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          {/* Transcript text on the left */}
          <div className={`${showChat ? "w-1/2 border-r" : "w-full"} overflow-y-auto transition-all duration-300`}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4 m-4 text-red-700">
                <p className="font-medium">Error fetching transcript</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : transcript ? (
              <div className="whitespace-pre-wrap text-sm p-4">
                {transcript.transcript}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Select a video to view its transcript
              </div>
            )}
          </div>
          
          {/* Chat interface on the right */}
          {showChat && (
            <div className="w-1/2 overflow-hidden p-4">
              <TranscriptChat
                transcript={transcript}
                videoTitle={videoTitle}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
