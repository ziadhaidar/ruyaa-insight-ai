
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have hash parameters from OAuth redirect
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Process the hash and get session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          toast({
            title: "Login successful",
            description: "Welcome to Nour Al Ruyaa",
          });
          navigate("/home");
        } else {
          navigate("/");
        }
      });
    } else {
      navigate("/");
    }
  }, [navigate, toast]);

  return null;
};

export default Index;
