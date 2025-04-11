
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

  // Check profile completion status
  const checkProfileCompletion = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('age, gender, marital_status, has_kids, has_pets, work_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error checking profile:", error);
        return false;
      }

      // Check if all required fields are present
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

  // Handle authentication state changes
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check profile completion on auth state change
        if (session?.user) {
          // Use setTimeout to prevent recursive updates
          setTimeout(async () => {
            const isComplete = await checkProfileCompletion(session.user.id);
            
            // Redirect to profile completion if needed and event is SIGNED_IN
            if (event === 'SIGNED_IN' && !isComplete) {
              navigate('/complete-profile');
            } else if (event === 'SIGNED_IN' && isComplete) {
              // If profile is complete, navigate to /dreams
              navigate('/dreams');
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
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

  // Check for hash fragment in URL that indicates a redirect from OAuth
  useEffect(() => {
    // This handles the OAuth redirects
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Process the hash fragment
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          console.log("OAuth session found:", session);
          setSession(session);
          setUser(session?.user ?? null);
          
          // Check if the user has a complete profile
          const isComplete = await checkProfileCompletion(session.user.id);
          
          toast({
            title: "Login successful",
            description: "Welcome to Nour Al Ruyaa",
          });
          
          // Redirect based on profile completion
          if (!isComplete) {
            navigate("/complete-profile");
          } else {
            navigate("/dreams");
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
          redirectTo: `${window.location.origin}`, // Change to the root URL without trailing slash
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
      
      // Navigate to home page after logout
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
