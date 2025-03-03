"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Search, ThumbsUp, Eye, Clock, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { formatDistance, format } from "date-fns";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { transcriptStore } from "@/services/transcript-store";
import { MultiVideoChat } from "@/components/multi-video-chat";

// Safely import Image with a fallback
const ImageComponent = dynamic(
  () => import('next/image').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => <div className="w-[100px] h-[56px] bg-muted flex items-center justify-center">Loading...</div>,
  }
);

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount?: string;
  likeCount?: string;
  duration?: string;
  url: string;
  viewedAt: string;
  appName?: string;
  windowName?: string;
  frameId?: number;
}

interface FilterOptions {
  videoId?: string;
  channelName?: string;
  specificUrl?: string;
}

// Format large numbers with commas
function formatNumber(num: string | undefined): string {
  if (!num) return '-';
  return parseInt(num).toLocaleString();
}

// Format ISO8601 duration to human-readable format
function formatDuration(duration: string | undefined): string {
  if (!duration) return '-';
  
  // Parse PT1H2M3S format (ISO 8601 duration)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export function YouTubeVideosTable({ 
  sessionStartTime,
  limit = 10
}: { 
  sessionStartTime?: string;
  limit?: number;
}) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [filterInput, setFilterInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "videoId" | "channelName" | "specificUrl">("all");
  
  // State for transcript viewing
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [hasTranscript, setHasTranscript] = useState<Record<string, boolean>>({});

  // Check which videos have transcripts stored
  useEffect(() => {
    const transcripts = transcriptStore.getAllTranscripts();
    const transcriptMap: Record<string, boolean> = {};
    
    transcripts.forEach(transcript => {
      transcriptMap[transcript.videoId] = true;
    });
    
    setHasTranscript(transcriptMap);
  }, [selectedVideoId]);

  const fetchYouTubeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the API route
      const params = new URLSearchParams();
      if (sessionStartTime) params.append('startTime', sessionStartTime);
      if (limit) params.append('limit', limit.toString());
      
      // Add any active filters
      if (filters.videoId) params.append('videoId', filters.videoId);
      if (filters.channelName) params.append('channelName', filters.channelName);
      if (filters.specificUrl) params.append('specificUrl', filters.specificUrl);
      
      const response = await fetch(`/api/youtube-videos?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch YouTube data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setVideos(result.data);
      } else {
        setVideos([]);
      }
    } catch (err) {
      console.error("Error fetching YouTube data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Select a video and fetch its transcript
  const selectVideo = (videoId: string, videoTitle: string) => {
    setSelectedVideoId(videoId);
    setSelectedVideoTitle(videoTitle);
  };

  // Close the transcript viewer
  const closeTranscriptViewer = () => {
    setSelectedVideoId(null);
    setSelectedVideoTitle("");
  };

  // Apply a filter
  const applyFilter = () => {
    const newFilters: FilterOptions = {};
    
    if (activeFilter === "videoId") {
      newFilters.videoId = filterInput;
    } else if (activeFilter === "channelName") {
      newFilters.channelName = filterInput;
    } else if (activeFilter === "specificUrl") {
      newFilters.specificUrl = filterInput;
    }
    
    setFilters(newFilters);
    fetchYouTubeData();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setFilterInput("");
    setActiveFilter("all");
    fetchYouTubeData();
  };

  useEffect(() => {
    fetchYouTubeData();
  }, [sessionStartTime, limit]);

  return (
    <div className="w-full space-y-4">
      {/* Transcript viewer modal */}
      {selectedVideoId && (
        <TranscriptViewer 
          videoId={selectedVideoId} 
          videoTitle={selectedVideoTitle}
          onClose={closeTranscriptViewer} 
        />
      )}
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">YouTube Videos</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchYouTubeData} 
          disabled={loading}
          className="shadow-sm"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="p-2 border rounded-md text-sm shadow-sm"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as any)}
        >
          <option value="all">All Videos</option>
          <option value="videoId">Filter by Video ID</option>
          <option value="channelName">Filter by Channel</option>
          <option value="specificUrl">Filter by Specific URL</option>
        </select>
        
        {activeFilter !== "all" && (
          <>
            <input
              type="text"
              className="p-2 border rounded-md flex-1 text-sm shadow-sm"
              placeholder={
                activeFilter === "videoId" ? "Enter video ID (e.g., dQw4w9WgXcQ)" :
                activeFilter === "channelName" ? "Enter channel name" :
                "Enter specific URL (e.g., youtube.com/watch?v=...)"
              }
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
            />
            
            <Button
              variant="default"
              size="sm"
              onClick={applyFilter}
              disabled={loading || !filterInput}
              className="shadow-sm"
            >
              <Search className="h-4 w-4 mr-1" /> Apply Filter
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={loading}
              className="shadow-sm"
            >
              Clear Filters
            </Button>
          </>
        )}
      </div>

      {/* Stored Transcripts Summary */}
      <div className="text-sm text-slate-500 mb-2">
        {Object.keys(hasTranscript).length > 0 && (
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1 text-green-600" />
            <span>{Object.keys(hasTranscript).length} video transcripts stored</span>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="rounded-md border shadow-sm">
          <div className="overflow-x-auto">
            {videos.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center text-muted-foreground">
                No YouTube videos found in recent screen captures
                {Object.keys(filters).length > 0 && " with the current filters"}
              </div>
            ) : (
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-slate-700 w-[100px]">Thumbnail</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Channel</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 w-[90px]">
                      <div className="flex items-center justify-center">
                        <Eye className="h-4 w-4 mr-1" />
                        Views
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 w-[90px]">
                      <div className="flex items-center justify-center">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Likes
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 w-[110px]">
                      <div className="flex items-center justify-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Date
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 w-[240px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video, index) => (
                    <tr 
                      key={video.videoId} 
                      className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      {/* Thumbnail Column */}
                      <td className="px-4 py-3 align-middle border-b border-slate-100">
                        <div className="relative w-[100px] h-[56px] overflow-hidden rounded-md">
                          {video.thumbnailUrl ? (
                            <div className="w-full h-full relative">
                              <ImageComponent 
                                src={video.thumbnailUrl} 
                                alt={video.title}
                                fill
                                className="object-cover"
                                sizes="100px"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              No Thumbnail
                            </div>
                          )}
                          {video.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                              {formatDuration(video.duration)}
                            </div>
                          )}
                          {hasTranscript[video.videoId] && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px] flex items-center">
                              <FileText className="h-2 w-2 mr-0.5" />
                              <span>TS</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Title Column */}
                      <td className="px-4 py-3 border-b border-slate-100">
                        <Link 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium hover:text-blue-600 transition-colors block line-clamp-2 text-sm"
                        >
                          {video.title}
                        </Link>
                      </td>
                      
                      {/* Channel Column */}
                      <td className="px-4 py-3 border-b border-slate-100">
                        <span className="text-sm text-slate-600">{video.channelTitle}</span>
                      </td>
                      
                      {/* Views Column */}
                      <td className="px-4 py-3 text-center border-b border-slate-100">
                        <span className="text-sm text-slate-600">{formatNumber(video.viewCount)}</span>
                      </td>
                      
                      {/* Likes Column */}
                      <td className="px-4 py-3 text-center border-b border-slate-100">
                        <span className="text-sm text-slate-600">{formatNumber(video.likeCount)}</span>
                      </td>
                      
                      {/* Date Column */}
                      <td className="px-4 py-3 text-center border-b border-slate-100">
                        <span className="text-sm text-slate-600">
                          {video.publishedAt 
                            ? format(new Date(video.publishedAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </td>
                      
                      {/* Actions Column */}
                      <td className="px-4 py-3 text-right border-b border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open(video.url, '_blank')}
                            className="shadow-sm h-8 px-3"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Watch
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveFilter("videoId");
                              setFilterInput(video.videoId);
                              setFilters({ videoId: video.videoId });
                              fetchYouTubeData();
                            }}
                            className="shadow-sm h-8 px-3"
                          >
                            Select
                          </Button>
                          <Button
                            variant={hasTranscript[video.videoId] ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => selectVideo(video.videoId, video.title)}
                            className={`shadow-sm h-8 px-3 ${hasTranscript[video.videoId] ? "bg-green-50" : ""}`}
                          >
                            <FileText className={`h-3 w-3 mr-1 ${hasTranscript[video.videoId] ? "text-green-600" : ""}`} /> 
                            Transcript
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Multi-Video Chat Section */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Multi-Video Analysis</h3>
        <p className="text-sm text-slate-600 mb-4">
          Select up to 3 videos from the table above by using their transcript buttons, then analyze them together with Gemini AI.
        </p>
        <MultiVideoChat />
      </div>
    </div>
  );
}
