"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TranscriptEntry } from "@/services/transcript-store";
import { Send, Bot, User, Loader2, Info, X, AlertCircle } from "lucide-react";
import { streamGeminiResponse } from "@/services/gemini-ai";

interface TranscriptChatProps {
  transcript: TranscriptEntry | null;
  videoTitle?: string;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export function TranscriptChat({ transcript, videoTitle, onClose }: TranscriptChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add system welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hello! I'm your video transcript analyst. I can answer questions about "${videoTitle || 'this video'}" based on its transcript. What would you like to know?`,
        },
      ]);
    }
  }, [videoTitle, messages.length]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input field when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading || !transcript) return;
    
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
    
    // Create a transcript context object
    const transcriptContext = {
      videoId: transcript.videoId,
      videoTitle: videoTitle,
      transcript: transcript.transcript,
    };
    
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
            : "Sorry, I encountered an error while analyzing the transcript. Please try again.",
          isStreaming: false,
          isError: true
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };
  
  // If no transcript is available, show a placeholder
  if (!transcript) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg text-center">
        <p className="text-slate-600">No transcript selected. Please select a video to analyze its transcript.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg shadow-sm overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3 bg-slate-50">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-blue-600" />
          <h3 className="font-medium">Transcript Analyst</h3>
          <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            Gemini AI
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Video context info */}
      <div className="bg-blue-50 p-2 text-xs text-blue-700 flex items-start border-b">
        <Info className="h-4 w-4 mr-1 mt-0.5 shrink-0" />
        <span>
          Analyzing: <strong>{videoTitle || transcript.videoId}</strong>
          <br />
          Transcript length: {transcript.transcript.length.toLocaleString()} characters
        </span>
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

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.role === "assistant"
                  ? message.isError 
                    ? "bg-red-50 text-red-800 border border-red-200" 
                    : "bg-slate-100 text-slate-800"
                  : "bg-blue-600 text-white"
              } rounded-lg p-3 space-x-2`}
            >
              <div className="shrink-0 mt-0.5">
                {message.role === "assistant" ? (
                  message.isError ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.isStreaming && (
                  <div className="h-4 flex items-center">
                    <span className="animate-pulse">•</span>
                    <span className="animate-pulse delay-100">•</span>
                    <span className="animate-pulse delay-200">•</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-2 border-t">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the video transcript..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
