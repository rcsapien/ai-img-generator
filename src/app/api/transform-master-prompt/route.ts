import { NextRequest, NextResponse } from 'next/server';

// POST /api/transform-master-prompt
// Body: { masterPrompt: string, songName: string, artist: string }
// Returns: { transformedPrompt: string }

export async function POST(req: NextRequest) {
  try {
    const { masterPrompt, songName, artist } = await req.json();
    
    if (!masterPrompt) {
      return NextResponse.json({ error: 'masterPrompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    const systemPrompt = `You are a professional cinematographer. Transform the user's simple style/mood input into CONCISE visual direction that supports scene content rather than overwhelming it.

GOAL: Create aesthetic guidance that enhances scenes, not replaces them.

REQUIRED FORMAT: Create a concise visual style guide (2-3 sentences max) covering:
- Visual aesthetic/style
- Color palette
- Lighting approach
- Technical format

EXAMPLES OF TRANSFORMATIONS:
Input: "cyberpunk"
Output: "Render in high-tech neon-noir style with electric blues, hot magentas, and deep blacks. Use harsh LED lighting with chrome reflections and geometric lens flares. Sharp digital imagery with holographic overlays and rain-slicked surfaces."

Input: "dreamy watercolor"  
Output: "Soft watercolor aesthetic with pastel roses, sky blues, and golden washes. Gentle diffusion lighting with organic color bleeds and painterly textures. Ethereal, weightless atmosphere with artistic grain overlay."

Input: "claymation"
Output: "Hand-crafted stop-motion claymation with visible fingerprints and matte clay finishes. Warm lighting with practical shadows and miniature set textures. Film grain with 24fps motion blur aesthetic."

KEEP IT CONCISE: The scene content is the priority. Your visual direction should enhance, not dominate.`;

    const inputText = `User's style/mood input: "${masterPrompt}"
Artist: "${artist || 'the artist'}"
Song: "${songName || 'the song'}"

Transform this into a comprehensive visual direction following the required format.`;

    const body = {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText }
      ],
      max_tokens: 500,
      temperature: 0.7
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

    const transformedPrompt = data.choices[0]?.message?.content?.trim();

    if (!transformedPrompt) {
      return NextResponse.json({ error: 'No transformed prompt returned' }, { status: 500 });
    }

    return NextResponse.json({ transformedPrompt });
  } catch (err) {
    console.error('Transform master prompt error:', err);
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}