"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Copy } from "lucide-react";
import { useOcr } from "@/lib/ocr-context";

// Interfaces for the chat
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-filled with the provided API key
  const [apiKey, setApiKey] = useState("AIzaSyC0k-4lxIKseor_rz3_zDgmIq5PeM7gVqw");
  
  // Get OCR data from context
  const { ocrData, isLoading: isOcrLoading } = useOcr();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Get the current context from OCR data
  const getOcrContext = () => {
    if (!ocrData) return "No OCR data available yet.";
    
    return `The following is text extracted from OCR:
Application: ${ocrData.appName || "Unknown"}
Window: ${ocrData.windowName || "Unknown"}
Timestamp: ${new Date(ocrData.timestamp).toLocaleString()}

EXTRACTED TEXT:
${ocrData.text || "No text extracted"}

Please analyze this OCR extracted text to answer the following question:`;
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    if (!apiKey) {
      setError("Please set your Gemini API key first.");
      return;
    }
    
    // Add user message to chat
    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare context and user message
      const context = getOcrContext();
      const fullPrompt = `${context}\n\n${inputMessage}`;
      
      // Call Gemini API - updated to use the latest endpoint without system role
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user", 
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error contacting Gemini API");
      }
      
      const data = await response.json();
      
      // Extract assistant's response
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        
        const assistantResponse = data.candidates[0].content.parts[0].text;
        
        // Add assistant message to chat
        const assistantMessage: Message = {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date(),
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      console.error("Error calling Gemini API:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (but not with Shift+Enter which allows for new lines)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleSetApiKey = () => {
    const key = prompt("Please enter your Gemini API key:", apiKey);
    if (key) {
      setApiKey(key);
      setError(null);
    }
  };
  
  const copyOcrToClipboard = () => {
    if (ocrData?.text) {
      navigator.clipboard.writeText(ocrData.text)
        .then(() => {
          alert("OCR text copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy OCR text:", err);
        });
    }
  };
  
  useEffect(() => {
    // Add a welcome message when the component loads
    if (messages.length === 0) {
      setMessages([
        {
          role: "system",
          content: "OCR context initialized",
          timestamp: new Date(),
        },
        {
          role: "assistant",
          content: "Hello! I'm Gemini AI. I have access to the OCR text from your screen. Ask me anything about it!",
          timestamp: new Date(),
        }
      ]);
    }
  }, []);
  
  // Update system context message when OCR data changes
  useEffect(() => {
    if (ocrData && messages.length > 0) {
      // Add a system message about the updated OCR data
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: "system",
          content: "OCR data has been updated",
          timestamp: new Date(),
        }
      ]);
    }
  }, [ocrData]);
  
  return (
    <div className="w-full max-w-5xl mx-auto mt-6 px-4 mb-10">
      <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-700 p-4 h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Chat with Gemini about OCR</h2>
          <div className="flex gap-2">
            <Button
              onClick={copyOcrToClipboard}
              size="sm"
              variant="outline"
              disabled={!ocrData?.text}
              className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-1" /> Copy OCR
            </Button>
            <Button 
              onClick={handleSetApiKey}
              size="sm"
              variant="outline"
              className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Update API Key
            </Button>
          </div>
        </div>
        
        {/* OCR Status */}
        {isOcrLoading && (
          <div className="bg-blue-900/30 text-blue-300 p-2 rounded-md mb-3 text-sm">
            <p>Loading OCR data...</p>
          </div>
        )}
        
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 bg-zinc-800 rounded-md p-2">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <p>No messages yet. Start chatting with Gemini!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${
                    message.role === "user" 
                      ? "justify-end" 
                      : message.role === "system" 
                        ? "justify-center" 
                        : "justify-start"
                  }`}
                >
                  <div 
                    className={`${
                      message.role === "user" 
                        ? "bg-blue-900 text-blue-100 max-w-[70%]" 
                        : message.role === "system" 
                          ? "bg-zinc-700 text-zinc-300 max-w-[90%] px-3 py-1 text-xs" 
                          : "bg-zinc-950/50 border border-zinc-700 text-zinc-200 max-w-[70%]"
                    } px-4 py-2 rounded-lg`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.role !== "system" && (
                      <div className="text-xs text-right mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 text-red-300 p-2 rounded-md mb-3 text-sm">
            <p>{error}</p>
          </div>
        )}
        
        {/* Input area */}
        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the OCR text..."
            className="resize-none bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
            disabled={isLoading || !apiKey}
          />
          <Button 
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim() || !apiKey}
            className="h-auto bg-blue-700 hover:bg-blue-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
