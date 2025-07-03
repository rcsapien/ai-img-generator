"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    <div className="container mx-auto p-6 max-w-3xl">
      <Card className="shadow-2xl p-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ImageIcon className="w-6 h-6" /> OpenAI Image Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe your image..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="image">Input Image (optional)</Label>
            <Input id="image" type="file" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Quantity, Size & Quality */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={4}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024²)</SelectItem>
                  <SelectItem value="1536x1024">Landscape</SelectItem>
                  <SelectItem value="1024x1536">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality/Speed</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger id="quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">⚡ Low (5-10s)</SelectItem>
                  <SelectItem value="medium">🚀 Medium (8-15s)</SelectItem>
                  <SelectItem value="high">🐌 High (25-40s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Streaming toggle */}
          {!inputImage && (
            <div className="flex items-center space-x-3">
              <Switch
                id="streaming"
                checked={useStreaming}
                onCheckedChange={setUseStreaming}
              />
              <Label htmlFor="streaming" className="text-sm">
                ⚡ Progressive Loading (See images form in real-time)
              </Label>
            </div>
          )}

          {/* Generate button */}
          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={loading || streamingGeneration.isStreaming}
          >
            {(loading || streamingGeneration.isStreaming) && <Loader2 className="h-4 w-4 animate-spin" />} 
            Generate
          </Button>

          {/* Progress bar */}
          {loading && <Progress value={progress} className="h-2" />}
          
          {/* Streaming error */}
          {streamingGeneration.error && (
            <div className="text-red-500 text-sm">
              Error: {streamingGeneration.error}
            </div>
          )}
        </CardContent>
      </Card>

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
            className="grid grid-cols-1 gap-6 mt-10 sm:grid-cols-2 sm:mobile-stack"
          >
            {/* Traditional results */}
            {resultImages.map((src, idx) => (
              <Card key={`traditional-${idx}`} className="overflow-hidden">
                <CardContent className="p-0">
                  <div 
                    className="relative w-full cursor-pointer transition-all duration-300 group"
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
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {expandedImage === idx ? 'Collapse' : 'Expand'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={src}
                    download={`image_${idx + 1}.${outputFormat}`}
                    className="block text-center py-2 hover:underline"
                  >
                    Download Image {idx + 1}
                  </a>
                  {/* Edit Button */}
                  <Button
                    className="w-full mt-2"
                    variant="outline"
                    onClick={() => handleOpenEdit(idx)}
                  >
                    Edit Image
                  </Button>
                  {/* Edited Images */}
                  {editedImages[idx] && (
                    <div className="mt-4">
                      <Label>Edited Image:</Label>
                      <div className="relative w-full aspect-square border border-dashed border-gray-400 mt-2">
                        <ProgressiveImage
                          src={editedImages[idx]}
                          alt={`Edited Result ${idx + 1}`}
                          className="object-cover"
                          fill
                          priority
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Streaming results */}
            {Object.entries(streamingGeneration.images).map(([imageIndex, src]) => (
              <Card key={`streaming-${imageIndex}`} className="overflow-hidden">
                <CardContent className="p-0">
                  <div 
                    className="relative w-full cursor-pointer transition-all duration-300 group"
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
                      alt={`Streaming Result ${parseInt(imageIndex) + 1}`}
                      className={`transition-all duration-300 ${
                        expandedImage === parseInt(imageIndex) ? 'object-contain' : 'object-cover'
                      }`}
                      fill
                      priority
                      unoptimized
                      showLoadingSpinner={streamingGeneration.isStreaming}
                    />
                    
                    {/* Streaming indicator and progress */}
                    {streamingGeneration.isStreaming && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        {streamingGeneration.progress[parseInt(imageIndex)] 
                          ? `${Math.round(streamingGeneration.progress[parseInt(imageIndex)])}%`
                          : 'Streaming...'}
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {expandedImage === parseInt(imageIndex) ? 'Collapse' : 'Expand'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={src}
                    download={`streaming_image_${parseInt(imageIndex) + 1}.${outputFormat}`}
                    className="block text-center py-2 hover:underline"
                  >
                    Download Image {parseInt(imageIndex) + 1}
                  </a>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Image</h2>
            <div className="mb-2">
              <Label htmlFor="editPrompt">Edit Prompt</Label>
              <Textarea
                id="editPrompt"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe your edit..."
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="editMask">Mask (optional)</Label>
              <Input
                id="editMask"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMask(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setEditOpen(false)} variant="secondary" disabled={editing}>Cancel</Button>
              <Button onClick={handleEdit} disabled={editing || !editPrompt}>
                {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Edit"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
