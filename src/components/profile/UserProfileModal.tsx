import { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  Weight,
  Ruler,
  Target,
  Camera,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { GYM_AVATARS } from '../../constants/gymAvatars';
import type { Student } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(() => user?.name || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(() => user?.avatar || '');
  const [customPhoto, setCustomPhoto] = useState('');
  
  // Student specific state
  const [student, setStudent] = useState<Student | null>(null);
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [goal, setGoal] = useState('Condicionamento');
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'avatars'>('info');

  useEffect(() => {
    let active = true;
    async function loadStudent() {
      if (user?.role === 'aluno') {
        const std = await studentService.getByUserId(user.id);
        if (active && std) {
          setStudent(std);
          setPhone(std.phone || '');
          setBirthDate(std.birthDate || '');
          setWeight(std.weight || 70);
          setHeight(std.height || 170);
          setGoal(std.goal || 'Condicionamento');
          if (std.photo) {
            setCustomPhoto(std.photo);
          }
        }
      }
    }
    void loadStudent();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCustomPhoto(base64);
      setSelectedAvatar(base64);
      toast.success('Foto carregada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setCustomPhoto('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const profileUpdates: Parameters<typeof updateProfile>[0] = {
        name: name.trim(),
        email: email.trim(),
        avatar: selectedAvatar || customPhoto,
      };

      if (password.trim()) {
        if (password.trim().length < 6) {
          toast.error('A nova senha deve ter no mínimo 6 caracteres.');
          setSaving(false);
          return;
        }
        profileUpdates.password = password.trim();
      }

      const success = await updateProfile(profileUpdates);

      // If user is aluno, also update student repository
      if (student) {
        await studentService.update(student.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birthDate,
          weight: Number(weight),
          height: Number(height),
          goal,
          photo: selectedAvatar || customPhoto,
        });
      }

      if (success) {
        toast.success('Perfil atualizado com sucesso!', 'Sucesso');
        onClose();
      } else {
        toast.error('Erro ao atualizar perfil.');
      }
    } catch {
      toast.error('Erro ao salvar alterações de perfil.');
    } finally {
      setSaving(false);
    }
  };

  const currentPreset = GYM_AVATARS.find(a => a.id === selectedAvatar);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3 mb-5 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
              style={{
                background: currentPreset?.bgGradient || 'var(--accent)',
              }}
            >
              {currentPreset ? (
                <span className="text-xl">{currentPreset.iconEmoji}</span>
              ) : selectedAvatar?.startsWith('data:image') ? (
                <img
                  src={selectedAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Meu Perfil & Avatar
              </h2>
              <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>
                Perfil de {user.role}
              </p>
            </div>
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

        {/* Tab switcher */}
        <div
          className="flex gap-2 p-1.5 rounded-2xl border mb-5"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dados Pessoais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avatars')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'avatars'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Escolher Avatar Gym
          </button>
        </div>

        {activeTab === 'avatars' ? (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Galeria de Avatares Fitness
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Selecione um avatar estilizado para representar seu perfil na academia.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {GYM_AVATARS.map(item => {
                const isSelected = selectedAvatar === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(item.id)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/30 scale-105'
                        : 'border-transparent hover:scale-102 hover:border-brand-500/20'
                    }`}
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                      style={{ background: item.bgGradient }}
                    >
                      {item.iconEmoji}
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[90px]" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {item.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Photo Upload */}
            <div
              className="p-4 rounded-2xl border flex items-center justify-between gap-3 mt-4"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    Ou envie sua própria foto
                  </h4>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    PNG, JPG ou WebP até 2MB
                  </p>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  Carregar Foto
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
                style={{ background: 'var(--accent)' }}
              >
                Confirmar Avatar & Voltar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Nome Completo
              </label>
              <div className="relative">
                <User
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Seu nome completo"
                  className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
                  style={{
                    paddingLeft: '2.75rem',
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
                  style={{
                    paddingLeft: '2.75rem',
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Optional New Password */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Alterar Senha <span className="text-[10px] font-normal text-slate-400">(deixe em branco para manter)</span>
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nova senha (opcional)"
                  className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
                  style={{
                    paddingLeft: '2.75rem',
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Student Additional Fields */}
            {user.role === 'aluno' && (
              <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-bold text-brand-500">Dados Físicos & Treino</p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[42px]"
                        style={{
                          paddingLeft: '2.5rem',
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Nascimento
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="w-full pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[42px]"
                        style={{
                          paddingLeft: '2.5rem',
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Weight */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Peso (kg)
                    </label>
                    <div className="relative">
                      <Weight className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={e => setWeight(Number(e.target.value))}
                        className="w-full pr-2 py-2.5 rounded-xl border text-xs font-medium focus:outline-none min-h-[42px]"
                        style={{
                          paddingLeft: '2.25rem',
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Altura (cm)
                    </label>
                    <div className="relative">
                      <Ruler className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(Number(e.target.value))}
                        className="w-full pr-2 py-2.5 rounded-xl border text-xs font-medium focus:outline-none min-h-[42px]"
                        style={{
                          paddingLeft: '2.25rem',
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Goal */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Objetivo
                    </label>
                    <div className="relative">
                      <Target className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      <select
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        className="w-full pr-2 py-2.5 rounded-xl border text-xs font-medium focus:outline-none min-h-[42px] cursor-pointer"
                        style={{
                          paddingLeft: '2.25rem',
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="Hipertrofia">Hipertrofia</option>
                        <option value="Emagrecimento">Emagrecimento</option>
                        <option value="Condicionamento">Condicionamento</option>
                        <option value="Definição">Definição</option>
                        <option value="Força">Força</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[46px]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50 min-h-[46px]"
                style={{ background: 'var(--accent)' }}
              >
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
