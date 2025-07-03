"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { useStreamingImageGeneration } from "@/hooks/useStreamingImageGeneration";

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [background, setBackground] = useState("auto");
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);
  const [outputFormat] = useState("png");
  const [quality, setQuality] = useState("medium"); // Use 'medium' for faster generation
  const [moderation] = useState("auto");
  const [resultImages, setResultImages] = useState([]);
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editMask, setEditMask] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedImages, setEditedImages] = useState<{ [idx: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Expanded image state
  const [expandedImage, setExpandedImage] = useState<number | null>(null);
  
  // Streaming state - enabled by default for much better UX
  const [useStreaming, setUseStreaming] = useState(true);
  const streamingGeneration = useStreamingImageGeneration();

  // Handle opening edit modal
  const handleOpenEdit = (idx: number) => {
    setEditIdx(idx);
    setEditPrompt("");
    setEditMask(null);
    setEditOpen(true);
  };

  // Handle edit image submit
  const handleEdit = async () => {
    if (editIdx === null) return;
    setEditing(true);
    try {
      const imgDataUrl = resultImages[editIdx];
      // Convert data URL to Blob via fetch
      const imgBlob = await (await fetch(imgDataUrl)).blob();
      // Convert Blob to File to ensure correct FormData behavior
      const imgFile = new File([imgBlob], "image.png", { type: "image/png" });
      const form = new FormData();
      form.append("prompt", editPrompt);
      form.append("image", imgFile);
      if (editMask) {
        form.append("mask", editMask, editMask.name);
      }

      const res = await fetch("/api/edit", {
        method: "POST",
        body: form, // Do NOT set Content-Type manually
      });
      const data = await res.json();
      if (data.data && data.data[0] && data.data[0].b64_json) {
        setEditedImages((prev) => ({ ...prev, [editIdx]: `data:image/png;base64,${data.data[0].b64_json}` }));
        setEditOpen(false);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error("Error editing image", err);
      alert("Error editing image");
    } finally {
      setEditing(false);
    }
  };

  // NOTE: fileToBase64 was removed as it was unused

  // Optimized progress - only for non-streaming requests
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading && !useStreaming) {
      setProgress(10);
      timer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 5 : p)); // Slower fake progress
      }, 800); // Less frequent updates
    } else {
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [loading, useStreaming]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setInputImage(file);
  };

  const handleGenerate = async () => {
    if (!prompt && !inputImage) {
      alert("Please provide a prompt or an input image.");
      return;
    }

    // Reset streaming state if using streaming
    if (useStreaming && !inputImage) {
      streamingGeneration.reset();
      
      // Use streaming generation with official OpenAI format
      await streamingGeneration.generateImages({
        prompt,
        n,
        size,
        quality // Already defaults to 'standard' for speed
      });
      return;
    }

    // Traditional generation
    setLoading(true);
    setResultImages([]);

    try {
      let response;
      // If inputImage is a File, treat this as an edit request instead of generation
      if (inputImage instanceof File) {
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("image", inputImage, inputImage.name);
        form.append("size", size);
        form.append("n", String(n));
        console.log("[handleGenerate] Redirecting to /api/edit (image edit)");
        console.log("[handleGenerate] Debug - prompt:", prompt);
        console.log("[handleGenerate] Debug - image:", inputImage ? { type: inputImage.type, size: inputImage.size, name: inputImage.name } : null);
        response = await fetch("/api/edit", {
          method: "POST",
          body: form,
        });
      } else {
        // No image – regular generation
        const body = {
          prompt,
          n,
          size,
          quality, // Now defaults to 'standard' for speed
          outputFormat,
          moderation,
        };
        console.log("[handleGenerate] Sending to /api/generate (prompt-only)");
        response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const data = await response.json();
      console.log('[handleGenerate] API Response:', data);
      if (data.data) {
        const imageUrls = data.data.map((img: { b64_json: string }) => `data:image/${outputFormat};base64,${img.b64_json}`);
        console.log('[handleGenerate] Setting resultImages:', imageUrls.length, 'images');
        console.log('[handleGenerate] First image preview:', imageUrls[0]?.substring(0, 100) + '...');
        setResultImages(imageUrls);
      } else if (data.error) {
        console.error('[handleGenerate] API Error:', data.error);
        alert(data.error);
      }
      setProgress(100);
    } catch (err) {
      console.error("Error generating image:", err);
      alert("Error generating image. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Minimal header */}
      <div className="text-center mb-16">
        <h1 className="text-xl font-mono font-light tracking-wide">imageGen</h1>
      </div>

      <div className="max-w-xl mx-auto space-y-12">
        {/* Prompt */}
        <input
          className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm font-mono focus:border-white transition-colors"
          placeholder="describe your image..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {/* File upload */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          className="w-full bg-transparent text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-transparent file:text-gray-400 hover:file:text-white"
        />

        {/* Controls */}
        <div className="grid grid-cols-3 gap-8 text-xs">
          <div>
            <div className="text-gray-500 mb-2">count</div>
            <input
              type="number"
              min={1}
              max={4}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="w-full bg-transparent border-b border-gray-700 pb-1 focus:border-white transition-colors"
            />
          </div>
          <div>
            <div className="text-gray-500 mb-2">size</div>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full bg-transparent border-b border-gray-700 pb-1 focus:border-white transition-colors"
            >
              <option value="1024x1024">square</option>
              <option value="1536x1024">landscape</option>
              <option value="1024x1536">portrait</option>
            </select>
          </div>
          <div>
            <div className="text-gray-500 mb-2">quality</div>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-transparent border-b border-gray-700 pb-1 focus:border-white transition-colors"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
        </div>

        {/* Streaming toggle */}
        {!inputImage && (
          <div className="flex items-center space-x-3 text-xs">
            <input
              type="checkbox"
              id="streaming"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="w-3 h-3"
            />
            <label htmlFor="streaming" className="text-gray-500">
              progressive loading
            </label>
          </div>
        )}

        {/* Generate button */}
        <div className="text-center">
          <button
            onClick={handleGenerate}
            disabled={loading || streamingGeneration.isStreaming}
            className="text-sm uppercase tracking-wider hover:text-gray-300 disabled:text-gray-600 transition-colors"
          >
            {(loading || streamingGeneration.isStreaming) && <Loader2 className="inline w-3 h-3 animate-spin mr-2" />}
            {loading || streamingGeneration.isStreaming ? "generating..." : "generate"}
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div className="w-full bg-gray-800 h-px">
            <div 
              className="bg-white h-px transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* Error */}
        {streamingGeneration.error && (
          <div className="text-xs text-red-500 text-center">
            {streamingGeneration.error}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {(() => {
          console.log('[Render] resultImages:', resultImages.length, 'streaming:', Object.keys(streamingGeneration.images).length);
          return (resultImages.length > 0 || Object.keys(streamingGeneration.images).length > 0);
        })() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto mt-24 grid grid-cols-1 gap-16 sm:grid-cols-2"
          >
            {/* Traditional results */}
            {resultImages.map((src, idx) => (
              <div key={`traditional-${idx}`} className="space-y-4">
                <div 
                  className="relative w-full cursor-pointer transition-all duration-300"
                  style={{ 
                    aspectRatio: expandedImage === idx ? '4/3' : '1/1',
                    maxHeight: expandedImage === idx ? '600px' : '400px'
                  }}
                  onClick={() => setExpandedImage(expandedImage === idx ? null : idx)}
                >
                  <ProgressiveImage
                    src={src}
                    alt={`Result ${idx + 1}`}
                    className={`transition-all duration-300 ${
                      expandedImage === idx ? 'object-contain' : 'object-cover'
                    }`}
                    fill
                    priority
                    unoptimized
                  />
                </div>
                <div className="text-center space-y-2">
                  <a
                    href={src}
                    download={`image_${idx + 1}.${outputFormat}`}
                    className="text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    download
                  </a>
                  <button
                    onClick={() => handleOpenEdit(idx)}
                    className="block mx-auto text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    edit
                  </button>
                </div>
                {editedImages[idx] && (
                  <div className="relative w-full aspect-square border border-gray-800">
                    <ProgressiveImage
                      src={editedImages[idx]}
                      alt={`Edited ${idx + 1}`}
                      className="object-cover"
                      fill
                      priority
                      unoptimized
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming results */}
            {Object.entries(streamingGeneration.images).map(([imageIndex, src]) => (
              <div key={`streaming-${imageIndex}`} className="space-y-4">
                <div 
                  className="relative w-full cursor-pointer transition-all duration-300"
                  style={{ 
                    aspectRatio: expandedImage === parseInt(imageIndex) ? '4/3' : '1/1',
                    maxHeight: expandedImage === parseInt(imageIndex) ? '600px' : '400px'
                  }}
                  onClick={() => {
                    const idx = parseInt(imageIndex);
                    setExpandedImage(expandedImage === idx ? null : idx);
                  }}
                >
                  <ProgressiveImage
                    src={src}
                    alt={`Streaming ${parseInt(imageIndex) + 1}`}
                    className={`transition-all duration-300 ${
                      expandedImage === parseInt(imageIndex) ? 'object-contain' : 'object-cover'
                    }`}
                    fill
                    priority
                    unoptimized
                    showLoadingSpinner={streamingGeneration.isStreaming}
                  />
                  
                  {streamingGeneration.isStreaming && (
                    <div className="absolute top-2 right-2 bg-white text-black text-xs px-2 py-1">
                      {streamingGeneration.progress[parseInt(imageIndex)] 
                        ? `${Math.round(streamingGeneration.progress[parseInt(imageIndex)])}%`
                        : '...'}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <a
                    href={src}
                    download={`streaming_${parseInt(imageIndex) + 1}.${outputFormat}`}
                    className="text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    download
                  </a>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-40 flex items-center justify-center p-8">
          <div className="bg-black border border-gray-800 p-8 w-full max-w-md space-y-6">
            <div className="text-xs uppercase tracking-wider text-gray-500">edit image</div>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="describe your edit..."
              className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm font-mono focus:border-white transition-colors resize-none"
              rows={3}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMask(e.target.files?.[0] || null)}
              className="w-full bg-transparent text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-transparent file:text-gray-400 hover:file:text-white"
            />
            <div className="flex justify-center space-x-8 text-xs uppercase tracking-wider">
              <button 
                onClick={() => setEditOpen(false)} 
                disabled={editing}
                className="hover:text-gray-300 disabled:text-gray-600 transition-colors"
              >
                cancel
              </button>
              <button 
                onClick={handleEdit} 
                disabled={editing || !editPrompt}
                className="hover:text-gray-300 disabled:text-gray-600 transition-colors"
              >
                {editing && <Loader2 className="inline w-3 h-3 animate-spin mr-2" />}
                {editing ? "applying..." : "apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
