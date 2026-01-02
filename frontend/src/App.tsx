import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { api } from './services/api';
import { CandidateForm } from './views/CandidateForm';
import { WaitingView } from './views/WaitingView';
import { HRDashboard } from './views/HRDashboard';
import { AnalystDashboard } from './views/AnalystDashboard';
import { InterviewerDashboard } from './views/InterviewerDashboard';
import { InterviewerDetail } from './views/InterviewerDetail';
import { DirectorDashboard } from './views/DirectorDashboard';
import { HistoryView } from './views/HistoryView';
import { ToastProvider } from './context/ToastContext';

function App() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const profile = await api.get('/me');
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to fetch user profile', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const role = userProfile?.role;

  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/candidate/application" element={<CandidateForm />} />
            <Route path="/waiting" element={<WaitingView />} />
            <Route path="/history" element={<HistoryView />} />

            <Route path="/hr/applications" element={
              <ProtectedRoute allowedRoles={['hr', 'director']} userRole={role} isLoading={isLoading}>
                <HRDashboard />
              </ProtectedRoute>
            } />

            <Route path="/analyst/dashboard" element={
              <ProtectedRoute allowedRoles={['analyst', 'director']} userRole={role} isLoading={isLoading}>
                <AnalystDashboard />
              </ProtectedRoute>
            } />

            <Route path="/interviewer" element={
              <ProtectedRoute allowedRoles={['interviewer', 'director']} userRole={role} isLoading={isLoading}>
                <InterviewerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/interviewer/application/:id" element={
              <ProtectedRoute allowedRoles={['interviewer', 'director']} userRole={role} isLoading={isLoading}>
                <InterviewerDetail />
              </ProtectedRoute>
            } />

            <Route path="/director" element={
              <ProtectedRoute allowedRoles={['director']} userRole={role} isLoading={isLoading}>
                <DirectorDashboard />
              </ProtectedRoute>
            } />

            <Route path="/" element={
              isLoading ? null : (
                role === 'hr' ? <Navigate to="/hr/applications" replace /> :
                  role === 'analyst' ? <Navigate to="/analyst/dashboard" replace /> :
                    role === 'interviewer' ? <Navigate to="/interviewer" replace /> :
                      role === 'director' ? <Navigate to="/director" replace /> :
                        <Navigate to="/candidate/application" replace />
              )
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
