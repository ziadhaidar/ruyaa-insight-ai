import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  
  // If still loading authentication or admin status, show loading indicator
  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center">Verifying access...</div>;
  }
  
  // If not logged in, redirect to login page
  if (!user) {
    toast.error("You must be logged in to access this area");
    return <Navigate to="/login" replace />;
  }
  
  // If not admin, redirect to home page
  if (!isAdmin) {
    toast.error("You do not have permission to access this area");
    return <Navigate to="/home" replace />;
  }
  
  // Otherwise, render the admin page
  return <>{children}</>;
};

export default AdminRoute;
