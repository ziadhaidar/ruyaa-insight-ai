
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "@/components/ui/chart";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [dreamCount, setDreamCount] = useState<number>(0);
  const [pageViews, setPageViews] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get user count
        const { count: userCountResult, error: userError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (userError) throw userError;
        
        // Get dream count
        const { count: dreamCountResult, error: dreamError } = await supabase
          .from("dreams")
          .select("*", { count: "exact", head: true });
          
        if (dreamError) throw dreamError;

        // Get page view count
        const { count: pageViewResult, error: pageViewError } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", "page_view");
          
        if (pageViewError) throw pageViewError;

        setUserCount(userCountResult || 0);
        setDreamCount(dreamCountResult || 0);
        setPageViews(pageViewResult || 0);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate("/admin/posts")}>Manage Blog</Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : userCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered accounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dreams Recorded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : dreamCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total dream records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "Loading..." : pageViews}
                </div>
                <p className="text-xs text-muted-foreground">
                  Analytics tracked views
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Analytics</CardTitle>
              <CardDescription>
                Page views over time
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-80">
                {/* Placeholder for chart - would normally populate with real data */}
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Analytics data will display here
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
