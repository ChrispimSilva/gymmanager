import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, UserCheck, UserX, X, Mail, Phone, Target, Ruler, Weight } from 'lucide-react';
import { studentService } from '../services/studentService';
import { activityService } from '../services/activityService';
import { useAuth } from '../contexts/AuthContext';
import type { Student } from '../types';

export default function StudentsPage() {
  const { user } = useAuth();
  const isAluno = user?.role === 'aluno';

  const [students, setStudents] = useState<Student[]>(() => {
    if (isAluno && user) {
      const myStudent = studentService.getByUserId(user.id);
      return myStudent ? [myStudent] : [];
    }
    return studentService.getAll();
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentAge, setSelectedStudentAge] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = students;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.email.toLowerCase().includes(lower)
      );
    }
    if (filter === 'active') result = result.filter(s => s.active);
    if (filter === 'inactive') result = result.filter(s => !s.active);
    return result;
  }, [students, search, filter]);

  const refreshStudents = useCallback(() => {
    setStudents(studentService.getAll());
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      studentService.delete(id);
      refreshStudents();
    }
  };

  const handleToggleActive = (id: string) => {
    studentService.toggleActive(id);
    refreshStudents();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAluno ? 'Meu Perfil' : 'Alunos'}
          </h1>
          {!isAluno && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {students.length} alunos cadastrados • {students.filter(s => s.active).length} ativos
            </p>
          )}
        </div>
        {!isAluno && (
          <button
            onClick={() => { setEditingStudent(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        )}
      </div>

      {/* Search & Filters - hidden for aluno */}
      {!isAluno && (
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                filter === f
                  ? 'bg-brand-500/10 text-brand-500 border-brand-500/30'
                  : 'border-transparent'
              }`}
              style={filter !== f ? {
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-color)',
              } : {}}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Students Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student, i) => (
          <div
            key={student.id}
            className={`rounded-2xl p-5 border card-hover cursor-pointer animate-slide-up stagger-${Math.min(i + 1, 6)}`}
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
            }}
            onClick={() => {
              setSelectedStudent(student);
              setSelectedStudentAge(
                student.birthDate
                  ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : null
              );
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{
                    background: student.active
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #94a3b8, #64748b)',
                  }}
                >
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {student.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {student.email}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                  student.active
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {student.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Target className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                {student.goal}
              </div>
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1">
                  <Weight className="w-3 h-3" /> {student.weight}kg
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" /> {student.height}cm
                </span>
              </div>
            </div>

            {!isAluno && (
            <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={e => { e.stopPropagation(); setEditingStudent(student); setShowForm(true); }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:bg-brand-500/10"
                style={{ color: 'var(--accent)', background: 'var(--bg-tertiary)' }}
              >
                Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleToggleActive(student.id); }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  color: student.active ? '#f59e0b' : '#10b981',
                  background: 'var(--bg-tertiary)',
                }}
              >
                {student.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(student.id); }}
                className="py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                ✕
              </button>
            </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <UserX className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum aluno encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'Tente alterar a busca' : 'Cadastre o primeiro aluno'}
          </p>
        </div>
      )}

      {/* Student Form Modal */}
      {showForm && (
        <StudentFormModal
          student={editingStudent}
          onClose={() => { setShowForm(false); setEditingStudent(null); }}
          onSave={() => { refreshStudents(); setShowForm(false); setEditingStudent(null); }}
        />
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          age={selectedStudentAge}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Student Form Modal
// ============================================================
function StudentFormModal({
  student,
  onClose,
  onSave,
}: {
  student: Student | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: student?.name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    birthDate: student?.birthDate || '',
    weight: student?.weight || 70,
    height: student?.height || 170,
    goal: student?.goal || 'Hipertrofia',
    active: student?.active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      studentService.update(student.id, form);
    } else {
      studentService.create({ ...form, photo: '' });
      activityService.log({
        userId: 'usr-inst-001',
        type: 'student_added',
        description: `Novo aluno cadastrado: ${form.name}`,
      });
    }
    onSave();
  };

  const goals = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Definição', 'Saúde', 'Reabilitação'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {student ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome completo</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Mail className="w-3 h-3 inline mr-1" />Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3 h-3 inline mr-1" />Telefone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data de Nascimento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => setForm({ ...form, birthDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Weight className="w-3 h-3 inline mr-1" />Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Ruler className="w-3 h-3 inline mr-1" />Altura (cm)
              </label>
              <input
                type="number"
                value={form.height}
                onChange={e => setForm({ ...form, height: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Target className="w-3 h-3 inline mr-1" />Objetivo
            </label>
            <select
              value={form.goal}
              onChange={e => setForm({ ...form, goal: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {goals.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25"
            >
              {student ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Student Detail Modal
// ============================================================
function StudentDetailModal({
  student,
  age,
  onClose,
}: {
  student: Student;
  age: number | null;
  onClose: () => void;
}) {
  const bmi = student.weight / Math.pow(student.height / 100, 2);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-xl">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {student.name}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                  student.active ? 'bg-brand-500/10 text-brand-500' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {student.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { icon: Mail, label: 'Email', value: student.email },
            { icon: Phone, label: 'Telefone', value: student.phone || '—' },
            { icon: Target, label: 'Objetivo', value: student.goal },
            { icon: Weight, label: 'Peso', value: `${student.weight} kg` },
            { icon: Ruler, label: 'Altura', value: `${student.height} cm` },
            { icon: UserCheck, label: 'IMC', value: bmi.toFixed(1) },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </span>
            </div>
          ))}
          {age !== null && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Idade</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{age} anos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
