import { NextRequest, NextResponse } from 'next/server';

// POST /api/extract-context
// Body: { storyline: string, artistName: string, songName: string }
// Returns: { masterContext: string }

export async function POST(req: NextRequest) {
  try {
    const { storyline, artistName, songName } = await req.json();
    
    if (!storyline) {
      return NextResponse.json({ error: 'storyline is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    const systemPrompt = `You are a cinematographer analyzing a music video storyboard. Extract the MASTER VISUAL CONTEXT that should remain consistent across all scenes.

Your task is to identify and describe the overarching visual elements that connect all scenes together.

Analyze the storyline and extract:
1. PRIMARY SETTING: Overall location/environment (e.g., "nighttime Los Angeles", "abstract dreamscape", "1990s recording studio")
2. CHARACTER APPEARANCE: How the main artist should look consistently (clothing, style, age)
3. COLOR PALETTE: Dominant colors and lighting mood
4. VISUAL MOTIFS: Recurring elements, props, or symbols
5. ATMOSPHERE: Overall mood and energy level
6. TIME PERIOD: Era or temporal setting
7. CINEMATOGRAPHY STYLE: Camera work and visual treatment

Output a CONCISE (3-4 sentences max) master context that will ensure visual consistency when added to individual scene prompts. Focus on concrete visual details that AI image generators can use.`;

    const userPrompt = `Song: "${songName}"${artistName ? ` by ${artistName}` : ''}

STORYLINE TO ANALYZE:
${storyline}

Extract the master visual context that should remain consistent across all scenes.`;

    const body = {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.3 // Lower temperature for more consistent extraction
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('OpenAI API error:', data);
      return NextResponse.json({
        error: 'OpenAI request failed',
        details: data?.error?.message || 'Unknown error',
      }, { status: openaiRes.status });
    }

    const masterContext = data.choices[0]?.message?.content?.trim();

    if (!masterContext) {
      return NextResponse.json({ error: 'No context extracted' }, { status: 500 });
    }

    console.log('Extracted master context:', masterContext);

    return NextResponse.json({ masterContext });
  } catch (err) {
    console.error('Extract context error:', err);
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}