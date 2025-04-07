
import React from "react";
import Layout from "@/components/Layout";
import RegisterForm from "@/components/RegisterForm";

const RegisterPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <RegisterForm />
      </div>
    </Layout>
  );
};

export default RegisterPage;
