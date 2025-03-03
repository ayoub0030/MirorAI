# screenpipe playground

A flexible playground for displaying, testing, and exploring components with their associated code, documentation, and ai prompts.

<!-- <img width="1312" alt="screenshot of component playground" src="https://github.com/user-attachments/assets/3e5abd07-0a3c-4c3b-8351-5107beb4fb10"> -->

## features

- **interactive component display**: view rendered components in action
- **code inspection**: examine the full source code of each component
- **raw output**: see the raw api responses and data
- **ai prompt visibility**: view the prompts and context used to generate components
- **collapsible interface**: toggle component visibility for a cleaner workspace
- **youtube transcript analysis**: fetch, store, and analyze YouTube video transcripts using Gemini AI

## youtube video analysis with gemini AI

This project includes a powerful feature that allows you to:

1. **Extract YouTube video metadata** from OCR data captured by Screenpipe
2. **Fetch transcripts** from YouTube videos using both YouTube-Transcript API and Supadata API
3. **Analyze video content** using Google's Gemini AI model
4. **Ask questions** about video content through a RAG (Retrieval-Augmented Generation) chatbot interface

### Setup for YouTube and Gemini features

To use these features, you need to add the following API keys to your `.env` file:

```
YOUTUBE_API_KEY=your_youtube_api_key_here
SUPADATA_API_KEY=your_supadata_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

- Get a YouTube API key from the [Google Cloud Console](https://console.cloud.google.com/)
- Get a Supadata API key from [Supadata](https://www.supadata.io/) (optional)
- Get a Gemini AI API key from the [Google AI Studio](https://ai.google.dev/)

### How to use the YouTube Transcript Analyzer

1. The application extracts YouTube video information from your screen using OCR
2. Click the "Transcript" button next to any video to view and save its transcript
3. In the transcript viewer, click "Analyze with Gemini AI" to open the chat interface
4. Ask questions about the video content, and the AI will analyze the transcript to provide answers

This RAG-based assistant uses the video transcript as its knowledge base, allowing for accurate and context-aware responses about video content.

## usage

the playground allows you to:

1. view rendered components in their intended state
2. inspect the raw output from api calls
3. study the complete component code
4. examine the ai prompts and context used to generate components

## component structure

each playground card includes:
- component title and collapsible interface
- tabs for different views (rendered output, raw output, code, ai prompt)
- copy functionality for sharing prompts and context

## getting started

1. install this pipe from UI and play with it
2. follow docs to create your pipe (it will create this app) (https://docs.screenpi.pe/docs/plugins)
3. modify code from ready-to-use-examples directory
