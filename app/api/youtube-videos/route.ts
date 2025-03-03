import { NextRequest, NextResponse } from 'next/server';
import { pipe } from '@screenpipe/js';
import { extractVideoId, fetchVideoDetails, YouTubeVideoDetails } from '@/services/youtube-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startTime = searchParams.get('startTime');
  const limit = searchParams.get('limit') || '10';
  const videoId = searchParams.get('videoId');
  const channelName = searchParams.get('channelName');
  const specificUrl = searchParams.get('specificUrl');

  try {
    // Build query parameters for Screenpipe
    const queryParams: any = {
      contentType: "ocr",
      limit: parseInt(limit, 10) * 5, // Request more data as we need to filter for YouTube URLs
      startTime: startTime || undefined,
      appName: "chrome", // Assuming YouTube is accessed via Chrome
    };

    // If specific filtering is requested, apply it
    if (videoId) {
      queryParams.browserUrl = `youtube.com/watch?v=${videoId}`;
    } else if (channelName) {
      queryParams.browserUrl = `youtube.com/channel`;
      queryParams.windowName = channelName;
    } else if (specificUrl) {
      queryParams.browserUrl = specificUrl;
    } else {
      queryParams.browserUrl = "youtube.com";
    }

    // Query Screenpipe for data
    const results = await pipe.queryScreenpipe(queryParams);
    
    if (!results || !results.data || results.data.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Extract YouTube URLs from OCR data
    const youtubeUrls = new Set<string>();
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|shorts\/|embed\/|v\/)?([^&\s?#/]+)/gi;
    
    results.data.forEach(item => {
      if (item.type === "OCR" && item.content?.text) {
        const text = item.content.text;
        let match;
        
        // Find all YouTube URLs in the OCR text
        while ((match = urlRegex.exec(text)) !== null) {
          const fullUrl = match[0];
          if (fullUrl.includes('youtube.com') || fullUrl.includes('youtu.be')) {
            // Ensure URL is properly formatted
            let url = fullUrl;
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            youtubeUrls.add(url);
          }
        }
      }
    });

    // If no YouTube URLs were found, return empty result
    if (youtubeUrls.size === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    // Extract video IDs from URLs
    const videoIds: string[] = [];
    youtubeUrls.forEach(url => {
      const videoId = extractVideoId(url);
      if (videoId) videoIds.push(videoId);
    });

    // Fetch video details from YouTube API
    const videoDetails = await fetchVideoDetails(videoIds);

    // Create enriched video data with both YouTube API details and Screenpipe timestamps
    const enrichedVideos = videoDetails.map(video => {
      // Find OCR items that mention this video to get timestamps
      const matchingOcrItems = results.data.filter(item => 
        item.type === "OCR" && 
        item.content?.text && 
        item.content.text.includes(video.videoId)
      );

      // Use the latest timestamp if available
      const latestItem = matchingOcrItems.sort((a, b) => {
        const dateA = new Date(a.content.timestamp).getTime();
        const dateB = new Date(b.content.timestamp).getTime();
        return dateB - dateA;
      })[0];

      return {
        ...video,
        // Add Screenpipe metadata if available
        viewedAt: latestItem?.content.timestamp || new Date().toISOString(),
        appName: latestItem?.content.app_name || 'chrome',
        windowName: latestItem?.content.window_name || '',
        frameId: latestItem?.content.frame_id
      };
    });

    // Sort videos by viewed timestamp (latest first) and limit
    const sortedVideos = enrichedVideos
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, parseInt(limit, 10));

    return NextResponse.json({ 
      success: true, 
      data: sortedVideos 
    });
  } catch (error) {
    console.error('Error processing YouTube data:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
