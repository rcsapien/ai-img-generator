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

    // Construct prompt for o3 reasoning model
    const systemPrompt = `You are an award-winning music-video director and creative writer. Given the SONG NAME, create a vivid, scene-by-scene storyboard for a 30-second music video inspired by the song.\n\nYour response should follow this exact format:\n0–2s – Brief description of opening scene\n\nDetailed visual description (1-2 sentences)\n\n2–4s – Next scene description\n\nDetailed visual description (1-2 sentences)\n\n[Continue with 2-second segments]\n\n28–30s – OUTRO\n\nFinal scene description (1-2 sentences)\n\nUse evocative, cinematic language focusing on visuals, locations, camera movements, and actions. Create a cohesive narrative that captures the song's emotional essence.\n\nRespond ONLY with the formatted storyline text. No introductions or explanations.`;

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

    const storyline = (
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      data.output?.[0]?.text ??
      (() => {
        const msg = data.output?.find((i: any) => i.type === 'message');
        return msg?.content?.find((c: any) => c.type === 'output_text')?.text;
      })() ??
      ''
    ).trim();

    if (!storyline) {
      return NextResponse.json({ error: 'No storyline returned from model' }, { status: 500 });
    }

    return NextResponse.json({ storyline });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
