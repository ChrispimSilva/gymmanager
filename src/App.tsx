import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider } from './contexts/SettingsContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import PersonalsPage from './pages/PersonalsPage';
import StudentsPage from './pages/StudentsPage';
import WorkoutsPage from './pages/WorkoutsPage';
import MyWorkoutsPage from './pages/MyWorkoutsPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import EquipmentsPage from './pages/EquipmentsPage';
import ExercisesPage from './pages/ExercisesPage';
import ProgressPage from './pages/ProgressPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { seedData } from './utils/seedData';
import { useEffect } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleGuard({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    void seedData();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="academias" element={<RoleGuard allowed={['superadmin']}><TenantsPage /></RoleGuard>} />
        <Route path="personais" element={<RoleGuard allowed={['admin']}><PersonalsPage /></RoleGuard>} />
        <Route path="alunos" element={<RoleGuard allowed={['admin', 'personal']}><StudentsPage /></RoleGuard>} />
        <Route path="treinos" element={<RoleGuard allowed={['admin', 'personal']}><WorkoutsPage /></RoleGuard>} />
        <Route path="meus-treinos" element={<RoleGuard allowed={['aluno']}><MyWorkoutsPage /></RoleGuard>} />
        <Route path="treino-ativo/:workoutId" element={<RoleGuard allowed={['personal', 'aluno']}><ActiveWorkoutPage /></RoleGuard>} />
        <Route path="aparelhos" element={<RoleGuard allowed={['admin', 'personal']}><EquipmentsPage /></RoleGuard>} />
        <Route path="exercicios" element={<RoleGuard allowed={['admin', 'personal', 'aluno']}><ExercisesPage /></RoleGuard>} />
        <Route path="evolucao" element={<RoleGuard allowed={['admin', 'personal', 'aluno']}><ProgressPage /></RoleGuard>} />
        <Route path="historico" element={<RoleGuard allowed={['admin', 'personal', 'aluno']}><HistoryPage /></RoleGuard>} />
        <Route path="configuracoes" element={<RoleGuard allowed={['admin']}><SettingsPage /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
