
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import AdminRoute from "@/components/AdminRoute";
import { safePostStatusCast } from "@/types";

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  meta_title: string;
  meta_description: string;
  featured_image: string;
  tags: string[];
  status: "draft" | "published";
}

const PostEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    meta_title: "",
    meta_description: "",
    featured_image: "",
    tags: [],
    status: "draft",
  });

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || "",
          body: data.body,
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          featured_image: data.featured_image || "",
          tags: data.tags || [],
          status: safePostStatusCast(data.status),
        });
      }
    } catch (error: any) {
      console.error("Error fetching post:", error);
      toast({
        title: "Error loading post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: generateSlug(value),
    }));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!user) return;

    setSaving(true);
    try {
      const postData = {
        ...formData,
        status,
        author_id: user.id,
        published_at: status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("posts")
          .insert([postData]);

        if (error) throw error;
      }

      toast({
        title: `Post ${status === "published" ? "published" : "saved"}`,
        description: `The post has been ${status === "published" ? "published" : "saved as draft"} successfully.`,
      });

      navigate("/admin/blog");
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast({
        title: "Error saving post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <Layout>
          <div className="max-w-4xl mx-auto">
            <p>Loading post...</p>
          </div>
        </Layout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{id ? "Edit Post" : "Create New Post"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="post-slug"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description of the post"
                />
              </div>

              <div>
                <Label htmlFor="body">Content</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Write your post content here..."
                  className="min-h-[300px]"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save as Draft"}
                </Button>
                <Button
                  onClick={() => handleSave("published")}
                  disabled={saving}
                >
                  {saving ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AdminRoute>
  );
};

export default PostEditor;
