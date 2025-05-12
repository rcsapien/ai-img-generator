import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('==== /api/generate HIT ====');
  try {
    const contentType = req.headers.get('content-type') || '';
    let prompt = '';
    let n, size, background, outputFormat, quality, moderation;
    let imageFile: File | null = null;
    let base64Image: string | null = null;
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      n = formData.get('n');
      size = formData.get('size');
      background = formData.get('background');
      outputFormat = formData.get('outputFormat');
      quality = formData.get('quality');
      moderation = formData.get('moderation');
      imageFile = formData.get('image') as File;
      // Log FormData keys and image details
      console.log('[generate API] Content-Type: multipart/form-data');
      console.log('[generate API] FormData keys:', Array.from(formData.keys()));
      if (imageFile) {
        console.log('[generate API] Received image:', {
          type: imageFile.type,
          size: imageFile.size,
          name: imageFile.name
        });
      } else {
        console.log('[generate API] No image received');
      }
      console.log('[generate API] Received prompt:', prompt);
    } else {
      const body = await req.json();
      prompt = body.prompt;
      n = body.n;
      size = body.size;
      background = body.background;
      outputFormat = body.outputFormat;
      quality = body.quality;
      moderation = body.moderation;
      base64Image = body.image;
      // Log base64 image info
      if (base64Image) {
        const matches = base64Image.match(/^data:(.+);base64,(.*)$/);
        if (matches) {
          const mime = matches[1];
          const b64 = matches[2];
          console.log('[generate API] Received base64 image:', {
            type: mime,
            size: b64.length * 3 / 4 // approx decoded size
          });
        } else {
          console.log('[generate API] Invalid base64 image format');
        }
      } else {
        console.log('[generate API] No base64 image received');
      }
      console.log('[generate API] Received prompt:', prompt);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    const endpoint = 'https://api.openai.com/v1/images/generations';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const openaiBody = JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n,
      size,
      background,
      output_format: outputFormat,
      quality,
      moderation
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: openaiBody
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: 'Error generating image', details: String(err) }, { status: 500 });
  }
}
