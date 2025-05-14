"use client";
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Scene {
  scene_name: string;
  time_stamp: string;
  scene_description: string;
  image?: string;
  lyric_excerpt?: string;
}

const PRESET_MASTER = `Music-video still for Kendrick Lamar’s 30-second visual inspired by “GOD.” Render as high-end, full-color claymation: hand-sculpted figures with visible fingerprints, imperfect seams, and matte clay finishes. Emphasize analog craft — soft film grain, 24 fps motion blur, and naturalistic imperfections. Visual palette blends warm gospel golds, sun-washed pastels, dusky violets, streetlight ambers, and shadowy urban grays. Capture a wide range of intimate and surreal settings: Compton living rooms, candlelit churches, deserts under eclipse, rooftop fireworks, childhood flashbacks, dreamlike buses, barbershops, and mountain overlooks. Each scene should feel emotionally charged and tactile. Miniature sets should resemble handcrafted dioramas — not overly digital. Use dynamic stop-motion camera work (crane shots, push-ins, dolly sweeps, rotating overheads, first-person POVs). Lighting should add depth: volumetric haze, practical reflections, and color cast from stained glass, neon, or firelight. Frame is ultra-detailed and photorealistic in a handcrafted stop-motion style. Format: 4K square (1024×1024 or larger). No text, no watermark.`;

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

export default function StoryboardPage() {
  const [masterPrompt, setMasterPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [storyline, setStoryline] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateImage = async (prompt: string) => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "512x512",
        background: "auto",
        outputFormat: "png",
        quality: "auto",
        moderation: "auto",
      }),
    });
    const data = await res.json();
    if (data?.data?.[0]?.b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    throw new Error(data.error || "Failed to generate image");
  };

  const handleGenerate = async () => {
    if (!masterPrompt || !storyline) {
      alert("Master prompt and storyline are required.");
      return;
    }
    setLoading(true);
    setProgress(0);
    try {
      const sbRes = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPrompt, lyrics, storyline }),
      });
      const storyboard: Scene[] = await sbRes.json();
      if (!Array.isArray(storyboard)) {
        alert("Storyboard generation failed.");
        setLoading(false);
        return;
      }
      for (let i = 0; i < Math.min(storyboard.length, 10); i++) {
        const scene = storyboard[i];
        try {
          const combinedPrompt = `${masterPrompt}. ${scene.scene_description}`;
          scene.image = await generateImage(combinedPrompt);
        } catch (err) {
          console.error("Image generation error", err);
        }
        setScenes([...storyboard.slice(0, 10)]);
        setProgress(Math.round(((i + 1) / Math.min(storyboard.length, 10)) * 100));
      }
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
      const combinedPrompt = `${masterPrompt}. ${scene.scene_description}`;
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
    setMasterPrompt(PRESET_MASTER);
    setStoryline(PRESET_STORYLINE);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card className="p-6 space-y-4 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">frameLang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master">Master Prompt</Label>
            <Input
              id="master"
              placeholder="Overall style, mood, vibe..."
              value={masterPrompt}
              onChange={(e) => setMasterPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lyrics">Lyrics (first 90s)</Label>
            <Textarea
              id="lyrics"
              placeholder="[00:00] Line 1..."
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storyline">Storyline</Label>
            <Textarea
              id="storyline"
              placeholder="Describe the narrative direction..."
              value={storyline}
              onChange={(e) => setStoryline(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={loadPreset}>
            Load Kendrick Claymation Preset
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </Button>
          {loading && <Progress value={progress} />}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {scenes.map((scene, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="font-bold">
                {scene.scene_name} – {scene.time_stamp}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{scene.scene_description}</p>
              {scene as any && (scene as any).lyric_excerpt && (
                <p className="italic text-sm text-purple-700">“{(scene as any).lyric_excerpt}”</p>
              )}
              {scene.image ? (
                <img
                  src={scene.image}
                  alt={scene.scene_name}
                  className="w-full h-auto rounded"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  {loading ? "Generating image..." : "No image"}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditScene(idx)}
                  disabled={loading}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateScene(idx)}
                  disabled={loading}
                >
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
