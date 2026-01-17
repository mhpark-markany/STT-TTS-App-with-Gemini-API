export enum AppTab {
  STT = 'STT',
  TTS = 'TTS',
}

export interface SttResult {
  text: string;
  timestamp: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export type AudioMimeType = 'audio/mp3' | 'audio/mpeg' | 'audio/m4a' | 'audio/mp4' | 'audio/x-m4a';
