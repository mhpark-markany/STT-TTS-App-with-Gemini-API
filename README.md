# Gemini Voice Studio

Google Gemini API를 활용한 강력한 음성 인식(STT) 및 음성 합성(TTS) 웹 애플리케이션입니다. 브라우저의 기본 Web Speech API와 Google의 최신 Gemini AI 모델의 성능, 품질, 그리고 처리 속도(Latency)를 실시간으로 비교할 수 있습니다.

## 🌟 주요 기능

### 1. 음성 인식 (Speech-to-Text, STT)
*   **두 가지 모드 지원:**
    *   **파일 업로드:** `.mp3`, `.m4a` 등 오디오 파일을 업로드하여 텍스트로 변환합니다.
    *   **실시간 마이크:** 마이크를 통해 실시간으로 음성을 입력받아 텍스트로 변환합니다.
*   **성능 비교:**
    *   **Browser:** 브라우저 내장 `Web Speech API`를 이용한 실시간 인식.
    *   **Gemini:** `gemini-3-flash-preview` 모델을 이용한 고정밀 인식.
*   **기능적 특징:**
    *   실시간 녹음 시 텍스트가 갱신되지 않고 누적되어 대화 내용을 기록합니다.
    *   각 엔진별 처리 소요 시간(Latency)을 측정하여 표시합니다 (⏱️ 초 단위).

### 2. 음성 합성 (Text-to-Speech, TTS)
*   **텍스트 입력:** 원하는 텍스트를 입력하여 즉시 음성으로 변환할 수 있습니다.
*   **성능 비교:**
    *   **Browser:** 브라우저 내장 `SpeechSynthesis API`를 사용한 즉각적인 발화.
    *   **Gemini:** `gemini-2.5-flash-preview-tts` 모델을 사용하여 사람과 유사한 자연스러운 음성 생성 (.wav 파일).
*   **기능적 특징:**
    *   생성된 오디오 파일 다운로드 제공.
    *   브라우저와 Gemini를 동시에 실행하여 품질 및 속도 비교 가능.

## 🛠 기술 스택

*   **Frontend Framework:** React 19 (TypeScript)
*   **Styling:** Tailwind CSS
*   **AI SDK:** `@google/genai` (Google Gemini API)
*   **Audio Processing:** Web Audio API, MediaRecorder API

## 🚀 시작하기

이 프로젝트를 실행하기 위해서는 Google AI Studio에서 발급받은 API 키가 필요합니다.

### 1. API 키 설정
프로젝트 환경 변수(`process.env.API_KEY`)에 유효한 Google Gemini API 키가 설정되어 있어야 합니다.

### 2. 모델 정보
이 애플리케이션은 다음 모델을 사용합니다:
*   **STT:** `gemini-3-flash-preview` (빠르고 정확한 텍스트 변환)
*   **TTS:** `gemini-2.5-flash-preview-tts` (자연스러운 한국어 발화)

## 📂 프로젝트 구조

```
/
├── components/       # UI 컴포넌트 (Button, STTView, TTSView)
├── services/         # Gemini API 연동 로직 (geminiService.ts)
├── utils/            # 오디오 인코딩/디코딩 유틸리티 (audioUtils.ts)
├── App.tsx           # 메인 애플리케이션 레이아웃
├── index.html        # HTML 진입점 및 importmap 설정
├── metadata.json     # 권한 설정 (마이크 등)
└── types.ts          # 타입 정의
```

## ⚠️ 주의 사항

*   **마이크 권한:** 실시간 STT 기능을 사용하려면 브라우저의 마이크 접근 권한을 허용해야 합니다.
*   **브라우저 호환성:** Web Speech API는 브라우저(Chrome, Safari 등)에 따라 지원 여부 및 성능 차이가 있을 수 있습니다. Chrome 브라우저 사용을 권장합니다.

---
© 2025 Gemini Voice Studio. Powered by Google Gemini API.
