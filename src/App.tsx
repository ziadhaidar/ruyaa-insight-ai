
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { DreamProvider } from "@/context/DreamContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import HomePage from "./pages/HomePage";
import PaymentPage from "./pages/PaymentPage";
import InterpretationPage from "./pages/InterpretationPage";
import DreamsPage from "./pages/DreamsPage";
import DreamDetailPage from "./pages/DreamDetailPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

// Protected route component that checks for profile completion
const ProtectedRoute = ({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) => {
  const { user, isLoading, hasCompleteProfile } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireProfile && !hasCompleteProfile) {
    return <Navigate to="/complete-profile" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth" element={<Index />} />
      
      {/* Profile completion route (accessible only when logged in) */}
      <Route path="/complete-profile" element={
        <ProtectedRoute requireProfile={false}>
          <CompleteProfilePage />
        </ProtectedRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/home" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />
      <Route path="/payment" element={
        <ProtectedRoute>
          <PaymentPage />
        </ProtectedRoute>
      } />
      <Route path="/interpretation" element={
        <ProtectedRoute>
          <InterpretationPage />
        </ProtectedRoute>
      } />
      <Route path="/dreams" element={
        <ProtectedRoute>
          <DreamsPage />
        </ProtectedRoute>
      } />
      <Route path="/dreams/:id" element={
        <ProtectedRoute>
          <DreamDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      
      {/* Not found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <DreamProvider>
              <AppRoutes />
              <Toaster />
              <Sonner />
            </DreamProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
