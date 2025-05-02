
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import LoadingAnimation from "./LoadingAnimation";

type Dream = {
  id: string;
  dream_text: string;
  created_at: string;
  status: string;
  interpretation: string | null;
  questions: string[] | null;
  answers: string[] | null;
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "outline";
    case "interpreted":
      return "secondary";
    case "discussed":
      return "default";
    default:
      return "outline";
  }
};

const PastDreamsTable = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDreams = async () => {
      try {
        setLoading(true);

        // First check if the user is logged in
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          console.log("No authenticated user");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("dreams")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching dreams:", error);
        } else {
          // Update status based on interpretation and chat history
          const processedDreams = data.map((dream: Dream) => {
            let status = dream.status || "pending";
            
            // If there's an interpretation but status is still pending, update it
            if (dream.interpretation && (!status || status === "pending")) {
              status = "interpreted";
            }
            
            // If there are questions and answers, consider it discussed
            if (
              Array.isArray(dream.questions) && 
              dream.questions.length > 0 && 
              Array.isArray(dream.answers) && 
              dream.answers.length > 0
            ) {
              status = "discussed";
            }
            
            return {
              ...dream,
              status,
            };
          });
          
          setDreams(processedDreams);
        }
      } catch (error) {
        console.error("Error in fetchDreams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDreams();
    
    // Subscribe to changes in the dreams table
    const dreamsSubscription = supabase
      .channel('dreams_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'dreams' }, 
        fetchDreams
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dreamsSubscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingAnimation />
      </div>
    );
  }

  if (dreams.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground mb-4">
          You haven't recorded any dreams yet.
        </p>
        <Button onClick={() => navigate("/dreams/new")}>Record a Dream</Button>
      </div>
    );
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text && text.length > maxLength) {
      return `${text.substring(0, maxLength)}...`;
    }
    return text || "";
  };

  const getStatusText = (dream: Dream) => {
    if (!dream.status || dream.status === "pending") {
      return "Pending";
    }
    
    if (
      Array.isArray(dream.questions) && 
      dream.questions.length > 0 && 
      Array.isArray(dream.answers) && 
      dream.answers.length > 0
    ) {
      return `Discussed (${dream.questions.length} Q&A)`;
    }
    
    if (dream.interpretation) {
      return "Interpreted";
    }
    
    return dream.status.charAt(0).toUpperCase() + dream.status.slice(1);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50%]">Dream</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dreams.map((dream) => (
            <TableRow key={dream.id}>
              <TableCell>{formatDate(dream.created_at)}</TableCell>
              <TableCell>{truncateText(dream.dream_text)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(dream.status || "pending")}>
                  {getStatusText(dream)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dreams/${dream.id}`)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PastDreamsTable;
