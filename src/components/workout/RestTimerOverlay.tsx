import { useState, useEffect, useRef } from 'react';
import { Timer, Plus, Minus, X, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface RestTimerOverlayProps {
  initialSeconds: number;
  onFinish: () => void;
  onClose: () => void;
}

export function RestTimerOverlay({
  initialSeconds,
  onFinish,
  onClose,
}: RestTimerOverlayProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // High precision target timestamp ref
  const targetEndTimeRef = useRef<number>(0);
  const hasFinishedRef = useRef<boolean>(false);
  const lastTickedSecondRef = useRef<number>(-1);

  // Stable callback refs updated via effects to satisfy react-hooks/refs rules
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Accurate wall-clock countdown loop - runs strictly per initialSeconds mount
  useEffect(() => {
    targetEndTimeRef.current = Date.now() + initialSeconds * 1000;
    hasFinishedRef.current = false;

    const updateCountdown = () => {
      if (hasFinishedRef.current) return;

      const now = Date.now();
      const remainingMs = targetEndTimeRef.current - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsLeft(remainingSecs);

      // Play tick sound for final countdown: 3, 2, 1
      if (
        remainingSecs <= 3 &&
        remainingSecs > 0 &&
        remainingSecs !== lastTickedSecondRef.current
      ) {
        lastTickedSecondRef.current = remainingSecs;
        if (soundEnabledRef.current) {
          soundManager.playTick();
        }
      }

      if (remainingMs <= 0) {
        hasFinishedRef.current = true;
        if (soundEnabledRef.current) {
          soundManager.playRestCompletedChime();
        }
        onFinishRef.current();
      }
    };

    const interval = setInterval(updateCountdown, 150);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  const addTime = (delta: number) => {
    const now = Date.now();
    const currentTarget = targetEndTimeRef.current || (now + secondsLeft * 1000);
    const newTarget = currentTarget + delta * 1000;
    targetEndTimeRef.current = newTarget;

    const remainingMs = newTarget - now;
    const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remainingSecs <= 0) {
      hasFinishedRef.current = true;
      if (soundEnabledRef.current) {
        soundManager.playRestCompletedChime();
      }
      onFinishRef.current();
      return;
    }

    setSecondsLeft(remainingSecs);
    setTotalSeconds(prev => Math.max(remainingSecs, prev + delta));
  };

  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
      : 100;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 animate-slide-up max-w-sm sm:w-80 mx-auto sm:mx-0">
      <div
        className="rounded-3xl p-4 sm:p-5 shadow-2xl border backdrop-blur-xl relative overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--accent)',
          boxShadow: '0 20px 40px -15px var(--accent)',
        }}
      >
        {/* Progress Background bar */}
        <div
          className="absolute bottom-0 left-0 h-1.5 transition-all duration-300 ease-out"
          style={{
            background: 'var(--accent)',
            width: `${100 - progressPercent}%`,
          }}
        />

        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
            >
              <Timer className="w-4 h-4 animate-pulse" />
            </div>
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              Tempo de Descanso
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
              title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-red-400" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          {/* Large Countdown display */}
          <div
            className="text-3xl font-black font-mono tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {formattedTime}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => addTime(-15)}
              className="px-2.5 py-2 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[38px] flex items-center"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Minus className="w-3 h-3 mr-0.5" /> 15s
            </button>
            <button
              onClick={() => addTime(15)}
              className="px-2.5 py-2 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[38px] flex items-center"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Plus className="w-3 h-3 mr-0.5" /> 15s
            </button>
            <button
              onClick={() => {
                hasFinishedRef.current = true;
                onFinishRef.current();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[38px]"
              style={{ background: 'var(--accent)' }}
            >
              Pular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
