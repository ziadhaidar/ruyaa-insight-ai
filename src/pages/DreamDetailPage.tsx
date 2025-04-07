
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useDream } from "@/context/DreamContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";

const DreamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { getDream, getMessages, sendToEmail } = useDream();
  const navigate = useNavigate();
  
  const dream = id ? getDream(id) : undefined;
  const messages = id ? getMessages(id) : [];
  
  useEffect(() => {
    if (!dream) {
      navigate("/dreams");
    }
  }, [dream, navigate]);
  
  if (!dream) {
    return null;
  }
  
  const handleSendToEmail = () => {
    if (id) {
      sendToEmail(id);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dreams")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Dream Interpretation</h1>
        </div>
        
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-medium">Your Dream</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(dream.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSendToEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                {t("sendToEmail")}
              </Button>
            </div>
            <p className="mb-4">{dream.content}</p>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {messages.filter(m => m.sender === "ai").map((message, index) => (
            <div
              key={message.id}
              className="p-4 rounded-lg bg-primary/10"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DreamDetailPage;
