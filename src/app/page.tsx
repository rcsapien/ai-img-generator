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

import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState(null);
  const [background, setBackground] = useState("auto");
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);
  const [outputFormat] = useState("png");
  const [quality] = useState("auto");
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

  // Helper to convert file to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Simple fake progress animation while request is pending
  useEffect(() => {
    let timer;
    if (loading) {
      setProgress(10);
      timer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 10 : p));
      }, 400);
    } else {
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setInputImage(file);
  };

  const handleGenerate = async () => {
    if (!prompt && !inputImage) {
      alert("Please provide a prompt or an input image.");
      return;
    }

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
          background,
          outputFormat,
          quality,
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
      if (data.data) {
        setResultImages(
          data.data.map((img) => `data:image/${outputFormat};base64,${img.b64_json}`)
        );
      } else if (data.error) {
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

          {/* Quantity & Size */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={10}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024 x 1024</SelectItem>
                  <SelectItem value="1536x1024">1536 x 1024</SelectItem>
                  <SelectItem value="1024x1536">1024 x 1536</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="background">Background</Label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger id="background">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="opaque">Opaque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate button */}
          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Generate
          </Button>

          {/* Progress bar */}
          {loading && <Progress value={progress} className="h-2" />}
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {resultImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10"
          >
            {resultImages.map((src, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={src}
                    alt={`Result ${idx + 1}`}
                    className="w-full object-cover"
                  />
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
                      <img
                        src={editedImages[idx]}
                        alt={`Edited Result ${idx + 1}`}
                        className="w-full object-cover border border-dashed border-gray-400 mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
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
