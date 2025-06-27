
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Dream, jsonToStringArray, safeStatusCast } from "@/types";

const PastDreamsTable: React.FC = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchDreams();
  }, [user]);

  const fetchDreams = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("Raw dreams data from database:", data);

      // Convert raw data to Dream objects with proper type safety
      const dreamsData: Dream[] = (data || []).map(dream => ({
        id: dream.id,
        user_id: dream.user_id,
        dream_text: dream.dream_text,
        questions: jsonToStringArray(dream.questions),
        answers: jsonToStringArray(dream.answers),
        interpretation: dream.interpretation,
        created_at: dream.created_at,
        status: safeStatusCast(dream.status)
      }));

      console.log("Processed dreams data:", dreamsData);
      setDreams(dreamsData);
    } catch (error: any) {
      console.error("Error fetching dreams:", error);
      toast({
        title: "Error fetching dreams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (dream: Dream) => {
    if (dream.interpretation) {
      return { text: "Completed", variant: "default" as const, className: "bg-green-600" };
    } else if (dream.status === "interpreting") {
      return { text: "In Progress", variant: "outline" as const, className: "bg-amber-500 text-white" };
    } else if (dream.status === "completed") {
      return { text: "Completed", variant: "default" as const, className: "bg-green-600" };
    } else {
      return { text: "Draft", variant: "outline" as const, className: "bg-gray-500 text-white" };
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>Past Dreams</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading your dreams...</p>
        </CardContent>
      </Card>
    );
  }

  if (dreams.length === 0) {
    return (
      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>Past Dreams</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You haven't submitted any dreams yet. Submit your first dream to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70">
      <CardHeader>
        <CardTitle>Past Dreams ({dreams.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dream</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dreams.map((dream) => {
              const statusInfo = getStatusDisplay(dream);
              return (
                <TableRow key={dream.id}>
                  <TableCell className="font-medium">
                    {format(new Date(dream.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="text-sm text-muted-foreground">
                        {truncateText(dream.dream_text)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={statusInfo.variant} 
                      className={statusInfo.className}
                    >
                      {statusInfo.text}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dreams/${dream.id}`)}
                      >
                        View
                      </Button>
                      {!dream.interpretation && dream.status !== "completed" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate("/payment")}
                        >
                          Get Interpretation
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PastDreamsTable;
