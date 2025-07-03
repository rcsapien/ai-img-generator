"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  unoptimized?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  showLoadingSpinner?: boolean;
}

export function ProgressiveImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  priority = false,
  unoptimized = true,
  style,
  onClick,
  onLoad,
  onError,
  showLoadingSpinner = true,
  ...props
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    console.log('[ProgressiveImage] Component mounted/updated with src:', src?.substring(0, 50) + '...', 'fill:', fill);
    console.log('[ProgressiveImage] Full src length:', src?.length);
    console.log('[ProgressiveImage] Src starts with data:image?', src?.startsWith('data:image'));
    
    // Test if image can be loaded
    if (src && src.startsWith('data:image')) {
      const testImg = new window.Image();
      testImg.onload = () => console.log('[ProgressiveImage] TEST: Base64 image is valid');
      testImg.onerror = (e) => console.error('[ProgressiveImage] TEST: Base64 image is INVALID', e);
      testImg.src = src;
    }
    
    if (src) {
      setCurrentSrc(src);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = () => {
    console.log('[ProgressiveImage] Image loaded successfully:', src.substring(0, 50) + '...');
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = (e: any) => {
    console.error('[ProgressiveImage] Image failed to load:', src.substring(0, 50) + '...');
    console.error('[ProgressiveImage] Error details:', e);
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm rounded",
          fill ? "absolute inset-0" : "",
          className
        )}
        style={fill ? undefined : { width, height, ...style }}
        onClick={onClick}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div>Failed to load</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded", className)} style={style} onClick={onClick}>
      {/* Loading placeholder */}
      {isLoading && showLoadingSpinner && (
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center",
            "animate-pulse"
          )}
          style={fill ? undefined : { width, height }}
        >
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs text-gray-500 dark:text-gray-400">Generating...</div>
          </div>
        </div>
      )}

      {/* Actual image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-all duration-500 ease-out",
            isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100",
            fill ? "absolute inset-0 w-full h-full" : "",
            className
          )}
          style={fill ? { ...style } : { width, height, ...style }}
        />
      )}
    </div>
  );
}

interface StreamingImageProps extends Omit<ProgressiveImageProps, 'src'> {
  partialSrc?: string;
  finalSrc?: string;
  showProgressBar?: boolean;
}

export function StreamingImage({
  partialSrc,
  finalSrc,
  showProgressBar = true,
  alt,
  className,
  fill = false,
  width,
  height,
  style,
  onClick,
  onLoad,
  onError,
  ...props
}: StreamingImageProps) {
  const [isPartial, setIsPartial] = useState(false);
  const currentSrc = finalSrc || partialSrc || '';
  const hasPartialImage = !!partialSrc && !finalSrc;

  useEffect(() => {
    setIsPartial(hasPartialImage);
  }, [hasPartialImage]);

  return (
    <div className={cn("relative overflow-hidden rounded", className)} style={style} onClick={onClick}>
      {/* Progress indicator for streaming */}
      {showProgressBar && isPartial && (
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="bg-black bg-opacity-50 rounded-full p-1">
            <div className="w-full bg-gray-600 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full animate-pulse"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Partial image blur overlay effect */}
      {isPartial && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-blue-500/5" />
          <div className="absolute inset-0 backdrop-blur-[0.5px]" />
        </div>
      )}

      <ProgressiveImage
        src={currentSrc}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={cn(
          "transition-all duration-700 ease-out",
          isPartial && "brightness-95 contrast-105 saturate-110", // Enhance partial images
          finalSrc && "brightness-100 contrast-100 saturate-100", // Normal final images
          fill ? "object-contain" : ""
        )}
        showLoadingSpinner={!currentSrc}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    </div>
  );
}