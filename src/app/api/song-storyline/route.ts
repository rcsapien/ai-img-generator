import { NextRequest, NextResponse } from 'next/server';

// YouTube search function
async function searchYouTube(songName: string) {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    console.log('YouTube API key not found, skipping search');
    return null;
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(songName + ' official music video')}&type=video&maxResults=5&key=${youtubeApiKey}`;
    
    console.log(`Searching YouTube for: ${songName}`);
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('YouTube API error:', data);
      return null;
    }

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      console.log(`Found YouTube video: ${video.snippet.title}`);
      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        description: video.snippet.description,
        thumbnails: video.snippet.thumbnails
      };
    }
  } catch (error) {
    console.error('YouTube search error:', error);
  }
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { songName } = await req.json();
    if (!songName) {
      return NextResponse.json({ error: 'songName is required' }, { status: 400 });
    }
    
    // Extract artist name from song name if provided in format "Song - Artist" or "Artist - Song"
    let artistName = '';
    if (songName.includes(' - ')) {
      const parts = songName.split(' - ');
      // Common formats: "Artist - Song" or "Song - Artist"
      // We'll try to detect which one based on search results
      artistName = parts[0]; // Will be refined after YouTube search
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 401 });
    }

    // Search YouTube for the song
    const youtubeVideo = await searchYouTube(songName);
    
    let songContext = '';
    if (youtubeVideo) {
      // Extract artist from YouTube channel title if not already set
      if (!artistName && youtubeVideo.channelTitle) {
        // Remove "VEVO", "Official", etc. from channel names
        artistName = youtubeVideo.channelTitle
          .replace(/VEVO$/i, '')
          .replace(/Official$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      songContext = `YouTube Video Found: "${youtubeVideo.title}" by ${youtubeVideo.channelTitle}\nDescription: ${youtubeVideo.description.substring(0, 300)}...`;
      console.log('YouTube context:', songContext.substring(0, 200) + '...');
      console.log('Extracted artist name:', artistName);
    }

    const prompt = `You are an award-winning music-video director and creative writer. Create a vivid, scene-by-scene storyboard for a 30-second music video inspired by the song "${songName}"${artistName ? ` by ${artistName}` : ''}.

${songContext ? `SONG CONTEXT: ${songContext}\n` : ''}
${artistName ? `ARTIST NAME: ${artistName}\n` : ''}

IMPORTANT: You have access to web search capabilities. Search for the song's lyrics and content structure to create an accurate storyboard that reflects the actual song narrative and imagery.

SEARCH INSTRUCTIONS: Use web search to find lyrics and song details from sites like:
- AZLyrics, Genius, LyricFind, MetroLyrics for complete lyrics
- Song structure analysis (verse/chorus/bridge timing)
- Specific imagery, metaphors, and narrative elements mentioned in the lyrics
- Key phrases and visual references that should be represented in the video
- The artist's full name if not already provided

CHARACTER CONSISTENCY RULES - CRITICAL FOR IMAGE GENERATION:
- ALWAYS use the artist's full name "${artistName || '[Artist Name]'}" when they appear in scenes
- NEVER use pronouns (he/she/him/her/they) when referring to the artist or any specific person
- ALWAYS use full names for any other specific people mentioned
- Example: Write "${artistName || 'The artist'} walks through the door" not "He walks through the door"
- If the artist appears in multiple scenes, use their full name EVERY TIME

STORYBOARD REQUIREMENTS:
• EXACTLY 15 blocks covering 2-second intervals (0–2s, 2–4s, …, 28–30s – OUTRO)
• For each block provide:
  – A very short scene tag (same line as timestamp)
  – A separate sentence (1-2) describing visuals in rich cinematic detail
• Use evocative language focusing on visuals, camera movement, lighting, color, and mood
• Maintain narrative cohesion across the 30 seconds
• Draw inspiration from the artist's typical themes and visual aesthetic
• Create original content - do not quote or reference specific lyrics

Respond ONLY with the formatted storyline text. No markdown, no code fences, no commentary.`;

    console.log(`Generating storyline for song: ${songName}`);
    console.log('Prompt being sent to Claude:', prompt.substring(0, 200) + '...');
    console.log('Full prompt length:', prompt.length, 'characters');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5
          }
        ],
        messages: [
          { role: 'user', content: prompt }
        ]
      }),
    });

    const data = await claudeRes.json();
    console.log('Claude response status:', claudeRes.status);
    console.log('Claude response headers:', Object.fromEntries(claudeRes.headers.entries()));
    console.log('Claude response data:', JSON.stringify(data, null, 2));
    
    // Check if Claude used web search capabilities
    console.log('🔍 CHECKING FOR WEB SEARCH USAGE...');
    
    if (data.content && Array.isArray(data.content)) {
      console.log('Response content blocks:', data.content.length);
      
      // Look for tool use blocks (web searches)
      const toolUseBlocks = data.content.filter((block: { type: string }) => block.type === 'tool_use');
      if (toolUseBlocks.length > 0) {
        console.log('🌐 WEB SEARCH TOOL USAGE DETECTED!');
        console.log('Number of web searches performed:', toolUseBlocks.length);
        toolUseBlocks.forEach((block: { name: string; input: unknown; id: string }, index: number) => {
          console.log(`Search ${index + 1}:`, {
            tool: block.name,
            input: block.input,
            id: block.id
          });
        });
      }
      
      // Look for tool result blocks (search results)
      const toolResultBlocks = data.content.filter((block: { type: string }) => block.type === 'tool_result');
      if (toolResultBlocks.length > 0) {
        console.log('📊 WEB SEARCH RESULTS DETECTED!');
        toolResultBlocks.forEach((block: { content: unknown; tool_use_id: string }, index: number) => {
          console.log(`Search Result ${index + 1}:`, {
            tool_use_id: block.tool_use_id,
            content_length: typeof block.content === 'string' ? block.content.length : 0,
            content_preview: typeof block.content === 'string' ? 
              block.content.substring(0, 200) + '...' : 
              'Non-string content'
          });
        });
      }
      
      // Check text content for web search references
      const textBlocks = data.content.filter((block: { type: string }) => block.type === 'text');
      if (textBlocks.length > 0) {
        const allText = textBlocks.map((block: { text: string }) => block.text).join(' ');
        
        const webSearchIndicators = [
          'according to web search',
          'based on search results',
          'found online',
          'search indicates',
          'web sources',
          'according to sources',
          'lyrics analysis',
          'song information found'
        ];
        
        const foundIndicators = webSearchIndicators.filter(indicator => 
          allText.toLowerCase().includes(indicator.toLowerCase())
        );
        
        if (foundIndicators.length > 0) {
          console.log('🔍 WEB SEARCH REFERENCES IN TEXT - Found:', foundIndicators);
        } else {
          console.log('❌ No web search references found in text content');
        }
      }
    } else {
      console.log('❌ No content blocks found in response');
    }

    if (!claudeRes.ok) {
      console.error('Claude API error:', data);
      return NextResponse.json({
        error: 'Claude request failed',
        details: data?.error?.message || 'Unknown error',
      }, { status: claudeRes.status });
    }

    // Extract storyline from text blocks (skip tool use/result blocks)
    const textBlocks = data.content?.filter((block: { type: string }) => block.type === 'text') || [];
    const storyline = textBlocks.map((block: { text: string }) => block.text).join('\n').trim();
    
    console.log('Generated storyline length:', storyline.length);
    console.log('Generated storyline preview:', storyline.substring(0, 300) + '...');
    console.log('Full storyline content for analysis:', storyline);

    if (!storyline) {
      return NextResponse.json({ error: 'No storyline returned from model' }, { status: 500 });
    }

    // Return storyline, YouTube video info, and artist name
    return NextResponse.json({ 
      storyline,
      youtubeVideo: youtubeVideo || null,
      artistName: artistName || null
    });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
