"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TranscriptEntry, transcriptStore } from "@/services/transcript-store";
import { Send, Bot, User, Loader2, Info, X, AlertCircle, FileText, Trash2, RefreshCw, Video } from "lucide-react";
import { streamGeminiResponse } from "@/services/gemini-ai";
import { VideoGenerationForm } from "./video-generation-form";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

interface VideoSelectionEntry extends TranscriptEntry {
  selected: boolean;
  title?: string;
}

export function MultiVideoChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [storedVideos, setStoredVideos] = useState<VideoSelectionEntry[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load stored transcripts when component mounts
  useEffect(() => {
    const allTranscripts = transcriptStore.getAllTranscripts();
    
    // Convert to selection entries
    const videoEntries: VideoSelectionEntry[] = allTranscripts.map(transcript => ({
      ...transcript,
      selected: false,
      title: `Video ${transcript.videoId}`
    }));
    
    setStoredVideos(videoEntries);
  }, []);

  // Add system welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your multi-video transcript analyst. First, select up to 3 videos to analyze, then ask me any questions about them.",
        },
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input field when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    // Find if the video is already selected
    const isCurrentlySelected = selectedVideos.includes(videoId);
    
    if (isCurrentlySelected) {
      // Remove the video from selected list
      setSelectedVideos(prev => prev.filter(id => id !== videoId));
    } else {
      // Add the video to selected list if less than 3 videos are selected
      if (selectedVideos.length < 3) {
        setSelectedVideos(prev => [...prev, videoId]);
      }
    }
    
    // Update the stored videos selection state
    setStoredVideos(prev => 
      prev.map(video => 
        video.videoId === videoId 
          ? { ...video, selected: !isCurrentlySelected } 
          : video
      )
    );
  };

  // Get combined transcript content from selected videos
  const getCombinedTranscriptContext = () => {
    const selectedTranscripts = storedVideos.filter(video => 
      selectedVideos.includes(video.videoId)
    );
    
    // Create a combined transcript with separators
    let combinedTranscript = "";
    const videoTitles: string[] = [];
    
    selectedTranscripts.forEach((transcript, index) => {
      // Add separators between transcripts
      if (index > 0) {
        combinedTranscript += "\n\n===== NEXT VIDEO =====\n\n";
      }
      
      combinedTranscript += `VIDEO ${index + 1} (ID: ${transcript.videoId}):\n${transcript.transcript}`;
      videoTitles.push(transcript.title || `Video ${transcript.videoId}`);
    });
    
    return {
      videoId: selectedVideos.join(','),
      videoTitle: videoTitles.join(', '),
      transcript: combinedTranscript
    };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading || selectedVideos.length === 0) return;
    
    const userMessage = input.trim();
    setInput("");
    
    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", isStreaming: true },
    ]);
    
    setLoading(true);
    setApiKeyError(false);
    
    // Create a combined transcript context
    const transcriptContext = getCombinedTranscriptContext();
    
    // Current assistant message index
    const assistantMessageIndex = messages.length + 1; // +1 for the just added user message
    
    // Stream the response
    try {
      let accumulatedResponse = "";
      let isApiKeyError = false;
      
      await streamGeminiResponse(
        transcriptContext,
        userMessage,
        (chunk) => {
          // Check if it's an API key error
          if (chunk.includes("Gemini API key is not configured") || chunk.includes("API key not valid")) {
            isApiKeyError = true;
            setApiKeyError(true);
          }
          
          accumulatedResponse += chunk;
          
          setMessages((prev) => {
            const updated = [...prev];
            updated[assistantMessageIndex] = {
              role: "assistant",
              content: accumulatedResponse,
              isStreaming: true,
              isError: isApiKeyError
            };
            return updated;
          });
        }
      );
      
      // Complete the streaming
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: "assistant",
          content: accumulatedResponse,
          isStreaming: false,
          isError: apiKeyError
        };
        return updated;
      });
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      const isApiKeyError = errorMessage.includes("Gemini API key") || errorMessage.includes("API key");
      
      if (isApiKeyError) {
        setApiKeyError(true);
      }
      
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: "assistant",
          content: isApiKeyError 
            ? "Gemini API key is not configured or invalid. Please check your .env file and restart the server."
            : "Sorry, I encountered an error while analyzing the transcripts. Please try again.",
          isStreaming: false,
          isError: true
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle video generation
  const handleGenerateVideo = () => {
    if (selectedVideos.length === 0) return;
    setShowVideoGenerator(true);
  };

  // Close video generator
  const closeVideoGenerator = () => {
    setShowVideoGenerator(false);
  };

  // Clear the chat history
  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat history cleared. What would you like to know about the selected videos?",
      },
    ]);
  };

  // Refresh the transcript list
  const refreshTranscriptList = () => {
    const allTranscripts = transcriptStore.getAllTranscripts();
    
    // Preserve selection state when refreshing
    const updatedEntries = allTranscripts.map(transcript => {
      const isSelected = selectedVideos.includes(transcript.videoId);
      return {
        ...transcript,
        selected: isSelected,
        title: `Video ${transcript.videoId}`
      };
    });
    
    setStoredVideos(updatedEntries);
  };

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden bg-white mt-6">
      <div className="grid grid-cols-1 md:grid-cols-4">
        {/* Video Selector Panel */}
        <div className="border-r bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700">Stored Transcripts</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshTranscriptList}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {storedVideos.length === 0 ? (
            <div className="text-sm text-slate-500 p-3 bg-white rounded border text-center">
              No video transcripts available. View transcripts for videos first.
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {storedVideos.map((video) => (
                <div 
                  key={video.videoId}
                  className={`p-3 rounded border flex items-start gap-2 transition-colors ${
                    video.selected ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <Checkbox 
                    id={`video-${video.videoId}`}
                    checked={video.selected}
                    onCheckedChange={() => toggleVideoSelection(video.videoId)}
                    disabled={!video.selected && selectedVideos.length >= 3}
                  />
                  <div className="flex-1 min-w-0">
                    <label 
                      htmlFor={`video-${video.videoId}`}
                      className="block text-sm font-medium mb-1 cursor-pointer"
                    >
                      {video.title || `Video ${video.videoId}`}
                    </label>
                    <div className="flex items-center text-xs text-slate-500">
                      <FileText className="h-3 w-3 mr-1" />
                      <span className="truncate">{video.videoId}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(video.fetchedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 text-xs text-slate-600 flex items-center">
            <Info className="h-3.5 w-3.5 mr-1 text-blue-600" />
            <p>Select up to 3 videos for multi-transcript analysis</p>
          </div>
        </div>
        
        {/* Chat Interface */}
        <div className="col-span-3 flex flex-col h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-3 bg-slate-50">
            <div className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-blue-600" />
              <h3 className="font-medium">Multi-Video Analysis</h3>
              <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                Gemini AI
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                disabled={messages.length <= 1}
                className="h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Chat
              </Button>
            </div>
          </div>
          
          {/* Video selection info */}
          <div className={`p-2 text-xs border-b flex items-start ${
            selectedVideos.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
          }`}>
            <Info className="h-4 w-4 mr-1 mt-0.5 shrink-0" />
            {selectedVideos.length > 0 ? (
              <span>
                Analyzing <strong>{selectedVideos.length}</strong> selected videos:
                <ul className="mt-1 list-disc list-inside">
                  {storedVideos
                    .filter(v => v.selected)
                    .map(v => (
                      <li key={v.videoId} className="truncate">
                        {v.title || v.videoId}
                      </li>
                    ))
                  }
                </ul>
              </span>
            ) : (
              <span>Please select videos on the left to begin analysis.</span>
            )}
          </div>

          {/* API Key Error Banner */}
          {apiKeyError && (
            <div className="bg-red-50 p-2 text-xs text-red-700 flex items-start border-b">
              <AlertCircle className="h-4 w-4 mr-1 mt-0.5 shrink-0" />
              <div>
                <strong>Gemini API Key Issue:</strong> Your Gemini API key is either missing or invalid. 
                <ul className="list-disc list-inside mt-1">
                  <li>Check that GEMINI_API_KEY is set correctly in your .env file</li>
                  <li>Make sure the API key format is correct</li>
                  <li>Restart your development server after making changes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[90%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : message.isError 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    {message.role === 'user' ? (
                      <>
                        <span className="font-medium">You</span>
                        <User className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-1" />
                        <span className="font-medium">AI Assistant</span>
                      </>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none break-words">
                    {message.isStreaming && message.content.length === 0 ? (
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse ml-1" style={{ animationDelay: '300ms' }}></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse ml-1" style={{ animationDelay: '600ms' }}></div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder={
                  selectedVideos.length === 0 
                    ? "First, select videos on the left..." 
                    : "Ask a question about the selected videos..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={loading || selectedVideos.length === 0}
              />
              <Button 
                type="submit" 
                disabled={loading || !input.trim() || selectedVideos.length === 0}
                className="shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={handleGenerateVideo}
                disabled={selectedVideos.length === 0 || loading}
                variant="outline"
                className="shrink-0"
              >
                <Video className="mr-2 h-4 w-4" />
                Generate Video
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Video Generator (shown below chat when active) */}
      {showVideoGenerator && (
        <VideoGenerationForm 
          transcriptContext={getCombinedTranscriptContext()}
          onClose={closeVideoGenerator}
        />
      )}
    </div>
  );
}
