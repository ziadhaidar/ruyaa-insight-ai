
import React from "react";
import Layout from "@/components/Layout";
import PaymentForm from "@/components/PaymentForm";

const PaymentPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-14rem)]">
        <PaymentForm />
      </div>
    </Layout>
  );
};

export default PaymentPage;
