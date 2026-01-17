import React, { useState, useEffect, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import Button from './Button';

const TTSView: React.FC = () => {
  const [text, setText] = useState<string>('');
  
  // Gemini State
  const [geminiAudioUrl, setGeminiAudioUrl] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [geminiTime, setGeminiTime] = useState<number | null>(null);
  
  // Browser State
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState<boolean>(false);
  const [browserVoiceName, setBrowserVoiceName] = useState<string>('');
  const [browserTime, setBrowserTime] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (geminiAudioUrl) {
        URL.revokeObjectURL(geminiAudioUrl);
      }
      window.speechSynthesis.cancel();
    };
  }, [geminiAudioUrl]);

  // Handle Native Browser TTS
  const speakNative = () => {
    if (!text.trim()) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    setBrowserTime(null);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    
    // Attempt to find a Korean voice
    const voices = window.speechSynthesis.getVoices();
    const krVoice = voices.find(v => v.lang.includes('ko'));
    if (krVoice) {
      utterance.voice = krVoice;
      setBrowserVoiceName(krVoice.name);
    } else {
      setBrowserVoiceName('기본 한국어 음성 (System Default)');
    }

    const startTime = performance.now();

    utterance.onstart = () => {
      const endTime = performance.now();
      setBrowserTime(endTime - startTime);
      setIsBrowserSpeaking(true);
    };
    
    utterance.onend = () => setIsBrowserSpeaking(false);
    utterance.onerror = () => setIsBrowserSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Handle Gemini TTS
  const generateGemini = async () => {
    if (!text.trim()) return;

    setIsGeminiLoading(true);
    setError(null);
    setGeminiTime(null);
    
    if (geminiAudioUrl) {
      URL.revokeObjectURL(geminiAudioUrl);
      setGeminiAudioUrl(null);
    }

    const startTime = performance.now();

    try {
      const wavBlob = await generateSpeech(text);
      const endTime = performance.now();
      
      const url = URL.createObjectURL(wavBlob);
      setGeminiAudioUrl(url);
      setGeminiTime(endTime - startTime);
    } catch (err: any) {
      setError(err.message || '음성 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const handleCompare = () => {
    // 1. Start Browser TTS immediately
    speakNative();
    // 2. Start Gemini Generation in background
    generateGemini();
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return null;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">음성 합성 (TTS)</h2>
        <p className="text-slate-500">브라우저 내장 TTS와 Gemini의 자연스러운 음성을 비교해보세요.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="space-y-6">
          
          {/* Text Input */}
          <div className="space-y-2">
            <label htmlFor="tts-input" className="block text-sm font-medium text-slate-700">
              텍스트 입력
            </label>
            <textarea
              id="tts-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 읽어줄 내용을 입력하세요..."
              className="w-full h-32 p-4 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-shadow text-lg leading-relaxed text-slate-800 placeholder:text-slate-400"
            />
            <div className="text-right text-xs text-slate-400">
              {text.length} 글자
            </div>
          </div>

          {/* Comparison Controls */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Button 
              variant="secondary"
              onClick={speakNative} 
              disabled={!text.trim() || isBrowserSpeaking}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Browser TTS 듣기
              </span>
            </Button>
            
            <Button 
              onClick={generateGemini} 
              disabled={!text.trim() || isGeminiLoading}
              isLoading={isGeminiLoading}
            >
              <span className="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Gemini TTS 생성
              </span>
            </Button>

            <Button 
              variant="primary"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 border-none"
              onClick={handleCompare} 
              disabled={!text.trim() || isGeminiLoading}
            >
              동시 실행 (비교)
            </Button>
          </div>
        </div>
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

      {/* Comparison Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Browser Result */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-fade-in-up">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">Browser</span>
                <h3 className="font-semibold text-slate-700">Native API</h3>
            </div>
            {browserTime && (
              <span className="text-xs font-mono text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-100">
                ⏱️ {formatDuration(browserTime)}
              </span>
            )}
          </div>
          <div className="p-6 flex flex-col items-center justify-center space-y-4 flex-1">
              <div className={`p-4 rounded-full transition-all duration-500 ${isBrowserSpeaking ? 'bg-orange-500 shadow-lg scale-110' : 'bg-slate-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isBrowserSpeaking ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-800">{isBrowserSpeaking ? "재생 중..." : "대기 중"}</p>
                {browserVoiceName && <p className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{browserVoiceName}</p>}
              </div>
              <button onClick={speakNative} disabled={!text.trim()} className="text-sm text-orange-600 font-medium hover:text-orange-700 underline disabled:opacity-50 disabled:cursor-not-allowed">
                다시 재생
              </button>
          </div>
        </div>

        {/* Gemini Result */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-fade-in-up delay-75">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">Gemini</span>
                <h3 className="font-semibold text-slate-700">Generated .WAV</h3>
            </div>
            {geminiTime && (
              <span className="text-xs font-mono text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                ⏱️ {formatDuration(geminiTime)}
              </span>
            )}
          </div>
          <div className="p-6 flex flex-col items-center justify-center space-y-4 flex-1">
              {isGeminiLoading ? (
                <div className="flex items-center justify-center text-indigo-600">
                  <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                </div>
              ) : geminiAudioUrl ? (
                <>
                  <audio 
                    ref={audioRef}
                    controls 
                    src={geminiAudioUrl} 
                    className="w-full h-10 outline-none rounded-lg shadow-sm"
                  />
                  <a 
                    href={geminiAudioUrl} 
                    download="generated_speech.wav"
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                  >
                    파일 다운로드 (.wav)
                  </a>
                </>
              ) : (
                <p className="text-slate-400 text-sm">생성 대기 중...</p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TTSView;