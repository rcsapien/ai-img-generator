import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  console.log('==== /api/generate-parallel HIT ====');
  try {
    const { prompts } = await req.json(); // Array of prompts
    
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Prompts array is required' }, { status: 400 });
    }

    console.log(`[generate-parallel] Processing ${prompts.length} images in parallel`);

    // Generate all images in parallel
    const imagePromises = prompts.map(async (prompt: string, index: number) => {
      try {
        console.log(`[generate-parallel] Starting image ${index + 1}`);
        
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard', // Faster than 'high'
          response_format: 'b64_json'
        });

        console.log(`[generate-parallel] Completed image ${index + 1}`);
        
        return {
          index,
          success: true,
          data: response.data[0].b64_json,
          url: `data:image/png;base64,${response.data[0].b64_json}`
        };
      } catch (error) {
        console.error(`[generate-parallel] Error generating image ${index + 1}:`, error);
        return {
          index,
          success: false,
          error: String(error)
        };
      }
    });

    // Wait for all images to complete
    const results = await Promise.all(imagePromises);
    
    console.log(`[generate-parallel] All ${prompts.length} images completed`);
    
    return NextResponse.json({ 
      results,
      total: prompts.length,
      successful: results.filter(r => r.success).length
    });

  } catch (err) {
    console.error('Parallel generation error:', err);
    return NextResponse.json({ 
      error: 'Error in parallel generation', 
      details: String(err) 
    }, { status: 500 });
  }
}