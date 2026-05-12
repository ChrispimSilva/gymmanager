import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import WorkoutsPage from './pages/WorkoutsPage';
import MyWorkoutsPage from './pages/MyWorkoutsPage';
import ExercisesPage from './pages/ExercisesPage';
import ProgressPage from './pages/ProgressPage';
import HistoryPage from './pages/HistoryPage';
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
    seedData();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="alunos" element={<StudentsPage />} />
        <Route path="treinos" element={<RoleGuard allowed={['admin', 'instrutor']}><WorkoutsPage /></RoleGuard>} />
        <Route path="meus-treinos" element={<MyWorkoutsPage />} />
        <Route path="exercicios" element={<ExercisesPage />} />
        <Route path="evolucao" element={<ProgressPage />} />
        <Route path="historico" element={<RoleGuard allowed={['admin', 'instrutor']}><HistoryPage /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
