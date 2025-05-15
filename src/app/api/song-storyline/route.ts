import { NextRequest, NextResponse } from 'next/server';

// POST /api/song-storyline
// Body: { songName: string }
// Returns: { storyline: string }

export async function POST(req: NextRequest) {
  try {
    const { songName } = await req.json();
    if (!songName) {
      return NextResponse.json({ error: 'songName is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    // Construct prompt for o3 reasoning model. We explicitly ask the model to reference the song's main performer/character in each scene so that downstream image generation is consistent.
    const systemPrompt = `You are an award-winning music-video director and creative writer. Given the SONG NAME, create a vivid, scene-by-scene storyboard for a 30-second music video inspired by the song.\n\nFormatting requirements (STRICT):\n• EXACTLY 15 blocks covering 2-second intervals (0–2s, 2–4s, …, 28–30s – OUTRO).\n• For each block provide:\n  – A very short scene tag (same line as timestamp).\n  – A separate sentence (1-2) describing visuals in rich cinematic detail.\n• Always specify WHO is on screen and what they are doing. If the song has a well-known artist (e.g., Kendrick Lamar), depict them explicitly unless their absence is conceptually intentional—in that case, briefly note why.\n• Use evocative language that focuses on visuals, camera movement, lighting, colour, and mood.\n• Maintain narrative cohesion across the 30 seconds.\n\nRespond ONLY with the formatted storyline text. No markdown, no code fences, no extra commentary.`;

    const inputText = `${systemPrompt}\n\nSONG NAME: ${songName}`;

    const body = {
      model: 'o3',
      input: inputText,
      max_output_tokens: 1024,
    };

    console.log('openai request body', body);

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await openaiRes.json();
    console.dir(data, { depth: null }); // temporary inspect

    if (!openaiRes.ok) {
      console.error('OpenAI API error:', data);
      return NextResponse.json({
        error: 'OpenAI request failed',
        details: data?.error?.message || 'Unknown error',
        status: openaiRes.status,
      }, { status: openaiRes.status });
    }

    let storyline = '';
    if (typeof data.output_text === 'string') {
      storyline = data.output_text.trim();
    }

    if (!storyline && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'output_text' && typeof item.text === 'string') {
          storyline = item.text.trim();
          break;
        }
        if (item.type === 'message' && Array.isArray(item.content)) {
          const txtNode = item.content.find((c: any) => c.type === 'output_text' && typeof c.text === 'string');
          if (txtNode?.text) {
            storyline = txtNode.text.trim();
            break;
          }
        }
      }
    }

    console.log('extracted storyline length', storyline.length);

    if (!storyline) {
      return NextResponse.json({ error: 'No storyline returned from model' }, { status: 500 });
    }

    return NextResponse.json({ storyline });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
