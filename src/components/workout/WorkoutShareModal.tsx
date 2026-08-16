import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Flame,
  Clock,
  Dumbbell,
  ArrowLeft,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { activityService } from '../../services/activityService';
import { useToast } from '../../contexts/ToastContext';

export interface WorkoutShareData {
  workoutId?: string;
  workoutName: string;
  muscleGroup?: string;
  studentName?: string;
  userAvatar?: string;
  durationFormatted: string;
  totalVolumeKg: number;
  completedSets: number;
  totalSets: number;
  exercisesCount: number;
  notes?: string;
}

interface WorkoutShareModalProps {
  data: WorkoutShareData | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MESSAGES = [
  '🔥 Treino de hoje pago com sucesso!\n#TreinoPago #FocoTotal',
  '💪 1% melhor a cada dia. Foco e constância!\n#NoPainNoGain #Superacao',
  '🚀 Missão cumprida, disciplina inegociável!\n#GymLife #Evolucao',
  '⚡ Superando todos os limites!\n#TreinoPesado #Foco',
  '🏆 O trabalho duro sempre vence!\n#Shape #Fitness',
];

const EMOJI_CHIPS = ['🔥', '💪', '🚀', '⚡', '🏆', '🏋️', '💯', '🎯', '😤', '🥇'];
const HASHTAG_CHIPS = ['#TreinoPago', '#FocoTotal', '#NoPainNoGain', '#GymLife', '#Evolucao', '#Shape', '#Musculacao'];

const THEMES = [
  {
    id: 'emerald',
    name: 'Neon Emerald',
    bgGradient: ['#064e3b', '#022c22', '#0f172a'],
    accent: '#10b981',
    accentLight: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#a7f3d0',
  },
  {
    id: 'gold',
    name: 'Gold Champion',
    bgGradient: ['#451a03', '#1c1917', '#09090b'],
    accent: '#f59e0b',
    accentLight: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#fde68a',
  },
  {
    id: 'purple',
    name: 'Cyber Violet',
    bgGradient: ['#3b0764', '#1e1b4b', '#0f172a'],
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    badgeBg: 'rgba(139, 92, 246, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#ddd6fe',
  },
  {
    id: 'sunset',
    name: 'Sunset Fire',
    bgGradient: ['#831843', '#431407', '#0f172a'],
    accent: '#f97316',
    accentLight: '#fb923c',
    badgeBg: 'rgba(249, 115, 22, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#fed7aa',
  },
  {
    id: 'midnight',
    name: 'Midnight Pro',
    bgGradient: ['#0f172a', '#1e293b', '#020617'],
    accent: '#38bdf8',
    accentLight: '#7dd3fc',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#bae6fd',
  },
];

export function WorkoutShareModal({ data, isOpen, onClose }: WorkoutShareModalProps) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [customMessage, setCustomMessage] = useState(PRESET_MESSAGES[0]);
  const [showVolume, setShowVolume] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showSets, setShowSets] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Insert emoji or hashtag into textarea
  const handleInsertText = (textToInsert: string) => {
    setCustomMessage(prev => (prev ? `${prev} ${textToInsert}` : textToInsert));
  };

  // Helper to safely trigger a download in all browsers
  const triggerDownload = (filename: string): boolean => {
    if (!canvasRef.current) return false;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 300);
      return true;
    } catch (err) {
      console.error('Error triggering image download:', err);
      return false;
    }
  };

  // Render to Canvas (1080 x 1920 Instagram Story Resolution)
  const drawStoryCanvas = useCallback(async () => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, selectedTheme.bgGradient[0]);
    gradient.addColorStop(0.5, selectedTheme.bgGradient[1]);
    gradient.addColorStop(1, selectedTheme.bgGradient[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial glow behind central badge
    const radialGlow = ctx.createRadialGradient(width / 2, 450, 60, width / 2, 450, 650);
    radialGlow.addColorStop(0, selectedTheme.badgeBg);
    radialGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // Subtle geometric grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Top Header / Admin Configured Gym Brand
    const gymTitle = (settings.gymName || 'ACADEMIA').toUpperCase();
    ctx.textAlign = 'center';
    ctx.fillStyle = selectedTheme.accent;
    ctx.font = '900 44px Inter, system-ui, sans-serif';
    ctx.fillText(`⚡ ${gymTitle}`, width / 2, 190);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText('TREINO CONCLUÍDO', width / 2, 240);

    // 3. Central Trophy / Energy Badge
    const badgeX = width / 2;
    const badgeY = 390;
    const badgeRadius = 95;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = selectedTheme.badgeBg;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = selectedTheme.accent;
    ctx.stroke();

    ctx.font = '76px sans-serif';
    ctx.fillText('🔥', badgeX, badgeY + 28);

    // 4. Workout Name & Muscle Group
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px Inter, system-ui, sans-serif';

    const workoutName = data.workoutName;
    if (workoutName.length > 22) {
      ctx.font = '900 54px Inter, system-ui, sans-serif';
    }
    ctx.fillText(workoutName, width / 2, 590);

    if (data.muscleGroup) {
      // Muscle group pill
      const pillText = `🎯 ${data.muscleGroup.toUpperCase()}`;
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      const pillWidth = ctx.measureText(pillText).width + 60;
      const pillHeight = 56;
      const pillX = (width - pillWidth) / 2;
      const pillY = 635;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 28);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = selectedTheme.accentLight;
      ctx.fillText(pillText, width / 2, pillY + 38);
    }

    // 5. Metrics Grid Card
    const metricsY = 740;
    const metricsWidth = 920;
    const metricsHeight = 440;
    const metricsX = (width - metricsWidth) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(metricsX, metricsY, metricsWidth, metricsHeight, 40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const metricBoxes = [
      ...(showDuration
        ? [{ label: 'TEMPO TOTAL', val: data.durationFormatted, icon: '⏱️' }]
        : []),
      ...(showVolume
        ? [{ label: 'VOLUME TOTAL', val: `${data.totalVolumeKg.toLocaleString('pt-BR')} kg`, icon: '🔥' }]
        : []),
      ...(showSets
        ? [{ label: 'SÉRIES FEITAS', val: `${data.completedSets}/${data.totalSets}`, icon: '⚡' }]
        : []),
      { label: 'EXERCÍCIOS', val: `${data.exercisesCount} exercícios`, icon: '🏋️' },
    ];

    const cols = 2;
    const rows = 2;
    const cellW = metricsWidth / cols;
    const cellH = metricsHeight / rows;

    metricBoxes.slice(0, 4).forEach((m, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = metricsX + col * cellW + cellW / 2;
      const cy = metricsY + row * cellH + cellH / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillText(`${m.icon} ${m.label}`, cx, cy - 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 50px Inter, system-ui, sans-serif';
      ctx.fillText(m.val, cx, cy + 38);
    });

    // 6. User Custom Message & Hashtags Card (Multi-line)
    if (customMessage.trim()) {
      const customCardY = 1230;
      const customCardWidth = 920;
      const customCardHeight = 380;
      const customCardX = (width - customCardWidth) / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(customCardX, customCardY, customCardWidth, customCardHeight, 36);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render multi-line custom message
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';

      const lines = customMessage.split('\n');
      const startLineY = customCardY + 90;
      const lineHeight = 54;

      lines.slice(0, 5).forEach((line, lIdx) => {
        let textToDraw = line;
        while (ctx.measureText(textToDraw).width > customCardWidth - 80 && textToDraw.length > 0) {
          textToDraw = textToDraw.slice(0, -2);
        }
        ctx.fillText(textToDraw, width / 2, startLineY + lIdx * lineHeight);
      });
    }

    // 7. Minimal Clean Footer Branding (GymManager Engine App)
    ctx.fillStyle = selectedTheme.accent;
    ctx.font = '900 32px Inter, system-ui, sans-serif';
    ctx.fillText('⚡ GYMMANAGER PRO', width / 2, 1780);
  }, [data, selectedTheme, customMessage, showVolume, showDuration, showSets, settings.gymName]);

  useEffect(() => {
    if (isOpen && data) {
      void drawStoryCanvas();
    }
  }, [isOpen, data, drawStoryCanvas]);

  if (!isOpen || !data) return null;

  // Log activity in global history for Admin & Instructors
  const logShareActivity = async () => {
    try {
      const athleteName = data.studentName || user?.name || 'Aluno';
      await activityService.log({
        userId: user?.id || 'usr-aluno-001',
        type: 'workout_shared',
        description: `${athleteName} gerou e compartilhou o post do treino "${data.workoutName}" no Instagram`,
        relatedId: data.workoutId,
      });
    } catch {
      // Non-blocking
    }
  };

  // Handle Save Image directly to gallery
  const handleSaveToGallery = async () => {
    setGenerating(true);
    try {
      const filename = `treino-${(data.workoutName || 'gym').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      const ok = triggerDownload(filename);
      if (ok) {
        await logShareActivity();
        toast.success('Imagem salva na sua galeria / pasta de downloads!', 'Salvo na Galeria');
      } else {
        toast.error('Não foi possível gerar a imagem para download.');
      }
    } catch {
      toast.error('Erro ao salvar imagem.');
    } finally {
      setGenerating(false);
    }
  };

  // Robust multi-tier clipboard copy helper (Async Clipboard API + ExecCommand fallback)
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback to execCommand
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('execCommand copy failed:', err);
      return false;
    }
  };

  // Handle Instagram Sharing
  const handleInstagramShare = async () => {
    setGenerating(true);
    const shareText = `🔥 Treino: ${data.workoutName}!\n⏱️ Duração: ${data.durationFormatted}\n💪 Volume: ${data.totalVolumeKg}kg\n\n${customMessage}`;

    try {
      // 1. Copy caption text with robust fallback
      await copyToClipboard(shareText);

      // 2. Download image to device
      const filename = `treino-instagram-${Date.now()}.png`;
      triggerDownload(filename);

      // 3. Log global activity
      await logShareActivity();

      // 4. Try native Web Share API with file if supported
      if (canvasRef.current && navigator.share && navigator.canShare) {
        canvasRef.current.toBlob(async blob => {
          if (blob) {
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  title: `Treino: ${data.workoutName}`,
                  text: shareText,
                  files: [file],
                });
                toast.success('Treino compartilhado com sucesso!');
                return;
              } catch {
                // User dismissed native share dialog
              }
            }
          }
          // Fallback: open Instagram in new tab
          window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          toast.success(
            'Imagem salva na galeria e legenda copiada! Abra os Stories do Instagram para colar e publicar.',
            'Pronto para Postar'
          );
        }, 'image/png');
      } else {
        // Fallback: open Instagram in new tab
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        toast.success(
          'Imagem salva na galeria e legenda copiada! Abra os Stories do Instagram para colar e publicar.',
          'Pronto para Postar'
        );
      }
    } catch {
      toast.error('Erro ao preparar compartilhamento para Instagram.');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Copy Caption Text
  const handleCopyText = async () => {
    const text = `🔥 Treino: ${data.workoutName}!\n⏱️ Duração: ${data.durationFormatted}\n💪 Volume Total: ${data.totalVolumeKg.toLocaleString('pt-BR')}kg\n⚡ Séries: ${data.completedSets}/${data.totalSets}\n\n${customMessage}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success('Legenda do post copiada para a área de transferência!', 'Copiado');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Não foi possível copiar o texto automaticamente.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl border animate-scale-in max-h-[92vh] overflow-y-auto flex flex-col md:flex-row gap-6"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        {/* Left Side: Live Phone Preview */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="w-full max-w-[260px] sm:max-w-[300px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-950 relative group">
            {/* Hidden High-Res Canvas */}
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {/* Subtle Overlay Hint */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-white text-xs font-bold px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xs">
                Pré-visualização 9:16 Story
              </span>
            </div>
          </div>
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
            Formato pronto para Instagram Stories e WhatsApp Status
          </p>
        </div>

        {/* Right Side: Customization Controls */}
        <div className="flex-1 flex flex-col justify-between space-y-4 min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Gerar Post para Instagram
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Personalize sua frase, emojis e hashtags antes de compartilhar
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>

            {/* 1. Theme Palette Selector */}
            <div className="mt-3 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                1. Tema Visual
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      selectedTheme.id === t.id
                        ? 'ring-2 ring-brand-500 scale-[1.02] shadow-md'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: selectedTheme.id === t.id ? t.accent : 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                      style={{ background: t.accent }}
                    />
                    <span className="truncate text-[11px]">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Expanded Phrase, Emojis & Hashtags Editor */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  2. Frase de Destaque & Hashtags
                </label>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  Edite livremente
                </span>
              </div>

              {/* Text Area */}
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Escreva sua mensagem motivacional, hashtags ou observações..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none min-h-[85px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />

              {/* Quick Emoji Toolbar */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                  Inserir Emojis:
                </p>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_CHIPS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertText(emoji)}
                      className="px-2 py-1 rounded-xl text-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer border"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                      }}
                      title={`Inserir ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Hashtag Toolbar */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                  Inserir Hashtags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {HASHTAG_CHIPS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertText(tag)}
                      className="px-2 py-1 rounded-xl text-[10px] font-bold text-brand-500 hover:bg-brand-500/10 transition-colors cursor-pointer border border-brand-500/20"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Inspiration Pills */}
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                  Frases Prontas:
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {PRESET_MESSAGES.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomMessage(msg)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer truncate ${
                        customMessage === msg
                          ? 'bg-brand-500/15 text-brand-500 font-bold border border-brand-500/30'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      style={{ color: customMessage === msg ? undefined : 'var(--text-secondary)' }}
                    >
                      {msg.replace('\n', ' • ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Toggle Stats */}
            <div className="mt-3 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                3. Métricas no Card
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuration(!showDuration)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showDuration
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border-slate-500/30 text-slate-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Duração ({data.durationFormatted})
                </button>
                <button
                  type="button"
                  onClick={() => setShowVolume(!showVolume)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showVolume
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border-slate-500/30 text-slate-400'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Volume ({data.totalVolumeKg}kg)
                </button>
                <button
                  type="button"
                  onClick={() => setShowSets(!showSets)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showSets
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border-slate-500/30 text-slate-400'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  Séries ({data.completedSets})
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleInstagramShare}
                disabled={generating}
                className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
                style={{ background: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f56040)' }}
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar no Instagram Stories</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToGallery}
                disabled={generating}
                className="py-3 px-4 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                title="Baixar imagem em alta resolução para a galeria"
              >
                <Download className="w-4 h-4" />
                <span>Salvar na Galeria</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 py-2.5 rounded-2xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Legenda Copiada!' : 'Copiar Texto da Legenda'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
