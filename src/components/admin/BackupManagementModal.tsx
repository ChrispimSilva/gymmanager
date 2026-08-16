import { useState, useEffect, useRef } from 'react';
import { Download, Upload, RefreshCw, X, Database, ShieldCheck, Lock } from 'lucide-react';
import { backupService } from '../../services/backupService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../ui/ConfirmDialog';

interface BackupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupManagementModal({ isOpen, onClose }: BackupManagementModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportEncrypted = async () => {
    setExporting(true);
    try {
      await backupService.downloadEncryptedBackupFile();
      toast.success(
        'Backup criptografado com AES-256 gerado com sucesso! Seus dados estão seguros.',
        'Exportação Segura'
      );
    } catch {
      toast.error('Erro ao gerar o arquivo de backup criptografado.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await backupService.importBackup(text, user?.id);

      if (result.success) {
        toast.success(result.message, 'Backup Restaurado');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        toast.error(result.message, 'Erro na Importação');
      }
    } catch {
      toast.error('Falha ao ler o arquivo selecionado.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetData = async () => {
    try {
      await backupService.resetAllData();
      toast.success('Dados redefinidos para os padrões de demonstração.', 'Banco Redefinido');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error('Erro ao redefinir dados.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in space-y-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Backup & Segurança de Dados
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Proteção criptografada AES-256 para dados sensíveis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Options list */}
        <div className="space-y-3">
          {/* Export Encrypted */}
          <div
            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-brand-500/30"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  Exportar Backup Criptografado (Recomendado)
                </h3>
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Gera um arquivo protegido (<code className="font-mono text-emerald-400">.gymvault</code>) com chave AES-256. Dados sensíveis de alunos, treinos e contatos ficam inacessíveis fora do app.
              </p>
            </div>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportEncrypted}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 flex items-center justify-center gap-1.5 min-h-[42px]"
              style={{ background: 'var(--accent)' }}
            >
              <Lock className="w-3.5 h-3.5" />
              {exporting ? 'Criptografando...' : 'Exportar Seguro'}
            </button>
          </div>

          {/* Import Backup */}
          <div
            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-brand-500/30"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  Restaurar a partir de Backup
                </h3>
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Importe seu arquivo seguro (<code className="font-mono text-indigo-400">.gymvault</code> ou <code className="font-mono text-indigo-400">.json</code>) exportado anteriormente.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gymvault,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50 min-h-[42px] flex items-center justify-center gap-1.5"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <Download className="w-3.5 h-3.5" />
                {importing ? 'Descriptografando...' : 'Restaurar'}
              </button>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div
            className="p-4 rounded-2xl border border-red-500/20 bg-red-500/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-bold flex items-center gap-2 text-red-500">
                <RefreshCw className="w-4 h-4" />
                Restaurar Dados Padrão (Demo)
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Restaura os dados iniciais de demonstração (Carlos, Rafael, Ana, aparelhos e treinos).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0 min-h-[42px]"
            >
              Resetar
            </button>
          </div>
        </div>

        {/* Security & Storage Note */}
        <div
          className="p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Criptografia de Ponta a Ponta:</strong> Os arquivos exportados utilizam cifra <strong>AES-256-GCM</strong> com derivação de chave <strong>PBKDF2</strong> (100.000 iterações), assegurando que nomes, telefones, medidas e históricos permaneçam confidenciais.
          </span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Redefinir Dados do Sistema?"
        message="Esta ação substituirá todos os dados atuais pelos dados padrão de demonstração. Recomendamos baixar um backup antes de continuar."
        confirmLabel="Sim, Resetar Dados"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleResetData}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
