import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('==== /api/edit HIT ====');
  try {
    // Accept both form-data (for file upload) and JSON (for base64)
    let imageFile: File | null = null;
    let maskFile: File | null = null;
    let prompt = '';
    let body: any;

    const contentType = req.headers.get('content-type') || '';
    console.log('[edit API] Content-Type:', contentType);
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      imageFile = formData.get('image') as File;
      maskFile = formData.get('mask') as File;
      // Log FormData keys and image details
      console.log('[edit API] FormData keys:', Array.from(formData.keys()));
      if (imageFile) {
        console.log('[edit API] Received image:', {
          type: imageFile.type,
          size: imageFile.size,
          name: imageFile.name
        });
      } else {
        console.log('[edit API] No image received');
      }
      console.log('[edit API] Received prompt:', prompt);
    } else {
      body = await req.json();
      prompt = body.prompt;
      // Accept base64 image string (with data URL prefix)
      if (body.image) {
        const matches = body.image.match(/^data:(.+);base64,(.*)$/);
        if (!matches) throw new Error('Invalid base64 image');
        const [, mime, b64] = matches;
        const buffer = Buffer.from(b64, 'base64');
        imageFile = new File([buffer], 'image.png', { type: mime });
      }
      if (body.mask) {
        const matches = body.mask.match(/^data:(.+);base64,(.*)$/);
        if (!matches) throw new Error('Invalid base64 mask');
        const [, mime, b64] = matches;
        const buffer = Buffer.from(b64, 'base64');
        maskFile = new File([buffer], 'mask.png', { type: mime });
      }
    }

    if (!imageFile || !prompt) {
      console.error("Missing required fields", { hasImage: !!imageFile, prompt });
      return NextResponse.json({ error: 'Image and prompt are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    // Build multipart form data
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('image', imageFile);
    if (maskFile) form.append('mask', maskFile);
    form.append('model', 'gpt-image-1');
    // Pass through any additional options (optional)
    if (body) {
      ['n', 'size', 'background', 'output_format', 'quality', 'moderation'].forEach((k) => {
        if (body[k]) form.append(k, body[k]);
      });
    }

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // 'Content-Type' will be set automatically by fetch for FormData
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI edit error", data);
    }
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: 'Error editing image', details: String(err) }, { status: 500 });
  }
}
