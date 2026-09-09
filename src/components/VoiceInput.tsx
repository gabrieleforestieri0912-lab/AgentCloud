"use client";

/**
 * Voice input component for chat:
 * - Microphone button: speech-to-text dictation (fills input with transcribed text)
 * - Voice mode button: real-time voice conversation (speaks response, records voice)
 *
 * Uses Web Speech API (SpeechRecognition + SpeechSynthesis).
 * Falls back gracefully when not supported.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onVoiceModeToggle?: (active: boolean) => void;
  disabled?: boolean;
  isVoiceMode?: boolean;
}

export default function VoiceInput({
  onTranscript,
  onVoiceModeToggle,
  disabled = false,
  isVoiceMode = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startDictation = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "it-IT"; // Default Italian, will adapt

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        onTranscript(final);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [onTranscript]);

  const stopDictation = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  const toggleDictation = useCallback(() => {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  }, [isRecording, startDictation, stopDictation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Interim transcript indicator */}
      {interimTranscript && (
        <span className="max-w-[120px] truncate text-[10px] text-neutral-500 italic">
          {interimTranscript}
        </span>
      )}

      {/* Microphone button for dictation */}
      <button
        type="button"
        onClick={toggleDictation}
        disabled={disabled}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          isRecording
            ? "bg-red-500/20 text-red-400 animate-pulse"
            : "text-neutral-400 hover:text-white hover:bg-white/5"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecording ? "Ferma dettatura" : "Dettatura vocale"}
        aria-label={isRecording ? "Ferma dettatura" : "Dettatura vocale"}
      >
        {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Voice mode toggle */}
      {onVoiceModeToggle && (
        <button
          type="button"
          onClick={() => onVoiceModeToggle(!isVoiceMode)}
          disabled={disabled}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            isVoiceMode
              ? "bg-brand-500/20 text-brand-400"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isVoiceMode ? "Disattiva modalità vocale" : "Attiva modalità vocale"}
          aria-label={isVoiceMode ? "Disattiva modalità vocale" : "Attiva modalità vocale"}
        >
          <Volume2 size={16} />
        </button>
      )}
    </div>
  );
}
