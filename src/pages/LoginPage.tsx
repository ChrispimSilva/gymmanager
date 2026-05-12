import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dumbbell, Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle, ArrowRight } from 'lucide-react';
import type { UserRole } from '../types';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('aluno');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRole('aluno');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const ok = login(email, password);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Email ou senha incorretos');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const result = register({ name: name.trim(), email, password, role });
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erro ao criar conta');
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    resetForm();
    setMode(newMode);
  };

  const roles: { value: UserRole; label: string; desc: string }[] = [
    { value: 'aluno', label: 'Aluno', desc: 'Veja seus treinos e evolução' },
    { value: 'instrutor', label: 'Instrutor', desc: 'Gerencie alunos e treinos' },
    { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
  ];

  /* Shared styles — using inline styles for padding because Tailwind v4 spacing utilities
     depend on a custom --spacing theme value that may not resolve in all setups. */
  const inputStyle: React.CSSProperties = { paddingLeft: '3rem', paddingRight: '1rem', paddingTop: '0.875rem', paddingBottom: '0.875rem' };
  const inputWithToggleStyle: React.CSSProperties = { ...inputStyle, paddingRight: '3rem' };
  const inputCompactStyle: React.CSSProperties = { paddingLeft: '3rem', paddingRight: '1rem', paddingTop: '0.875rem', paddingBottom: '0.875rem' };
  const iconStyle: React.CSSProperties = { left: '1rem', top: '50%', transform: 'translateY(-50%)' };
  const inputClasses = 'w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200';
  const inputCompactClasses = inputClasses + ' text-sm';
  const iconClasses = 'absolute w-5 h-5 text-slate-500 pointer-events-none';
  const iconSmallClasses = 'absolute w-4 h-4 text-slate-500 pointer-events-none';
  const btnStyle: React.CSSProperties = { paddingTop: '1rem', paddingBottom: '1rem' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse-glow">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">GymManager</h1>
          <p className="text-slate-400 text-sm">Sistema de Gestão de Academia</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl animate-slide-up">
          {/* Tab Toggle */}
          <div className="flex mb-6 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === 'login'
                  ? 'gradient-brand text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === 'register'
                  ? 'gradient-brand text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm animate-scale-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className={iconClasses} style={iconStyle} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClasses}
                    style={inputStyle}
                    placeholder="seu@email.com"
                    required
                    id="login-email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                <div className="relative">
                  <Lock className={iconClasses} style={iconStyle} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClasses}
                    style={inputWithToggleStyle}
                    placeholder="••••••••"
                    required
                    id="login-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute text-slate-500 hover:text-slate-300 transition-colors" style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="login-submit"
                className="w-full rounded-xl gradient-brand text-white font-semibold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
                style={btnStyle}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <>Entrar <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-2">
                Não tem conta?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Criar conta gratuitamente
                </button>
              </p>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome completo</label>
                <div className="relative">
                  <User className={iconClasses} style={iconStyle} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={inputClasses}
                    style={inputStyle}
                    placeholder="Seu nome completo"
                    required
                    id="register-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className={iconClasses} style={iconStyle} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClasses}
                    style={inputStyle}
                    placeholder="seu@email.com"
                    required
                    id="register-email"
                  />
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de conta</label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${
                        role === r.value
                          ? 'border-brand-500/50 bg-brand-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className={`text-xs font-semibold ${role === r.value ? 'text-brand-400' : 'text-slate-300'}`}>
                        {r.label}
                      </span>
                      <span className="text-[9px] text-slate-500 text-center leading-tight">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                  <div className="relative">
                    <Lock className={iconSmallClasses} style={iconStyle} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputCompactClasses}
                      style={inputCompactStyle}
                      placeholder="Mín. 6 chars"
                      required
                      minLength={6}
                      id="register-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar</label>
                  <div className="relative">
                    <Lock className={iconSmallClasses} style={iconStyle} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={inputCompactClasses}
                      style={inputCompactStyle}
                      placeholder="Repetir senha"
                      required
                      minLength={6}
                      id="register-confirm"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500" />
                <span className="text-xs text-slate-400">Mostrar senhas</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                id="register-submit"
                className="w-full rounded-xl gradient-brand text-white font-semibold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
                style={btnStyle}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Criando conta...
                  </span>
                ) : (
                  <>Criar Conta <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                Já tem conta?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Fazer login
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: '#94a3b8', marginTop: '1.5rem' }}>
          © 2026 GymManager • Projeto Integrador — Senac
        </p>
      </div>
    </div>
  );
}
