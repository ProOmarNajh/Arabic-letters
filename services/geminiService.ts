import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LetterContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for structured output
const letterSchema = {
  type: Type.OBJECT,
  properties: {
    letter: { type: Type.STRING, description: "The Arabic letter being taught" },
    name: { type: Type.STRING, description: "The name of the letter in English (e.g., Alif)" },
    storyTitle: { type: Type.STRING, description: "A short, fun title for the story in Arabic" },
    story: { type: Type.STRING, description: "A very short, simple 3-sentence story in Arabic utilizing the letter often." },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          arabic: { type: Type.STRING, description: "The word in Arabic" },
          english: { type: Type.STRING, description: "English translation" },
          position: { type: Type.STRING, enum: ["beginning", "middle", "end"] },
        },
        required: ["arabic", "english", "position"],
      },
      description: "Exactly 3 words: one with letter at start, one middle, one end.",
    },
  },
  required: ["letter", "name", "story", "storyTitle", "words"],
};

export const generateLetterData = async (letter: string): Promise<LetterContent> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create educational content for a children's flashcard app for the Arabic letter: ${letter}.
      Make it suitable for a 5-year-old. The story should be cute and simple.
      The words must clearly demonstrate the letter in the beginning, middle, and end positions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: letterSchema,
        systemInstruction: "You are a helpful and cheerful Arabic language teacher for children.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as LetterContent;
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback data if API fails or no key
    return {
      letter: letter,
      name: "Unknown",
      storyTitle: "قصة الحرف",
      story: `هذه قصة قصيرة عن حرف ${letter}.`,
      words: [
        { arabic: `${letter}---`, english: "Start", position: "beginning" },
        { arabic: `-${letter}-`, english: "Middle", position: "middle" },
        { arabic: `---${letter}`, english: "End", position: "end" },
      ]
    };
  }
};

export const generateStoryAudio = async (text: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-preview-tts for high quality narration
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good general voice
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Gemini returns raw PCM (24kHz, 1 channel, 16-bit).
        // We must wrap it in a WAV container for browsers to play it via standard Audio element.
        return getWavDataUri(base64Audio, 24000);
      }
      return null;
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
};

export const generateLetterVideo = async (letter: string, letterName: string): Promise<string | null> => {
    try {
        // Create a new instance with the specific key if needed, but here we use the global one
        // assuming the App component handles the Key Selection UI logic which injects the key into env if needed
        // or we rely on the user having selected it via window.aistudio.
        
        // Important: For Veo, we need to ensure we are using the key from the selection dialog if available.
        // In this simulated env, process.env.API_KEY is what we have. 
        // The UI will handle the window.aistudio.openSelectKey() flow.
        
        // Create a new client instance to ensure we pick up any fresh keys
        const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

        let operation = await videoAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `A cute, magical 3D cartoon animation of the Arabic letter ${letterName} (${letter}) floating in a bright, colorful playground. Pixar style, vibrant colors, particle effects, happy atmosphere.`,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            operation = await videoAi.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            // Fetch the actual video bytes
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
        return null;

    } catch (error) {
        console.error("Video Gen Error", error);
        throw error; 
    }
}

// Helper to add WAV header to raw PCM data and return Data URI
function getWavDataUri(base64Pcm: string, sampleRate: number): string {
  // 1. Clean the base64 string (remove newlines/spaces that might break atob)
  const cleanBase64 = base64Pcm.replace(/[\s\r\n]+/g, '');
  
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true); // file length - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * BlockAlign)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  // Combine header and data
  const wavBytes = new Uint8Array(44 + len);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(bytes, 44);

  // Convert back to base64 for Data URI using chunked processing to avoid stack overflow
  let binary = '';
  const chunk = 0x8000; // 32k chunks
  for (let i = 0; i < wavBytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(wavBytes.subarray(i, Math.min(i + chunk, wavBytes.length))));
  }
  
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}