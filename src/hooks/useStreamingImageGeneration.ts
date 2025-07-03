"use client";

import { useState, useCallback } from 'react';

interface StreamingOptions {
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  partial_images?: number;
}

interface StreamingState {
  isStreaming: boolean;
  partialImages: { [key: number]: string };
  finalImages: { [key: number]: string };
  error: string | null;
}

export function useStreamingImageGeneration() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    partialImages: {},
    finalImages: {},
    error: null
  });

  const generateImages = useCallback(async (options: StreamingOptions) => {
    setState({
      isStreaming: true,
      partialImages: {},
      finalImages: {},
      error: null
    });

    try {
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          size: options.size || '1024x1024',
          quality: options.quality || 'medium',
          partial_images: options.partial_images || 2,
        }),
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
            
            if (dataStr === '[DONE]') {
              setState(prevState => ({
                ...prevState,
                isStreaming: false
              }));
              return;
            }

            if (dataStr === '') continue; // Skip empty data lines

            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'partial_image' && data.data) {
                const imageUrl = `data:image/png;base64,${data.data}`;
                setState(prevState => ({
                  ...prevState,
                  partialImages: {
                    ...prevState.partialImages,
                    [data.index || 0]: imageUrl
                  }
                }));
              } else if (data.type === 'final_image' && data.data) {
                const imageUrl = `data:image/png;base64,${data.data}`;
                setState(prevState => ({
                  ...prevState,
                  finalImages: {
                    ...prevState.finalImages,
                    [data.index || 0]: imageUrl
                  }
                }));
              } else if (data.type === 'done') {
                setState(prevState => ({
                  ...prevState,
                  isStreaming: false
                }));
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Unknown streaming error');
              }
            } catch (parseError) {
              // Only log parsing errors if it's not likely a partial JSON chunk
              if (!dataStr.includes('"data":') || dataStr.includes('}')) {
                console.warn('Failed to parse streaming data:', parseError);
              }
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
      partialImages: {},
      finalImages: {},
      error: null
    });
  }, []);

  return {
    ...state,
    generateImages,
    reset
  };
}