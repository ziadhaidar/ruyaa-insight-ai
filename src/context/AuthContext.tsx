import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasCompleteProfile: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfileStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkProfileCompletion = async (userId: string) => {
    try {
      console.log("Checking profile completion for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('age, gender, marital_status, has_kids, has_pets, work_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error checking profile:", error);
        return false;
      }

      const isComplete = data && 
        data.age !== null && 
        data.gender !== null && 
        data.marital_status !== null && 
        data.has_kids !== null && 
        data.has_pets !== null && 
        data.work_status !== null;
      
      console.log("Profile completion status:", isComplete, data);
      setHasCompleteProfile(!!isComplete);
      return !!isComplete;
    } catch (error) {
      console.error("Error checking profile completion:", error);
      return false;
    }
  };

  const refreshProfileStatus = async () => {
    if (user) {
      await checkProfileCompletion(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const isComplete = await checkProfileCompletion(session.user.id);
          console.log("Profile completion after auth change:", isComplete);
          
          if (event === 'SIGNED_IN') {
  const currentPath = window.location.pathname;
  const isNeutralPath = ['/', '/login', '/register', '/auth'].includes(currentPath);

  if (!isComplete && currentPath !== '/complete-profile') {
    console.log("Redirecting to complete profile");
    navigate('/complete-profile', { replace: true });
  } else if (isComplete && isNeutralPath) {
    console.log("Profile is complete and on neutral page, navigating to dreams");
    navigate('/dreams', { replace: true });
  } else {
    console.log("User is on an existing page, no redirection");
  }
}

        }, 100);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkProfileCompletion(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          console.log("OAuth session found:", session);
          setSession(session);
          setUser(session?.user ?? null);
          
          const isComplete = await checkProfileCompletion(session.user.id);
          
          toast({
            title: "Login successful",
            description: "Welcome to Nour Al Ruyaa",
          });
          
          if (!isComplete) {
            navigate("/complete-profile", { replace: true });
          } else {
            navigate("/dreams", { replace: true });
          }
        }
      });
    }
  }, [navigate, toast]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Google login error:", error);
      toast({
        title: "Google login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split("@")[0],
          },
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Registration successful",
        description: "Please check your email to confirm your account",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try a different email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/');
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      hasCompleteProfile, 
      login, 
      loginWithGoogle, 
      register, 
      logout,
      refreshProfileStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
