import { 
  GoogleGenerativeAI, 
  HarmCategory, 
  HarmBlockThreshold, 
  GenerativeModel,
  ChatSession
} from '@google/generative-ai';

// Gemini API configuration - Safely access environment variables in Next.js
const getApiKey = () => {
  // Try both ways of accessing environment variables in Next.js
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  return apiKey;
};

const apiKey = getApiKey();
// Define multiple model names to try in order of preference
const MODEL_NAMES = ["gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
// Start with the first model name
let currentModelIndex = 0;
let MODEL_NAME = MODEL_NAMES[currentModelIndex];

// For debugging
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in environment variables");
} else if (apiKey.trim() === '') {
  console.error("GEMINI_API_KEY is empty");
} else {
  console.log("GEMINI_API_KEY is configured (length: " + apiKey.length + ")");
  console.log("Will try these models in order:", MODEL_NAMES.join(", "));
}

// Interface for transcript context
export interface TranscriptContext {
  videoId: string;
  videoTitle?: string;
  transcript: string;
}

// Initialize the Google Generative AI client
let genAI: GoogleGenerativeAI | null = null;

try {
  if (apiKey && apiKey.trim() !== '') {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log("Gemini AI client initialized successfully");
  } else {
    console.error("Cannot initialize Gemini AI client: API key is missing or empty");
  }
} catch (error) {
  console.error("Error initializing Gemini AI client:", error);
  genAI = null;
}

// Configure safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Configure generation config
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

export interface GeminiChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Try to get a model with fallback if one fails
 */
async function getModelWithFallback() {
  if (!genAI) return null;
  
  // Try each model in our list until one works
  for (let i = 0; i < MODEL_NAMES.length; i++) {
    try {
      const modelName = MODEL_NAMES[i];
      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings,
        generationConfig,
      });
      
      // Test the model with a simple request
      await model.generateContent("Test");
      
      // If we reach here, the model works
      console.log(`Successfully connected to model: ${modelName}`);
      MODEL_NAME = modelName; // Update the current model name
      currentModelIndex = i; // Update current index
      return model;
    } catch (error) {
      console.warn(`Model ${MODEL_NAMES[i]} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (i === MODEL_NAMES.length - 1) {
        // This was the last model to try
        console.error("All Gemini models failed to connect");
        return null;
      }
      // Otherwise continue to the next model
    }
  }
  
  return null;
}

/**
 * Create a new chat session
 * @returns A new chat session
 */
export async function createChatSession(): Promise<ChatSession | null> {
  if (!genAI) {
    console.error("Cannot create chat session: Gemini AI client not initialized");
    return null;
  }
  
  try {
    // Get a working model
    const model = await getModelWithFallback();
    if (!model) {
      console.error("Could not find a working Gemini model");
      return null;
    }
    
    // Create a new chat session
    return model.startChat({
      history: [],
      generationConfig,
      safetySettings,
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return null;
  }
}

/**
 * Build a system prompt for the Gemini model
 * @param context The context for the query (transcript data)
 * @returns A system prompt
 */
function buildDataAnalystPrompt(context: TranscriptContext): string {
  return `You are a helpful data analyst and content expert. You are analyzing a YouTube video transcript.
  
Video ID: ${context.videoId}
${context.videoTitle ? `Video Title: ${context.videoTitle}` : ""}

Your task is to answer questions about this video based on the transcript provided below. 
Provide insights, summaries, and analysis based solely on the information in the transcript.
If the information needed to answer a question is not available in the transcript, say so clearly.
Do not make up information that is not present in the transcript.

Here is the transcript:
${context.transcript}

Now, please answer the following query based on this transcript:`;
}

/**
 * Get a response from Gemini about the video transcript
 * @param context The context for the query (transcript data)
 * @param query The user's query
 * @returns The Gemini response
 */
export async function getGeminiResponse(
  context: TranscriptContext,
  query: string
): Promise<string> {
  if (!genAI) {
    console.error("Cannot get response: Gemini AI client not initialized");
    return "Gemini API key is not configured properly. Please check your .env file and restart the server.";
  }
  
  try {
    // Get a working model with fallback
    const model = await getModelWithFallback();
    if (!model) {
      return "Could not connect to Gemini API. Please check your API key and try again.";
    }
    
    // Create a system prompt with the transcript as context
    const systemPrompt = buildDataAnalystPrompt(context);
    
    // Start a chat session
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig,
      safetySettings,
    });
    
    // Send the user query
    const result = await chat.sendMessage(query);
    const response = result.response;
    
    return response.text();
  } catch (error) {
    console.error('Error getting Gemini response:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      return `Error: Your Gemini API key appears to be invalid. Please check it and restart the server. Details: ${error.message}`;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return `Error: The Gemini model "${MODEL_NAME}" was not found. This could be because your API key doesn't have access to this model or the model name has changed. Details: ${error.message}`;
    }
    return `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`;
  }
}

/**
 * Stream a response from Gemini for real-time chat
 * @param context The context for the query (transcript data)
 * @param query The user's query
 * @param onChunk Callback function to handle each chunk of the response
 */
export async function streamGeminiResponse(
  context: TranscriptContext,
  query: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  if (!genAI) {
    console.error("Cannot stream response: Gemini AI client not initialized");
    onChunk("Gemini API key is not configured properly. Please check your .env file and restart the server.");
    return;
  }
  
  try {
    // Get a working model with fallback
    const model = await getModelWithFallback();
    if (!model) {
      onChunk("Could not connect to Gemini API. Please check your API key and try again.");
      return;
    }
    
    // Create a system prompt with the transcript as context
    const prompt = `${buildDataAnalystPrompt(context)}

Query: ${query}`;
    
    // Generate streaming response
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });
    
    // Process chunks as they arrive
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onChunk(chunkText);
      }
    }
  } catch (error) {
    console.error('Error streaming Gemini response:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      onChunk(`Error: Your Gemini API key appears to be invalid. Please check it and restart the server. Details: ${error.message}`);
    } else if (error instanceof Error && error.message.includes('not found')) {
      onChunk(`Error: The Gemini model "${MODEL_NAME}" was not found. This could be because your API key doesn't have access to this model or the model name has changed. Details: ${error.message}`);
    } else {
      onChunk(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }
  }
}

/**
 * Summarize a transcript
 * @param context The transcript context
 * @returns The summarized transcript
 */
export async function summarizeTranscript(
  context: TranscriptContext
): Promise<string> {
  if (!genAI) {
    console.error("Cannot summarize transcript: Gemini AI client not initialized");
    return "Gemini API key is not configured properly. Please check your .env file and restart the server.";
  }
  
  try {
    // Get a working model with fallback
    const model = await getModelWithFallback();
    if (!model) {
      return "Could not connect to Gemini API. Please check your API key and try again.";
    }
    
    // Create a system prompt with the transcript as context
    const prompt = `You are a helpful content summarizer. I need you to summarize the following YouTube video transcript.

Video ID: ${context.videoId}
${context.videoTitle ? `Video Title: ${context.videoTitle}` : ''}

Please provide a concise summary of the main points discussed in this video based on the transcript below. 
Focus on the key topics, insights, and conclusions. Format the summary with bullet points for main sections.

Here is the transcript:
${context.transcript}

Summary:`;
    
    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });
    
    const response = result.response;
    
    return response.text();
  } catch (error) {
    console.error('Error summarizing transcript:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      return `Error: Your Gemini API key appears to be invalid. Please check it and restart the server. Details: ${error.message}`;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return `Error: The Gemini model "${MODEL_NAME}" was not found. This could be because your API key doesn't have access to this model or the model name has changed. Details: ${error.message}`;
    }
    return `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`;
  }
}
