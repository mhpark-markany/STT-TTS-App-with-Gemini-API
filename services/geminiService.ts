import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64ToBytes, decodeAudioData, audioBufferToWav } from "../utils/audioUtils";

// Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: 'Transcribe this audio file accurately. Return only the transcription text in the original language of the audio.',
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No transcription returned from Gemini.');
    }
    return text;
  } catch (error) {
    console.error("STT Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<Blob> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is a good general voice, or 'Puck', 'Charon'
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini TTS.");
    }

    // Decode Raw PCM
    // Cast window to any to access webkitAudioContext for Safari compatibility without TS errors
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const pcmBytes = decodeBase64ToBytes(base64Audio);
    const audioBuffer = await decodeAudioData(pcmBytes, audioContext, 24000, 1);
    
    // Convert to WAV Blob for easy playback in UI
    const wavBlob = audioBufferToWav(audioBuffer);
    
    // Clean up context
    audioContext.close();

    return wavBlob;

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};