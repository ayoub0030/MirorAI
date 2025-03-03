import { NextRequest, NextResponse } from 'next/server';
import { getGeminiResponse } from '@/services/gemini-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, videoTitle, transcript, query } = body;

    if (!videoId || !transcript || !query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: videoId, transcript, and query are required' 
        },
        { status: 400 }
      );
    }

    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Gemini API key is not configured. Please add it to your .env file.' 
        },
        { status: 400 }
      );
    }

    // Get response from Gemini
    const response = await getGeminiResponse(
      {
        videoId,
        videoTitle,
        transcript
      },
      query
    );

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing Gemini chat request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
