/**
 * Generates descriptive tags for a given voice memo transcript using Groq LLM
 * @param {string} transcript - The transcribed text of the recording
 * @returns {Promise<string[]>} - An array of 2-4 lowercase tag strings
 */
export async function generateTags(transcript) {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new Error('Groq API Key is unconfigured');
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `You are a tagging system. Given a voice memo \ntranscript, return ONLY a raw JSON array of 2-4 short tags describing \nthe topic and mood. Tags must be lowercase, 1-2 words max. \nNo explanation, no markdown, no backticks, no code fences. \nOnly the raw JSON array itself.\nExample output: ["product idea","urgent","creative"]`
            },
            {
              role: 'user',
              content: transcript
            }
          ],
          max_tokens: 60,
          temperature: 0.3
        })
      }
    );

    const data = await response.json();
    const content = data.choices[0].message.content
      .trim()
      .replace(/```json|```/g, '')
      .trim();

    const tags = JSON.parse(content);
    
    if (Array.isArray(tags) && tags.length > 0) {
      return tags.map(tag => String(tag).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim());
    }
    throw new Error('Invalid tags array');

  } catch (err) {
    console.error('[TAGS] Error name:', err.name);
    console.error('[TAGS] Error message:', err.message);
    console.error('[TAGS] Full error:', err);
    // Fallback: derive tag from first meaningful word
    const fallback = transcript
      .split(' ')
      .find(w => w.length > 4) || 'idea';
    return [fallback.toLowerCase().replace(/[^a-z]/g, '')];
  }
}
