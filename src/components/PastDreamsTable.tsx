
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Dream } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const PastDreamsTable: React.FC = () => {
  const { t } = useLanguage();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDreams = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setDreams(data || []);
      } catch (error) {
        console.error("Error fetching dreams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDreams();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pastDreams")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dreams.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pastDreams")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t("noHistoryYet")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("pastDreams")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dream</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dreams.map((dream) => {
              // Determine status based on interpretation field
              const status = dream.interpretation ? "submitted" : "draft";
              // Determine plan based on the status field or other logic
              const plan = dream.status === "paid" ? "Paid" : "Free";
              
              return (
                <TableRow key={dream.id}>
                  <TableCell>
                    {format(new Date(dream.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {dream.dream_text}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "submitted" ? "success" : "outline"} className={status === "submitted" ? "bg-green-600" : "bg-amber-500 text-white"}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dreams/${dream.id}`)}
                    >
                      {plan}
                    </Button>
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
