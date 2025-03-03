/**
 * YouTube API Service
 * 
 * This service provides functions to interact with the YouTube Data API v3.
 * It is used to fetch detailed information about YouTube videos based on their IDs.
 */

// Get API key from environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Extract video ID from YouTube URL
 * @param url YouTube URL in various formats
 * @returns Video ID or null if not found
 */
export function extractVideoId(url: string): string | null {
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#/]+)/i,
    /youtube\.com\/embed\/([^&\s?#/]+)/i,
    /youtube\.com\/v\/([^&\s?#/]+)/i,
    /youtube\.com\/shorts\/([^&\s?#/]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Interface for YouTube video details
 */
export interface YouTubeVideoDetails {
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
}

/**
 * Fetch detailed information for multiple YouTube videos
 * @param videoIds Array of YouTube video IDs
 * @returns Array of video details
 */
export async function fetchVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not found in environment variables');
    return [];
  }

  // Deduplicate video IDs
  const uniqueVideoIds = [...new Set(videoIds)];
  
  if (uniqueVideoIds.length === 0) {
    return [];
  }

  try {
    // First, get basic details for the videos
    const videoDetailsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${uniqueVideoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!videoDetailsResponse.ok) {
      throw new Error(`YouTube API error: ${videoDetailsResponse.statusText}`);
    }
    
    const videoData = await videoDetailsResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      return [];
    }
    
    return videoData.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      viewCount: item.statistics?.viewCount,
      likeCount: item.statistics?.likeCount,
      duration: item.contentDetails?.duration,
      url: `https://www.youtube.com/watch?v=${item.id}`
    }));
  } catch (error) {
    console.error('Error fetching YouTube video details:', error);
    return [];
  }
}

/**
 * Fetch details for a single YouTube video
 * @param videoId YouTube video ID
 * @returns Video details or null if not found
 */
export async function fetchSingleVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null> {
  const details = await fetchVideoDetails([videoId]);
  return details.length > 0 ? details[0] : null;
}
