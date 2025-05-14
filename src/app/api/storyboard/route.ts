import { NextRequest, NextResponse } from 'next/server';

// POST /api/storyboard
// Body: { masterPrompt: string; lyrics: string; storyline: string }
// Returns: Array of 10 scene objects matching required schema.

export async function POST(req: NextRequest) {
  try {
    const { masterPrompt, lyrics, storyline } = await req.json();

    if (!masterPrompt || !storyline) {
      return NextResponse.json(
        { error: 'masterPrompt and storyline are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    // Build Chat completion prompt to produce exactly 10 scenes for a 30-second video.
    const systemPrompt = `You are an award-winning music-video director. Given the LYRICS and STORYLINE, produce a storyboard consisting of EXACTLY 10 JSON objects. Each object MUST follow this strict schema: {\n  \"scene_name\": string,\n  \"time_stamp\": string,\n  \"scene_description\": string,\n  \"lyric_excerpt\": string\n}.\n• time_stamp must be in mm:ss format between 00:00 and 00:29, sequential and evenly covering the 30-second runtime.\n• lyric_excerpt should contain the exact lyric line (or partial line) being sung at that timestamp, without leading timestamps or quotes. Keep it concise.\n• scene_name ~3 words; scene_description 1-2 vivid sentences.\n\nRespond ONLY with the raw JSON array, without markdown/code fences/extra text.`;

    const userPrompt = `LYRICS:\n${lyrics}\n\nSTORYLINE:\n${storyline}`;

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      return NextResponse.json(
        { error: 'OpenAI request failed', details: errorText },
        { status: openaiRes.status }
      );
    }

    const data = await openaiRes.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();

    // Remove potential markdown code fences like ```json ... ```
    let jsonText = content;
    if (jsonText.startsWith("```")) {
      const match = jsonText.match(/```[a-z]*\n([\s\S]*?)```/i);
      if (match) {
        jsonText = match[1].trim();
      }
    }

    let scenes;
    try {
      scenes = JSON.parse(jsonText);
    } catch (err) {
      console.error('JSON parse error', err, '\nContent:', content);
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response as JSON', raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(scenes);
  } catch (err) {
    console.error('Unexpected error in /api/storyboard', err);
    return NextResponse.json(
      { error: 'Error generating storyboard', details: String(err) },
      { status: 500 }
    );
  }
}
