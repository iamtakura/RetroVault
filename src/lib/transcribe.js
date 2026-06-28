/**
 * Transcribes an audio blob using Groq Whisper Large v3 Turbo
 * @param {Blob} audioBlob - The audio recording as a webm blob
 * @returns {Promise<string>} - The transcription text
 */
export async function transcribeAudio(audioBlob, language = 'auto') {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('Groq API Key is not configured. Please add VITE_GROQ_API_KEY to your .env file.');
  }

  const formData = new FormData();
  const ext = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');
  if (language && language !== 'auto') {
    formData.append('language', language);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(`Groq API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data.text) {
      throw new Error('Transcription succeeded but returned empty text.');
    }

    return data.text;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}
