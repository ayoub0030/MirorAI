import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// In-memory storage for transcripts
// In a production app, you would use a database
interface TranscriptEntry {
  videoId: string;
  transcript: string;
  fetchedAt: string;
  source?: 'youtube-transcript' | 'supadata';
}

// Global variable to store transcripts in memory
// Note: This will be reset when the server restarts
let transcriptStore: Record<string, TranscriptEntry> = {};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    const useSupadata = url.searchParams.get('useSupadata') === 'true';

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check if we already have the transcript stored and not forcing refresh
    if (transcriptStore[videoId] && !forceRefresh) {
      return NextResponse.json({
        success: true,
        data: transcriptStore[videoId],
      });
    }

    // Determine which method to use to fetch the transcript
    let transcriptData;
    let source: 'youtube-transcript' | 'supadata' = 'youtube-transcript';
    
    if (useSupadata) {
      // Use Supadata API to fetch transcript
      const supadataApiKey = process.env.SUPADATA_API_KEY;
      
      if (!supadataApiKey || supadataApiKey === 'your_supadata_api_key_here') {
        return NextResponse.json(
          { success: false, error: 'Supadata API key is not configured' },
          { status: 400 }
        );
      }
      
      const supadataResponse = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
        {
          headers: {
            'x-api-key': supadataApiKey
          }
        }
      );
      
      if (!supadataResponse.ok) {
        throw new Error(`Supadata API error: ${supadataResponse.status}`);
      }
      
      const supadataData = await supadataResponse.json();
      
      if (supadataData && supadataData.transcript) {
        // Format might differ based on the actual API response
        transcriptData = supadataData.transcript;
        source = 'supadata';
      } else {
        throw new Error('Failed to get transcript from Supadata API');
      }
    } else {
      // Use youtube-transcript package
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptData || transcriptData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No transcript found for this video' },
          { status: 404 }
        );
      }
    }

    // Process the transcript data into a single string
    let fullTranscript = '';
    
    if (source === 'youtube-transcript') {
      // youtube-transcript returns an array of segments
      fullTranscript = transcriptData
        .map((item: any) => item.text)
        .join(' ');
    } else {
      // Supadata might return a different format
      // Adjust this based on the actual API response
      fullTranscript = typeof transcriptData === 'string' 
        ? transcriptData 
        : JSON.stringify(transcriptData);
    }

    // Store the transcript
    const transcriptEntry: TranscriptEntry = {
      videoId,
      transcript: fullTranscript,
      fetchedAt: new Date().toISOString(),
      source
    };

    transcriptStore[videoId] = transcriptEntry;

    return NextResponse.json({
      success: true,
      data: transcriptEntry,
    });
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// Endpoint to get all stored transcripts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clear') {
      // Clear all stored transcripts
      transcriptStore = {};
      return NextResponse.json({
        success: true,
        message: 'All transcripts cleared',
      });
    }

    // Get all stored transcripts
    return NextResponse.json({
      success: true,
      data: Object.values(transcriptStore),
    });
  } catch (error) {
    console.error('Error processing transcript store request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
