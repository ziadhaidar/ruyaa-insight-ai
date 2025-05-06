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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";
import LoadingAnimation from "./LoadingAnimation";
import { useAuth } from "@/context/AuthContext";

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
  const [selectedDreams, setSelectedDreams] = useState<Record<string, boolean>>({});
  const [allSelected, setAllSelected] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Count selected dreams
  const selectedCount = Object.values(selectedDreams).filter(Boolean).length;

  useEffect(() => {
    fetchDreams();
  }, []);

  const fetchDreams = async () => {
    try {
      setLoading(true);

      // First check if the user is logged in
      if (!user) {
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
        toast({
          title: "Error",
          description: "Failed to load your dreams. Please try again.",
          variant: "destructive"
        });
      } else {
        // Process dreams and filter out duplicates or incomplete dreams
        const processedDreams = processAndFilterDreams(data || []);
        setDreams(processedDreams);
      }
    } catch (error) {
      console.error("Error in fetchDreams:", error);
    } finally {
      setLoading(false);
    }
  };

  // Process dreams to filter out duplicates and update status
  const processAndFilterDreams = (data: Dream[]) => {
    // Group dreams by their text to identify duplicates
    const dreamsByText: Record<string, Dream[]> = {};
    
    data.forEach((dream) => {
      const key = dream.dream_text.trim();
      if (!dreamsByText[key]) {
        dreamsByText[key] = [];
      }
      dreamsByText[key].push(dream);
    });
    
    // For each set of duplicate dreams, keep only the most complete one
    const filteredDreams: Dream[] = [];
    
    Object.values(dreamsByText).forEach(duplicates => {
      // Sort by "completeness" - prioritize dreams with interpretations and Q&A
      const sorted = duplicates.sort((a, b) => {
        // Completed dreams get highest priority
        if (a.interpretation && !b.interpretation) return -1;
        if (!a.interpretation && b.interpretation) return 1;
        
        // If both have interpretations, prioritize the one with more Q&A
        if (a.interpretation && b.interpretation) {
          const aQCount = Array.isArray(a.questions) ? a.questions.length : 0;
          const bQCount = Array.isArray(b.questions) ? b.questions.length : 0;
          return bQCount - aQCount; // Higher count first
        }
        
        // If neither has interpretations, prioritize by creation date (newer first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Add only the most complete version
      if (sorted.length > 0) {
        filteredDreams.push(sorted[0]);
      }
    });
    
    // Update status based on interpretation and chat history
    return filteredDreams.map((dream: Dream) => {
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
  };

  // Toggle selection of a single dream
  const toggleDreamSelection = (id: string) => {
    setSelectedDreams(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle selection of all dreams
  const toggleSelectAll = () => {
    const newAllSelected = !allSelected;
    setAllSelected(newAllSelected);
    
    const newSelectedDreams: Record<string, boolean> = {};
    dreams.forEach(dream => {
      newSelectedDreams[dream.id] = newAllSelected;
    });
    setSelectedDreams(newSelectedDreams);
  };

  // Delete selected dreams
  const deleteSelectedDreams = async () => {
    try {
      const ids = Object.keys(selectedDreams).filter(id => selectedDreams[id]);
      if (ids.length === 0) {
        toast({
          title: "No dreams selected",
          description: "Please select at least one dream to delete.",
          variant: "destructive"
        });
        return;
      }

      // Confirm deletion
      if (!confirm(`Are you sure you want to delete ${ids.length} dream${ids.length !== 1 ? 's' : ''}?`)) {
        return;
      }

      setLoading(true);
      
      const { error } = await supabase
        .from('dreams')
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
      }

      // Update local state to remove deleted dreams
      setDreams(prevDreams => prevDreams.filter(dream => !ids.includes(dream.id)));
      
      toast({
        title: "Dreams deleted",
        description: `Successfully deleted ${ids.length} dream${ids.length !== 1 ? 's' : ''}.`
      });
      
      // Reset selections
      setSelectedDreams({});
      setAllSelected(false);
    } catch (error: any) {
      console.error("Error deleting dreams:", error);
      toast({
        title: "Error",
        description: `Couldn't delete dreams: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a single dream
  const deleteSingleDream = async (id: string) => {
    try {
      // Confirm deletion
      if (!confirm("Are you sure you want to delete this dream?")) {
        return;
      }

      setLoading(true);
      
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      // Update local state to remove the deleted dream
      setDreams(prevDreams => prevDreams.filter(dream => dream.id !== id));

      toast({
        title: "Dream deleted",
        description: "Successfully deleted the dream."
      });
    } catch (error: any) {
      console.error("Error deleting dream:", error);
      toast({
        title: "Error",
        description: `Couldn't delete dream: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
        <Button onClick={() => navigate("/home")}>Record a Dream</Button>
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
      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="bg-muted/30 p-2 rounded-md mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedCount} dream{selectedCount !== 1 ? 's' : ''} selected</span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={deleteSelectedDreams}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] pr-0">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all dreams"
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50%]">Dream</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dreams.map((dream) => (
            <TableRow key={dream.id}>
              <TableCell className="pr-0">
                <Checkbox 
                  checked={!!selectedDreams[dream.id]}
                  onCheckedChange={() => toggleDreamSelection(dream.id)}
                  aria-label={`Select dream ${dream.id}`}
                />
              </TableCell>
              <TableCell>{formatDate(dream.created_at)}</TableCell>
              <TableCell>{truncateText(dream.dream_text)}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(dream.status || "pending")}>
                  {getStatusText(dream)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dreams/${dream.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSingleDream(dream.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PastDreamsTable;
