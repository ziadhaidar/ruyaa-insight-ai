
import React from "react";
import Layout from "@/components/Layout";
import LoginForm from "@/components/LoginForm";

const LoginPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <LoginForm />
      </div>
    </Layout>
  );
};

export default LoginPage;
