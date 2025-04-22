import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Dream } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const DreamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dream, setDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDreamDetail = async () => {
      if (!user || !id) return;

      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          toast({
            title: "Dream not found",
            description: "The dream you're looking for does not exist or you don't have permission to view it.",
            variant: "destructive",
          });
          navigate("/dreams");
          return;
        }

        console.log("Dream details fetched:", data);
        setDream(data);
      } catch (error: any) {
        console.error("Error fetching dream details:", error);
        toast({
          title: "Error",
          description: error.message || "An error occurred while fetching the dream details.",
          variant: "destructive",
        });
        navigate("/dreams");
      } finally {
        setLoading(false);
      }
    };

    fetchDreamDetail();
  }, [id, user, navigate, toast]);

  // Update localStorage with current route whenever id changes
  useEffect(() => {
    if (id) {
      localStorage.setItem('lastRoute', `/dreams/${id}`);
    }
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
          <p>Loading dream details...</p>
        </div>
      </Layout>
    );
  }

  if (!dream) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
          <p>Dream not found.</p>
        </div>
      </Layout>
    );
  }

  // Determine dream status
  let status = "draft";
  if (dream.interpretation) {
    status = "submitted";
  } else if (dream.status === "interpreting") {
    status = "in progress";
  } else if (dream.status === "completed") {
    status = "completed";
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>Dream from {format(new Date(dream.created_at), "MMMM d, yyyy")}</span>
                <Badge 
                  variant={status === "submitted" || status === "completed" ? "success" : "outline"} 
                  className={status === "submitted" || status === "completed" ? "bg-green-600" : "bg-amber-500 text-white"}
                >
                  {status}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/dreams")}>
                Back to Dreams
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Your Dream</h3>
              <p className="text-muted-foreground p-4 bg-secondary/30 rounded-md">
                {dream.dream_text}
              </p>
            </div>

            {dream.interpretation && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Interpretation</h3>
                <div className="p-4 bg-primary/10 rounded-md">
                  <p>{dream.interpretation}</p>
                </div>
              </div>
            )}

            {!dream.interpretation && (
              <div className="text-center p-6">
                <p className="mb-4">This dream has not been interpreted yet.</p>
                <Button onClick={() => navigate("/payment")}>
                  Get Interpretation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DreamDetailPage;
