import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react';
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';

// Page imports (lazy-loaded by route to keep the initial bundle smaller)
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const Home = lazy(() => import('@/pages/Home'));
const Learn = lazy(() => import('@/pages/Learn'));
const AITutor = lazy(() => import('@/pages/AITutor'));
const Contribute = lazy(() => import('@/pages/Contribute'));
const Progress = lazy(() => import('@/pages/Progress'));
const Review = lazy(() => import('@/pages/Review'));
const Studio = lazy(() => import('@/pages/Studio'));
const AccentWorkshop = lazy(() => import('@/pages/studio/AccentWorkshop'));
const ScanOCR = lazy(() => import('@/pages/studio/ScanOCR'));
const Leagues = lazy(() => import('@/pages/studio/Leagues'));
const Lesson = lazy(() => import('@/pages/Lesson'));
const Exercise = lazy(() => import('@/pages/Exercise'));
const Admin = lazy(() => import('@/pages/Admin'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Support = lazy(() => import('@/pages/Support'));
// public logo at /logo.png

const AuthenticatedApp = () => {
  let isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin;
  try {
    ({ isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth());
  } catch (e) {
    // If the auth context isn't available yet (HMR/reload), render a loading state
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Mǎa-kwɛ́lî Langues"
            className="w-16 h-16 rounded-full shadow-lg object-cover"
          />
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Mǎa-kwɛ́lî Langues"
            className="w-16 h-16 rounded-full shadow-lg object-cover"
          />
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/apprendre" element={<Learn />} />
            <Route path="/apprendre/:langCode" element={<Learn />} />
            <Route path="/tuteur" element={<AITutor />} />
            <Route path="/contribuer" element={<Contribute />} />
            <Route path="/progres" element={<Progress />} />
            <Route path="/revision" element={<Review />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/studio/accent" element={<AccentWorkshop />} />
            <Route path="/studio/scan" element={<ScanOCR />} />
            <Route path="/studio/ligues" element={<Leagues />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/support" element={<Support />} />
          </Route>
          <Route path="/lecon/:langCode/:lessonNum" element={<Lesson />} />
          <Route path="/examen/:langCode/:lessonNum" element={<Exercise />} />
          <Route path="/exercice/:langCode/:moduleId" element={<Exercise />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;