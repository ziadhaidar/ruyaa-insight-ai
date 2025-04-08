
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dreams.map((dream) => {
              // Determine status based on interpretation field
              const status = dream.interpretation ? "completed" : "pending";
              
              return (
                <TableRow key={dream.id}>
                  <TableCell>
                    {format(new Date(dream.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {dream.dream_text}
                  </TableCell>
                  <TableCell>
                    <span className={`capitalize ${status === "completed" ? "text-green-600" : "text-amber-600"}`}>
                      {status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dreams/${dream.id}`)}
                      >
                        View
                      </Button>
                    )}
                    {status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/payment")}
                      >
                        Pay
                      </Button>
                    )}
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
