import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

// Protected route component that checks for profile completion
const ProtectedRoute = ({ children, requireProfile = true }: { children: React.ReactNode, requireProfile?: boolean }) => {
  const { user, isLoading, hasCompleteProfile } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();
  
  useEffect(() => {
    if (!isLoading) {
      console.log("Protected route check - user:", !!user, "hasCompleteProfile:", hasCompleteProfile);
      
      if (!user) {
        setRedirectPath("/login");
      } else if (requireProfile && !hasCompleteProfile) {
        setRedirectPath("/complete-profile");
      } else {
        setRedirectPath(null);
        // Save current path to localStorage if it's a valid authenticated route
        if (user && location.pathname !== '/login' && location.pathname !== '/register') {
          localStorage.setItem('lastRoute', location.pathname);
        }
      }
      
      // Short delay to ensure everything is updated
      const timer = setTimeout(() => {
        setIsChecking(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, hasCompleteProfile, requireProfile, location.pathname]);
  
  if (isLoading || isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (redirectPath) {
    console.log(`Redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

// Landing page redirect component
const LandingRedirect = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // Check if there's a saved route and restore it after login
    if (user) {
      const lastRoute = localStorage.getItem('lastRoute');
      if (lastRoute && lastRoute !== '/' && lastRoute !== '/login' && lastRoute !== '/register') {
        console.log("Restoring last route:", lastRoute);
        // We'll handle this with the Navigate component
      }
    }
  }, [user]);
  
  // Redirect to the last route if available, otherwise to home
  if (user) {
    const lastRoute = localStorage.getItem('lastRoute');
    if (lastRoute && lastRoute !== '/' && lastRoute !== '/login' && lastRoute !== '/register') {
      return <Navigate to={lastRoute} replace />;
    }
    return <Navigate to="/home" replace />;
  }
  
  return <LandingPage />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
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
