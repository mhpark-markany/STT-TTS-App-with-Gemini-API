import React, { useState, useRef, useEffect } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { fileToBase64, blobToBase64 } from '../utils/audioUtils';
import Button from './Button';

// Add types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type STTMode = 'upload' | 'mic';

const STTView: React.FC = () => {
  const [mode, setMode] = useState<STTMode>('upload');
  
  // File Mode States
  const [file, setFile] = useState<File | null>(null);
  
  // Mic Mode States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [webSpeechResult, setWebSpeechResult] = useState<string>('');
  const [accumulatedWebSpeech, setAccumulatedWebSpeech] = useState<string>(''); // New state for history
  const [recordingTime, setRecordingTime] = useState<number>(0);

  // Common States
  const [geminiResult, setGeminiResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timing States
  const [geminiTime, setGeminiTime] = useState<number | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingResources();
    };
  }, []);

  const stopRecordingResources = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const tracks = mediaRecorderRef.current?.stream?.getTracks();
    tracks?.forEach(track => track.stop());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.match('audio.*')) {
        setError('오디오 파일만 업로드해주세요 (mp3, m4a 등).');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setGeminiResult('');
      setGeminiTime(null);
    }
  };

  const handleTranscribeFile = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setGeminiResult('');
    setGeminiTime(null);

    const startTime = performance.now();

    try {
      const base64 = await fileToBase64(file);
      const result = await transcribeAudio(base64, file.type);
      const endTime = performance.now();
      
      setGeminiResult(result);
      setGeminiTime(endTime - startTime);
    } catch (err: any) {
      setError(err.message || '음성 변환 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    
    // Move current session result to accumulated history before clearing for new session
    if (webSpeechResult) {
      setAccumulatedWebSpeech(prev => prev + (prev ? '\n' : '') + webSpeechResult);
    }
    setWebSpeechResult('');
    
    setGeminiResult('');
    setGeminiTime(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    // Check Browser Support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("이 브라우저는 Web Speech API를 지원하지 않습니다.");
      return;
    }

    try {
      // 1. Setup MediaRecorder for Gemini
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();

      // 2. Setup SpeechRecognition for Web API
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        // Use newline to stack segments visually
        const currentFull = Array.from(event.results)
           .map((r: any) => r[0].transcript)
           .join('\n');
        setWebSpeechResult(currentFull);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
      };

      recognition.start();
      recognitionRef.current = recognition;

      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError("마이크 접근 권한이 필요합니다.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Stop Web Speech
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop Media Recorder and Trigger Gemini
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

        // Process with Gemini
        await processRecordedAudio(audioBlob);
      };
      mediaRecorderRef.current.stop();
    }
  };

  const processRecordedAudio = async (blob: Blob) => {
    setIsLoading(true);
    const startTime = performance.now();
    try {
      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || 'audio/webm';
      const result = await transcribeAudio(base64, mimeType);
      
      const endTime = performance.now();
      setGeminiResult(result);
      setGeminiTime(endTime - startTime);
    } catch (err: any) {
      setError(err.message || "Gemini 변환 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setGeminiResult('');
    setWebSpeechResult('');
    setAccumulatedWebSpeech('');
    setError(null);
    setGeminiTime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return null;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Combine accumulated history and current session text
  const fullWebSpeechDisplay = 
    accumulatedWebSpeech + 
    (accumulatedWebSpeech && webSpeechResult ? '\n' : '') + 
    webSpeechResult;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">음성 인식 (STT)</h2>
        <p className="text-slate-500">Gemini AI와 브라우저의 기본 음성 인식을 비교해보세요.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => { setMode('upload'); handleClear(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            파일 업로드
          </button>
          <button
            onClick={() => { setMode('mic'); handleClear(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'mic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            실시간 비교 (마이크)
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Upload Mode UI */}
        {mode === 'upload' && (
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3, .m4a, audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="audio-upload"
              />
              <label htmlFor="audio-upload" className="cursor-pointer w-full h-full block">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`p-3 rounded-full ${file ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    {file ? (
                      <span className="font-semibold text-indigo-900">{file.name}</span>
                    ) : (
                      <span className="font-medium text-slate-600">클릭하여 파일 업로드 (mp3, m4a)</span>
                    )}
                  </div>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
               {file && <Button variant="secondary" onClick={handleClear} disabled={isLoading}>초기화</Button>}
              <Button onClick={handleTranscribeFile} disabled={!file || isLoading} isLoading={isLoading}>변환 시작</Button>
            </div>
          </div>
        )}

        {/* Mic Mode UI */}
        {mode === 'mic' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8 bg-slate-50 rounded-xl border border-slate-100">
               <div className={`text-4xl font-mono font-bold transition-colors ${isRecording ? 'text-red-500' : 'text-slate-400'}`}>
                 {formatTime(recordingTime)}
               </div>
               
               {!isRecording ? (
                 <button 
                   onClick={startRecording}
                   className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                 </button>
               ) : (
                  <button 
                   onClick={stopRecording}
                   className="h-16 w-16 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                 >
                    <div className="h-6 w-6 bg-white rounded-sm" />
                 </button>
               )}
               <p className="text-sm text-slate-500">
                 {isRecording ? "녹음 중... 말해보세요!" : "버튼을 눌러 녹음을 시작하세요"}
               </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Results Section - Visible in both modes for comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Web Speech Result */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in-up ${mode === 'upload' ? 'opacity-70' : ''}`}>
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">Browser</span>
              <h3 className="font-semibold text-slate-700">Web Speech API</h3>
            </div>
            <span className="text-xs font-mono text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-100">
              {mode === 'mic' ? 'Real-time' : 'N/A'}
            </span>
          </div>
          <div className="p-6 flex-1">
             {mode === 'upload' ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                 </svg>
                 <p className="text-sm">파일 입력은 지원하지 않습니다</p>
               </div>
             ) : (
               <p className="whitespace-pre-wrap text-slate-700 leading-relaxed min-h-[100px]">
                 {fullWebSpeechDisplay || <span className="text-slate-300 italic">음성을 기다리는 중...</span>}
               </p>
             )}
          </div>
        </div>

        {/* Gemini Result */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in-up delay-75">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">Gemini</span>
                <h3 className="font-semibold text-slate-700">Gemini 3 Flash</h3>
            </div>
            {geminiTime && (
              <span className="text-xs font-mono text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                ⏱️ {formatDuration(geminiTime)}
              </span>
            )}
          </div>
          <div className="p-6 flex-1 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[100px] text-indigo-600">
                  <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 font-medium">분석 중...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="whitespace-pre-wrap text-slate-700 leading-relaxed min-h-[100px]">
                  {geminiResult || <span className="text-slate-300 italic">결과가 여기에 표시됩니다.</span>}
                </p>
                {geminiResult && (
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(geminiResult)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      텍스트 복사
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default STTView;