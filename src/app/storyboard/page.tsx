"use client";
import React, { useState } from "react";
import Image from "next/image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useStreamingImageGeneration } from "@/hooks/useStreamingImageGeneration";
import { StreamingImage } from "@/components/ui/progressive-image";

interface Scene {
  scene_name: string;
  time_stamp: string;
  scene_description: string;
  image?: string;
  lyric_excerpt?: string;
}


const PRESET_STORYLINE = `0–2s – “This what God feel like, yeah”

A young Kendrick sits in a modest Compton living room bathed in warm morning light. Gospel vinyl spins on an old record player. The camera slowly pushes in on his closed eyes—he’s meditating, not sleeping.

2–4s – “Laughin’ to the bank like: ‘A-ha!’”

Hard cut to an old-school barbershop. Kendrick, grown, gets his fade shaped up as he laughs with childhood friends. The barber’s mirror flashes gold grills and the glint of money-counting hands.

4–6s – “Flex on swole like: ‘A-ha!’”

Interior: a cramped boxing gym in South L.A. Kendrick hits the heavy bag in slow motion. Sweat sprays like mist under flickering fluorescent lights. His posture: silent power.

6–8s – “You feel some type of way, then: ‘A-ha!’”

Surreal dreamscape: Kendrick floats in a vast desert under an eclipse. Sand blows in spirals around him as faceless critics appear and dissolve, mouthing words we can’t hear.

8–10s – “I feel like the greatest, woo”

Nighttime: rooftop in Downtown L.A. Kendrick stands alone as fireworks erupt behind him in slow motion. He raises a hand — not to celebrate, but to bless.

10–12s – “Can’t nobody stop me, whoa”

Flashback: 8-year-old Kendrick runs full-speed through a church parking lot, laughing. The camera follows from behind. As he turns a corner, he becomes adult Kendrick in a suit — stepping into a pulpit.

12–14s – “Ain’t no one out there showin’ me love”

A dimly lit hallway. Kendrick walks past framed newspaper clippings and old photos of hip hop legends. Each one flickers like a candle as he passes. He touches one — the glass cracks.

14–16s – TRANSITION

Close-up: Kendrick’s hand drops a mic into a pool of black water. The ripples become rippling chrome. Cut to a hummingbird in flight that shifts midair into the shape of a Ferrari’s hood ornament. The beat switches.

⸻

16–18s – “That’s how I feel”

Interior: candlelit Afrocentric art gallery. Kendrick gazes at a canvas of himself drawn in childlike crayon. The camera rotates as if in a trance. Beat pulses match heartbeats.

18–20s – “I feel like the greatest”

Exterior: mountain overlook at dusk. Kendrick stands on the edge, arms open wide like wings. Drone shot circles him as light fractures like a prism through the clouds.

20–22s – “I feel like the latest”

Stylized city bus ride: Kendrick rides alone, earbuds in. Reflections in the window show images from his past—his mother praying, his first stage show, a Compton mural.

22–24s – “I feel like the savior”

Interior: Baptist church. Kendrick stands before an empty choir, bathed in stained-glass color beams. The light makes his shadow stretch like a cross across the pews.

24–26s – “I feel like it ain’t no such thing as Satan”

Exterior: bonfire on a beach at night. Kendrick circles the flames with friends, dancing and laughing. In the background, an old man lights a cigar and nods — approval or prophecy?

26–28s – “I feel like the feelin’ of no fear”

Kendrick skateboards alone through an abandoned mall, grinning. His wheels clack rhythmically. Security footage glitches between views, as if the building itself is watching and smiling.

28–30s – OUTRO

Kendrick sits barefoot on a wooden porch. A little girl offers him a grape popsicle. He accepts it. They look at the sunset together, silent.
TO BE CONTINUED… appears handwritten in the sky like vapor.`;

interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnails: unknown;
}

export default function StoryboardPage() {
  const [masterPrompt, setMasterPrompt] = useState("");
  const [songName, setSongName] = useState("");
  const [storyline, setStoryline] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStoryline, setLoadingStoryline] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transformedMasterPrompt, setTransformedMasterPrompt] = useState("");
  const [youtubeVideo, setYoutubeVideo] = useState<YouTubeVideo | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [artistName, setArtistName] = useState("");
  const [masterContext, setMasterContext] = useState("");
  
  const { generateImages, isStreaming, partialImages, finalImages, error: streamingError } = useStreamingImageGeneration();


  const generateImage = async (prompt: string) => {
    console.log('[generateImage] Starting generation for prompt:', prompt.substring(0, 100) + '...');
    
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard", // Faster than high
      }),
    });
    
    console.log('[generateImage] API response status:', res.status);
    const data = await res.json();
    console.log('[generateImage] API response data:', data);
    
    if (data?.data?.[0]?.url) {
      console.log('[generateImage] Returning URL:', data.data[0].url);
      return data.data[0].url;
    }
    if (data?.data?.[0]?.b64_json) {
      const dataUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      console.log('[generateImage] Returning base64 URL, length:', dataUrl.length);
      return dataUrl;
    }
    throw new Error(data.error || "Failed to generate image");
  };

  const transformMasterPrompt = async (rawPrompt: string) => {
    try {
      const res = await fetch("/api/transform-master-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          masterPrompt: rawPrompt, 
          songName,
          artist: artistName
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to transform master prompt");
      }
      
      const data = await res.json();
      return data.transformedPrompt;
    } catch (error) {
      console.error("Error transforming master prompt:", error);
      return rawPrompt; // Fallback to original prompt
    }
  };

  const extractMasterContext = async (storyline: string) => {
    try {
      const res = await fetch("/api/extract-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          storyline,
          artistName,
          songName
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to extract master context");
      }
      
      const data = await res.json();
      return data.masterContext;
    } catch (error) {
      console.error("Error extracting master context:", error);
      return ""; // Fallback to empty context
    }
  };

  const handleGenerate = async () => {
    if (!masterPrompt || !storyline) {
      alert("Master prompt and storyline are required.");
      return;
    }
    setLoading(true);
    setProgress(0);
    try {
      // Transform the master prompt first
      console.log('=== PROMPT TRANSFORMATION ===');
      console.log('Original master prompt:', masterPrompt);
      console.log('Master prompt length:', masterPrompt.length);
      const transformed = await transformMasterPrompt(masterPrompt);
      console.log('Transformed master prompt:', transformed);
      console.log('=== END TRANSFORMATION ===');
      setTransformedMasterPrompt(transformed);

      // Extract master context from storyline
      console.log('=== EXTRACTING MASTER CONTEXT ===');
      const context = await extractMasterContext(storyline);
      console.log('Master context:', context);
      setMasterContext(context);

      const sbRes = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPrompt, storyline, artistName }),
      });
      const storyboard: Scene[] = await sbRes.json();
      if (!Array.isArray(storyboard)) {
        alert("Storyboard generation failed.");
        setLoading(false);
        return;
      }
      // Initialize scenes array with all storyboard items (without images)
      const initialScenes = storyboard.slice(0, 5); // Match processing limit
      console.log('[handleGenerate] Initial scenes:', initialScenes);
      setScenes(initialScenes);
      
      // Generate images sequentially to avoid overwhelming the API
      const scenesToProcess = storyboard.slice(0, 5); // Reduced from 10 to 5 for efficiency
      console.log('[handleGenerate] Storyboard data:', storyboard);
      console.log('[handleGenerate] Scenes to process:', scenesToProcess);
      console.log('[handleGenerate] Starting sequential generation for', scenesToProcess.length, 'scenes');
      
      console.log('[handleGenerate] About to start for loop...');
      for (let i = 0; i < scenesToProcess.length; i++) {
        const scene = scenesToProcess[i];
        console.log(`[handleGenerate] Processing scene ${i + 1}/${scenesToProcess.length}`);
        console.log(`[handleGenerate] Scene ${i + 1} data:`, scene);
        setProgress(Math.round((i / scenesToProcess.length) * 100));
        
        try {
          const combinedPrompt = `MASTER CONTEXT: ${context || 'Contemporary music video setting'}

CURRENT SCENE: ${scene.scene_description}
${artistName ? `\nARTIST: ${artistName} (use full name when the artist appears)` : ''}

VISUAL STYLE: ${transformed}

IMPORTANT: Maintain consistency with the master context while depicting this specific scene.`;
          console.log(`Scene ${i + 1} combined prompt:`, combinedPrompt);
          
          console.log(`[handleGenerate] Calling generateImage for scene ${i + 1}...`);
          const imageUrl = await generateImage(combinedPrompt);
          console.log(`[handleGenerate] Scene ${i + 1} generation completed, updating state...`);
          
          // Update scene immediately when generated
          setScenes(prevScenes => {
            const updatedScenes = [...prevScenes];
            if (updatedScenes[i]) {
              updatedScenes[i] = { 
                ...updatedScenes[i], 
                image: imageUrl 
              };
            }
            console.log(`[handleGenerate] Scene ${i + 1} state updated`);
            return updatedScenes;
          });
          
        } catch (err) {
          console.error(`[handleGenerate] Image generation error for scene ${i + 1}:`, err);
        }
      }
      
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert("Unexpected error generating storyboard.");
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a single scene prompt
  const handleEditScene = async (idx: number) => {
    const current = scenes[idx];
    const newDescription = prompt(
      "Enter a new scene description:",
      current?.scene_description || ""
    );
    if (!newDescription) return; // user cancelled

    // Optional: update description immediately for UX
    setScenes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], scene_description: newDescription } as Scene;
      return updated;
    });
  };

  // Regenerate image for a scene (using current description)
  const handleRegenerateScene = async (idx: number) => {
    const scene = scenes[idx];
    if (!scene?.scene_description) return;
    setLoading(true);
    try {      
      // Use the already transformed master prompt if available, otherwise transform it
      const promptToUse = transformedMasterPrompt || await transformMasterPrompt(masterPrompt);
      // Extract context if not already available
      const contextToUse = masterContext || await extractMasterContext(storyline);
      
      const combinedPrompt = `MASTER CONTEXT: ${contextToUse || 'Contemporary music video setting'}

CURRENT SCENE: ${scene.scene_description}
${artistName ? `\nARTIST: ${artistName} (use full name when the artist appears)` : ''}

VISUAL STYLE: ${promptToUse}

IMPORTANT: Maintain consistency with the master context while depicting this specific scene.`;
      console.log(`Regenerating scene ${idx + 1} with prompt:`, combinedPrompt);
      const newImg = await generateImage(combinedPrompt);
      setScenes((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], image: newImg } as Scene;
        return updated;
      });
    } catch (err) {
      console.error("Image regeneration error", err);
      alert("Failed to regenerate image for this scene.");
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = () => {
    setMasterPrompt("claymation");
    setStoryline(PRESET_STORYLINE);
    setSongName("");
    setArtistName("");
    setMasterContext(""); // Clear master context for preset
  };

  const generateStorylineFromSong = async () => {
    if (!songName) {
      alert("Please enter a song name");
      return;
    }
    
    setLoadingStoryline(true);
    try {
      const res = await fetch("/api/song-storyline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songName }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate storyline");
      }
      
      const data = await res.json();
      if (data.storyline) {
        setStoryline(data.storyline);
        setYoutubeVideo(data.youtubeVideo);
        if (data.artistName) {
          setArtistName(data.artistName);
        }
        
        // Proactively extract master context for better UX
        console.log('Extracting master context from generated storyline...');
        const context = await extractMasterContext(data.storyline);
        if (context) {
          setMasterContext(context);
          console.log('Master context extracted:', context);
        }
      } else {
        throw new Error("No storyline returned");
      }
    } catch (err) {
      console.error("Error generating storyline:", err);
      alert("Failed to generate storyline: " + (err as Error).message);
    } finally {
      setLoadingStoryline(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!scenes.some((s) => s.image)) return;
    const zip = new JSZip();
    scenes.forEach((scene, idx) => {
      if (scene.image?.startsWith("data:image/")) {
        const base64 = scene.image.split(",")[1];
        zip.file(`scene_${idx + 1}.png`, base64, { base64: true });
      }
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "storyboard_images.zip");
  };

  // Toggle expanded view for a scene
  const toggleExpanded = (index: number) => {
    setExpandedScene(expandedScene === index ? null : index);
  };

  // Navigate between scenes in expanded view
  const navigateScene = (direction: 'prev' | 'next') => {
    if (expandedScene === null) return;
    const scenesWithImages = scenes.map((scene, index) => ({ scene, index })).filter(item => item.scene.image);
    const currentIndex = scenesWithImages.findIndex(item => item.index === expandedScene);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : scenesWithImages.length - 1;
    } else {
      newIndex = currentIndex < scenesWithImages.length - 1 ? currentIndex + 1 : 0;
    }
    setExpandedScene(scenesWithImages[newIndex].index);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-16">
        
        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-mono font-light tracking-wide">frameLang</h1>
        </div>

        {/* Form Section */}
        <div className="space-y-12">
          
          {/* Master Prompt */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-500">
              Visual Style
            </label>
            <input
              className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm font-mono focus:border-white transition-colors"
              placeholder="cyberpunk, dreamy watercolor, gritty realistic, claymation..."
              value={masterPrompt}
              onChange={(e) => setMasterPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-600">
              Enter simple style keywords (e.g., &quot;cyberpunk&quot;, &quot;dreamy&quot;, &quot;claymation&quot;) - will be expanded into detailed visual direction
            </p>
          </div>
          
          {/* Song Name */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-500">
              Song Name
            </label>
            <div className="space-y-4">
              <input
                className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm font-mono focus:border-white transition-colors"
                placeholder="Enter a song name..."
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
              />
              <button 
                onClick={generateStorylineFromSong}
                disabled={loadingStoryline || !songName}
                className="text-xs uppercase tracking-wider hover:text-gray-300 disabled:text-gray-600 transition-colors"
              >
                {loadingStoryline ? "generating..." : "generate storyline"}
              </button>
            </div>
          </div>

          {/* YouTube Video Info */}
          {youtubeVideo && (
            <div className="space-y-3 border-t border-gray-800 pt-8">
              <label className="block text-xs uppercase tracking-wider text-gray-500">
                Found YouTube Video
              </label>
              <div className="bg-gray-900 p-4 space-y-2">
                <div className="text-sm font-mono">{youtubeVideo.title}</div>
                <div className="text-xs text-gray-400">by {youtubeVideo.channelTitle}</div>
                {artistName && (
                  <div className="text-xs text-green-400">Artist detected: {artistName}</div>
                )}
                <div className="text-xs text-gray-500 leading-relaxed">
                  {youtubeVideo.description.substring(0, 200)}...
                </div>
                <div className="flex space-x-4">
                  <button 
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeVideo.videoId}`, '_blank')}
                    className="text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    view on youtube
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Storyline */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-gray-500">
              Storyline
            </label>
            <textarea
              className="w-full bg-transparent border-b border-gray-700 pb-2 text-sm font-mono focus:border-white transition-colors resize-none"
              rows={6}
              placeholder="Describe the narrative direction..."
              value={storyline}
              onChange={(e) => setStoryline(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="space-y-4 text-center">
            <button 
              onClick={loadPreset}
              className="block mx-auto text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              load preset
            </button>
            
            <button 
              onClick={handleGenerate} 
              disabled={loading}
              className="block mx-auto text-sm uppercase tracking-wider hover:text-gray-300 disabled:text-gray-600 transition-colors"
            >
              {loading ? "generating..." : "generate"}
            </button>
            
            {scenes.some((s) => s.image) && (
              <button 
                onClick={handleDownloadAll}
                className="block mx-auto text-xs uppercase tracking-wider hover:text-gray-300 transition-colors"
              >
                download all
              </button>
            )}
          </div>

          {/* Show transformed prompt if available */}
          {transformedMasterPrompt && (
            <div className="space-y-3 border-t border-gray-800 pt-8">
              <label className="block text-xs uppercase tracking-wider text-gray-500">
                Visual Style Guide
              </label>
              <div className="bg-gray-900 p-4 text-xs text-gray-400 leading-relaxed">
                {transformedMasterPrompt}
              </div>
            </div>
          )}

          {/* Show master context if available */}
          {masterContext && (
            <div className="space-y-3 border-t border-gray-800 pt-8">
              <label className="block text-xs uppercase tracking-wider text-gray-500">
                Master Scene Context
              </label>
              <div className="bg-gray-900 p-4 text-xs text-gray-400 leading-relaxed">
                {masterContext}
              </div>
              <p className="text-xs text-gray-600">
                This context is included with every scene to maintain visual consistency
              </p>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-800 h-px">
                <div 
                  className="bg-white h-px transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-500">
                {progress}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenes Grid */}
      {scenes.length > 0 && (
        <div className="max-w-4xl mx-auto mt-24 space-y-16">
          {scenes.map((scene, idx) => (
            <div key={idx} className="space-y-6">
              
              {/* Scene Header */}
              <div className="text-center space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-gray-500">
                  {scene.time_stamp}
                </h3>
                <h2 className="text-sm font-mono font-light">
                  {scene.scene_name}
                </h2>
              </div>

              {/* Scene Description */}
              <p className="text-center text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto">
                {scene.scene_description}
              </p>

              {/* Lyric Excerpt */}
              {scene && (scene as Scene & { lyric_excerpt?: string }).lyric_excerpt && (
                <p className="text-center text-xs text-gray-500 italic">
                  &quot;{(scene as Scene & { lyric_excerpt?: string }).lyric_excerpt}&quot;
                </p>
              )}

              {/* Image */}
              {scene.image ? (
                <div className="w-full max-w-lg mx-auto">
                  <img
                    src={scene.image}
                    alt={scene.scene_name}
                    className="w-full h-auto rounded"
                  />
                </div>
              ) : (
                <div className="w-full max-w-lg mx-auto h-64 border border-gray-800 flex items-center justify-center">
                  <span className="text-xs uppercase tracking-wider text-gray-600">
                    {loading ? "generating..." : "no image"}
                  </span>
                </div>
              )}

              {/* Scene Actions */}
              <div className="flex justify-center space-x-8 text-xs uppercase tracking-wider">
                <button
                  onClick={() => handleEditScene(idx)}
                  disabled={loading}
                  className="hover:text-gray-300 disabled:text-gray-600 transition-colors"
                >
                  edit
                </button>
                <button
                  onClick={() => handleRegenerateScene(idx)}
                  disabled={loading}
                  className="hover:text-gray-300 disabled:text-gray-600 transition-colors"
                >
                  regenerate
                </button>
              </div>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}
