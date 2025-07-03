"use client";

import { useState, useCallback } from 'react';

interface StreamingOptions {
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  style?: string;
}

interface StreamingState {
  isStreaming: boolean;
  images: { [key: number]: string };
  progress: { [key: number]: number };
  error: string | null;
  usage?: any;
}

export function useStreamingImageGeneration() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    images: {},
    progress: {},
    error: null
  });

  const generateImages = useCallback(async (options: StreamingOptions) => {
    setState({
      isStreaming: true,
      images: {},
      progress: {},
      error: null
    });

    try {
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            
            // Check for done signal
            if (dataStr === '[DONE]') {
              setState(prevState => ({
                ...prevState,
                isStreaming: false
              }));
              return;
            }

            try {
              const chunk = JSON.parse(dataStr);
              
              // Handle OpenAI streaming format
              if (chunk.data && Array.isArray(chunk.data)) {
                setState(prevState => {
                  const newState = { ...prevState };

                  chunk.data.forEach((item: any) => {
                    if (item.object === 'image.chunk') {
                      const index = item.index || 0;
                      
                      // Update progress
                      if (item.progress !== undefined) {
                        newState.progress[index] = item.progress;
                      }
                      
                      // Update image if b64_json is present
                      if (item.b64_json) {
                        newState.images[index] = `data:image/png;base64,${item.b64_json}`;
                      }
                    }
                  });

                  return newState;
                });
              }

              // Handle usage info
              if (chunk.usage) {
                setState(prevState => ({
                  ...prevState,
                  usage: chunk.usage
                }));
              }

              // Handle errors
              if (chunk.error) {
                setState(prevState => ({
                  ...prevState,
                  isStreaming: false,
                  error: chunk.error
                }));
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      images: {},
      progress: {},
      error: null
    });
  }, []);

  return {
    ...state,
    generateImages,
    reset
  };
}