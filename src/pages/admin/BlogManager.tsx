
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useAdmin } from "@/context/AdminContext";
import AdminRoute from "@/components/AdminRoute";
import { safePostStatusCast } from "@/types";

interface Post {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
}

const BlogManager: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, status, created_at, published_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Convert raw data to Post objects with proper type safety
      const postsData: Post[] = (data || []).map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: safePostStatusCast(post.status),
        created_at: post.created_at,
        published_at: post.published_at
      }));

      setPosts(postsData);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error fetching posts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "The post has been deleted successfully.",
      });

      // Refresh the posts list
      fetchPosts();
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AdminRoute>
      <Layout>
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Blog Manager</CardTitle>
              <Button onClick={() => navigate("/admin/post-editor")}>
                Create New Post
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading posts...</p>
              ) : posts.length === 0 ? (
                <p>No posts found. Create your first post!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          <Badge variant={post.status === "published" ? "default" : "secondary"}>
                            {post.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(post.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/post-editor/${post.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AdminRoute>
  );
};

export default BlogManager;
