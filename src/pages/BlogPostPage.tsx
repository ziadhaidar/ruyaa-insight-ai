
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  featured_image: string;
  published_at: string;
  meta_title: string;
  meta_description: string;
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (error) throw error;
        setPost(data);
        
        // Set meta tags
        if (data) {
          document.title = data.meta_title || data.title;
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', data.meta_description || data.excerpt || '');
          }
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
        navigate('/blog');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format the body text with proper paragraphs
  const formatBody = (body: string) => {
    return body.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">{paragraph}</p>
    ));
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p>Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <Button asChild>
          <Link to="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/blog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Link>
      </Button>

      <article className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <time className="text-muted-foreground">
            {formatDate(post.published_at)}
          </time>
        </header>

        {post.featured_image && (
          <div className="aspect-video w-full overflow-hidden rounded-lg mb-8">
            <img
              src={post.featured_image}
              alt={post.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x675?text=Nour+Al+Ruyaa';
              }}
            />
          </div>
        )}

        <div className="prose prose-lg max-w-none dark:prose-invert">
          {formatBody(post.body)}
        </div>
      </article>
    </div>
  );
};

export default BlogPostPage;
