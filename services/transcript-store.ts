/**
 * Service for managing YouTube video transcripts
 */

export interface TranscriptEntry {
  videoId: string;
  transcript: string;
  fetchedAt: string;
  source?: 'youtube-transcript' | 'supadata';
}

export interface TranscriptFetchOptions {
  forceRefresh?: boolean;
  useSupadata?: boolean;
}

// Class to manage transcripts with localStorage persistence
export class TranscriptStore {
  private static readonly STORAGE_KEY = 'youtube_transcripts';
  private static instance: TranscriptStore;
  private transcripts: Record<string, TranscriptEntry> = {};

  private constructor() {
    this.loadFromStorage();
  }

  // Singleton pattern
  public static getInstance(): TranscriptStore {
    if (!TranscriptStore.instance) {
      TranscriptStore.instance = new TranscriptStore();
    }
    return TranscriptStore.instance;
  }

  // Load transcripts from localStorage
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem(TranscriptStore.STORAGE_KEY);
      if (storedData) {
        try {
          this.transcripts = JSON.parse(storedData);
        } catch (error) {
          console.error('Error parsing transcript data from localStorage:', error);
          this.transcripts = {};
        }
      }
    }
  }

  // Save transcripts to localStorage
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        TranscriptStore.STORAGE_KEY,
        JSON.stringify(this.transcripts)
      );
    }
  }

  // Get a transcript by video ID
  public getTranscript(videoId: string): TranscriptEntry | null {
    return this.transcripts[videoId] || null;
  }

  // Get all stored transcripts
  public getAllTranscripts(): TranscriptEntry[] {
    return Object.values(this.transcripts);
  }

  // Fetch a transcript from the API and store it
  public async fetchAndStoreTranscript(
    videoId: string, 
    options: TranscriptFetchOptions = {}
  ): Promise<TranscriptEntry> {
    try {
      const { forceRefresh = false, useSupadata = false } = options;
      
      // Check if we already have this transcript and not forcing refresh
      if (this.transcripts[videoId] && !forceRefresh) {
        return this.transcripts[videoId];
      }

      // Construct API URL with query parameters
      const params = new URLSearchParams();
      params.append('videoId', videoId);
      
      if (forceRefresh) {
        params.append('forceRefresh', 'true');
      }
      
      if (useSupadata) {
        params.append('useSupadata', 'true');
      }
      
      // Fetch from API
      const response = await fetch(`/api/youtube-transcript?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transcript');
      }
      
      // Store the result
      this.transcripts[videoId] = result.data;
      this.saveToStorage();
      
      return result.data;
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  }

  // Remove a transcript by video ID
  public removeTranscript(videoId: string): void {
    if (this.transcripts[videoId]) {
      delete this.transcripts[videoId];
      this.saveToStorage();
    }
  }

  // Clear all transcripts
  public clearAllTranscripts(): void {
    this.transcripts = {};
    this.saveToStorage();
  }
}

// Export a singleton instance
export const transcriptStore = TranscriptStore.getInstance();
