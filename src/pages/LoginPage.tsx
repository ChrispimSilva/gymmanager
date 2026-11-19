import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { tenantService } from '../services/tenantService';
import {
  Dumbbell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  CheckCircle,
  ArrowRight,
  Building2,
  ShieldCheck,
  Award,
  Sparkles,
  Users,
} from 'lucide-react';
import { DEFAULT_TENANT_ID, type Tenant, type UserRole } from '../types';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<UserRole>('aluno');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [registerRole, setRegisterRole] = useState<'aluno' | 'personal'>('aluno');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [cref, setCref] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [suggestedRole, setSuggestedRole] = useState<UserRole | null>(null);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithRole, register } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function loadTenants() {
      const list = await tenantService.getActiveTenants();
      if (active) {
        setTenants(list);
        if (list.length > 0 && !list.some(t => t.id === selectedTenantId)) {
          setSelectedTenantId(list[0].id);
        }
      }
    }
    void loadTenants();
    return () => {
      active = false;
    };
  }, [selectedTenantId]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setCref('');
    setSpecialty('');
    setError('');
    setSuggestedRole(null);
    setSuccess('');
  };

  const handleSelectLoginProfile = (newRole: UserRole) => {
    setLoginRole(newRole);
    setError('');
    setSuggestedRole(null);
    if (newRole === 'superadmin' && mode === 'register') {
      setMode('login');
    }
  };

  const handleQuickDemoFill = (demoRole: UserRole) => {
    setMode('login');
    setLoginRole(demoRole);
    setError('');
    setSuggestedRole(null);

    const credentials: Record<UserRole, { email: string; pass: string }> = {
      aluno: { email: 'aluno@gym.com', pass: 'aluno123' },
      personal: { email: 'personal@gym.com', pass: 'personal123' },
      admin: { email: 'admin@gym.com', pass: 'admin123' },
      superadmin: { email: 'superadmin@gym.com', pass: 'super123' },
    };

    setEmail(credentials[demoRole].email);
    setPassword(credentials[demoRole].pass);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuggestedRole(null);
    setLoading(true);
    try {
      const res = await loginWithRole(email, password, loginRole);
      if (res.success) {
        toast.success('Bem-vindo de volta!', 'Login realizado');
        navigate('/dashboard');
      } else {
        setError(res.error || 'Email ou senha incorretos');
        if (res.actualRole) {
          setSuggestedRole(res.actualRole);
        }
        toast.error(res.error || 'Email ou senha incorretos. Verifique suas credenciais.');
      }
    } catch {
      setError('Erro inesperado ao realizar login');
      toast.error('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    if (!selectedTenantId) {
      setError('Selecione a academia para vincular sua conta');
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
    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: registerRole,
        tenantId: selectedTenantId,
        cref: registerRole === 'personal' ? cref.trim() : undefined,
        specialty: registerRole === 'personal' ? specialty.trim() : undefined,
      });
      if (result.success) {
        toast.success('Conta criada e vinculada à academia!', 'Bem-vindo ao GymManager');
        navigate('/dashboard');
      } else {
        setError(result.error || 'Erro ao criar conta');
        toast.error(result.error || 'Não foi possível criar a conta.');
      }
    } catch {
      setError('Erro ao criar conta');
      toast.error('Erro de conexão ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    resetForm();
    if (newMode === 'register' && loginRole === 'superadmin') {
      setLoginRole('aluno');
    }
    if (newMode === 'register' && (loginRole === 'aluno' || loginRole === 'personal')) {
      setRegisterRole(loginRole);
    }
    setMode(newMode);
  };

  const gymProfiles: {
    value: 'aluno' | 'personal' | 'admin';
    label: string;
    subtitle: string;
    icon: typeof User;
  }[] = [
    {
      value: 'aluno',
      label: 'Aluno',
      subtitle: 'Meus treinos e evolução',
      icon: User,
    },
    {
      value: 'personal',
      label: 'Personal',
      subtitle: 'Prescrição e alunos',
      icon: Award,
    },
    {
      value: 'admin',
      label: 'Academia',
      subtitle: 'Gestor / Admin',
      icon: Building2,
    },
  ];

  const roleLabels: Record<UserRole, string> = {
    aluno: 'Aluno',
    personal: 'Personal',
    admin: 'Academia (Admin)',
    superadmin: 'SuperAdmin (Plataforma)',
  };

  /* Shared styles */
  const inputStyle: React.CSSProperties = {
    paddingLeft: '3rem',
    paddingRight: '1rem',
    paddingTop: '0.875rem',
    paddingBottom: '0.875rem',
  };
  const inputWithToggleStyle: React.CSSProperties = { ...inputStyle, paddingRight: '3rem' };
  const inputCompactStyle: React.CSSProperties = {
    paddingLeft: '3rem',
    paddingRight: '1rem',
    paddingTop: '0.875rem',
    paddingBottom: '0.875rem',
  };
  const iconStyle: React.CSSProperties = {
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
  };
  const inputClasses =
    'w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200';
  const inputCompactClasses = inputClasses + ' text-sm';
  const iconClasses = 'absolute w-5 h-5 text-slate-500 pointer-events-none';
  const iconSmallClasses = 'absolute w-4 h-4 text-slate-500 pointer-events-none';
  const btnStyle: React.CSSProperties = { paddingTop: '1rem', paddingBottom: '1rem' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '1.5s' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6 animate-slide-down">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.gymName}
              className="w-20 h-20 mx-auto mb-3 rounded-2xl object-contain bg-white/10 p-2 shadow-lg animate-pulse-glow"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse-glow"
              style={{ background: 'var(--accent)' }}
            >
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-1">{settings.gymName}</h1>
          <p className="text-slate-400 text-sm">Plataforma Multi-Tenant de Gestão & Treinos</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-up">
          {/* Tab Toggle (Entrar vs Criar Conta) */}
          <div className="flex mb-5 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                mode === 'login'
                  ? 'gradient-brand text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                mode === 'register'
                  ? 'gradient-brand text-white shadow-lg shadow-brand-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Profile Separation Selector (Login Mode) */}
          {mode === 'login' && (
            <div className="mb-5">
              {loginRole === 'superadmin' ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-300">Portal SuperAdmin</p>
                      <p className="text-[11px] text-slate-400">
                        Administração da Plataforma & Tenants
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectLoginProfile('aluno')}
                    className="text-[11px] font-semibold text-amber-300 hover:text-white underline cursor-pointer flex-shrink-0"
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Selecione seu perfil de acesso
                  </label>
                  <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Perfis de login">
                    {gymProfiles.map(prof => {
                      const Icon = prof.icon;
                      const isSelected = loginRole === prof.value;
                      return (
                        <button
                          key={prof.value}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          id={`login-profile-${prof.value}`}
                          onClick={() => handleSelectLoginProfile(prof.value)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-brand-500/60 bg-brand-500/15 shadow-md shadow-brand-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              isSelected ? 'text-brand-400' : 'text-slate-400'
                            }`}
                          />
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-brand-400' : 'text-slate-200'
                            }`}
                          >
                            {prof.label}
                          </span>
                          <span className="text-[9px] text-slate-400 text-center leading-tight">
                            {prof.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {suggestedRole && (
                <button
                  type="button"
                  onClick={() => handleSelectLoginProfile(suggestedRole)}
                  className="w-full py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Alternar para o perfil {roleLabels[suggestedRole]} →
                </button>
              )}
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
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  E-mail ({roleLabels[loginRole]})
                </label>
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="login-submit"
                className="w-full rounded-xl gradient-brand text-white font-semibold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
                style={btnStyle}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <>
                    Entrar como {roleLabels[loginRole]} <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Credentials */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-400" />
                    Acesso Rápido (Demo)
                  </span>
                  <span className="text-[10px] text-slate-500">1 clique preenche</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['aluno', 'personal', 'admin', 'superadmin'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleQuickDemoFill(r)}
                      id={`demo-fill-${r}`}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer capitalize ${
                        loginRole === r
                          ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {r === 'superadmin' ? 'Super' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pt-1">
                <p className="text-center text-xs text-slate-500">
                  É aluno ou personal e não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
                  >
                    Vincular-se a uma academia
                  </button>
                </p>

                {loginRole !== 'superadmin' && (
                  <button
                    type="button"
                    id="login-superadmin-toggle"
                    onClick={() => handleSelectLoginProfile('superadmin')}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-amber-400 transition-colors cursor-pointer pt-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Acesso SuperAdmin (Plataforma)
                  </button>
                )}
              </div>
            </form>
          )}

          {/* REGISTER FORM (Self-Service linked to Tenant for Aluno / Personal) */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              {/* Role selector for Registration */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Perfil na Academia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('aluno')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      registerRole === 'aluno'
                        ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-xs font-bold">Sou Aluno</p>
                      <p className="text-[9px] text-slate-400">Treinos e evolução</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole('personal')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      registerRole === 'personal'
                        ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-xs font-bold">Sou Personal</p>
                      <p className="text-[9px] text-slate-400">Equipe da academia</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tenant (Gym) Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Academia (Tenant) *
                </label>
                <div className="relative">
                  <Building2 className={iconClasses} style={iconStyle} />
                  <select
                    value={selectedTenantId}
                    onChange={e => setSelectedTenantId(e.target.value)}
                    className={inputClasses + ' appearance-none cursor-pointer'}
                    style={inputStyle}
                    required
                    id="register-tenant"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Novas academias são credenciadas pelo SuperAdmin da plataforma.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome completo
                </label>
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

              {registerRole === 'personal' && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      CREF (opcional)
                    </label>
                    <input
                      type="text"
                      value={cref}
                      onChange={e => setCref(e.target.value)}
                      className={inputCompactClasses}
                      style={{ padding: '0.75rem 0.875rem' }}
                      placeholder="000000-G/UF"
                      id="register-cref"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Especialidade
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className={inputCompactClasses}
                      style={{ padding: '0.75rem 0.875rem' }}
                      placeholder="Ex: Hipertrofia"
                      id="register-specialty"
                    />
                  </div>
                </div>
              )}

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
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-400">Mostrar senhas</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                id="register-submit"
                className="w-full rounded-xl gradient-brand text-white font-semibold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
                style={btnStyle}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Criando conta...
                  </span>
                ) : (
                  <>
                    Criar Conta de {registerRole === 'personal' ? 'Personal' : 'Aluno'}{' '}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: '#94a3b8', marginTop: '1.5rem' }}>
          © 2026 GymManager • Plataforma SaaS Multi-Tenant
        </p>
      </div>
    </div>
  );
}
