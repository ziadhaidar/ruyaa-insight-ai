
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingAnimation from "./LoadingAnimation";
import { useOpenAIAssistant } from "@/hooks/useOpenAIAssistant";
import aiAvatar from "/ai_avatar.png";
import { useDream } from "@/context/DreamContext";

const InterpretationChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dreamText, setDreamText] = useState("");
  const [dreamInterpretation, setDreamInterpretation] = useState("");
  const [chatHistory, setChatHistory] = useState<{
    questions: string[];
    answers: string[];
  }>({ questions: [], answers: [] });
  const [isInterpretationComplete, setIsInterpretationComplete] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { 
    threadId, 
    setThreadId,
    createAssistantThread, 
    sendMessageToAssistant, 
    runAssistantAndGetResponse, 
    getLatestAssistantMessage 
  } = useOpenAIAssistant();
  const { currentDream } = useDream();

  useEffect(() => {
    // When component mounts, fetch dream data if there's an ID,
    // or use currentDream if available from the dream context
    if (id) {
      fetchDreamData(id);
    } else if (currentDream) {
      // Check if we have a current dream and start interpretation
      setDreamText(currentDream.dream_text);
      handleInitialInterpretation(currentDream.dream_text);
    } else {
      // If no ID and no current dream, show an error
      toast({
        title: "No dream found",
        description: "Please submit a dream first",
        variant: "destructive",
      });
    }
  }, [id, currentDream]);

  useEffect(() => {
    // Scroll to bottom when chat history updates
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport=""]'
      ) as HTMLDivElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatHistory]);

  const fetchDreamData = async (dreamId: string) => {
    setIsLoading(true);
    try {
      const { data: dream, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("id", dreamId)
        .single();

      if (error) {
        console.error("Error fetching dream:", error);
        toast({
          title: "Error fetching dream",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (dream) {
        setDreamText(dream.dream_text || "");
        
        // If there's an interpretation, mark the session as complete
        if (dream.interpretation) {
          setDreamInterpretation(dream.interpretation);
          setIsInterpretationComplete(true);
        }
        
        // Load chat history if available
        const questions = Array.isArray(dream.questions) ? dream.questions : [];
        const answers = Array.isArray(dream.answers) ? dream.answers : [];
        
        setChatHistory({
          questions,
          answers,
        });

        // If no interpretation yet, fetch one
        if (!dream.interpretation && questions.length === 0) {
          handleInitialInterpretation(dream.dream_text);
        }
      }
    } catch (error) {
      console.error("Error in fetchDreamData:", error);
      toast({
        title: "An error occurred",
        description: "Could not fetch dream data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialInterpretation = async (dreamText: string) => {
    setIsLoading(true);
    try {
      console.log("Starting initial interpretation for dream:", dreamText.substring(0, 50) + "...");
      
      // Create a new thread
      const newThreadId = await createAssistantThread();
      if (!newThreadId) {
        throw new Error("Failed to create thread for interpretation");
      }
      console.log("Created new thread:", newThreadId);
      setThreadId(newThreadId);
      
      // Add the dream text to the thread
      const userId = (await supabase.auth.getUser()).data.user?.id || "user";
      console.log("Sending dream to assistant with user ID:", userId);
      await sendMessageToAssistant(newThreadId, dreamText, userId);
      
      // Run the assistant to get the first question
      console.log("Getting first question from assistant");
      const response = await runAssistantAndGetResponse(newThreadId, 1);
      console.log("First question received:", response);
      
      // Save the initial response as the first question
      const updatedQuestions = [response];
      setChatHistory({
        questions: updatedQuestions,
        answers: []
      });
      
      // Save to database if we have an ID
      let dreamId = id;
      if (!dreamId && currentDream) {
        // If we don't have an ID but we have a current dream, create a new record
        const { data, error } = await supabase
          .from("dreams")
          .insert({
            user_id: userId,
            dream_text: dreamText,
            interpretation: null,
            questions: updatedQuestions,
            answers: [],
            status: "interpreting"
          })
          .select();
          
        if (error) {
          console.error("Error creating dream record:", error);
          toast({
            title: "Error saving dream",
            description: error.message,
            variant: "destructive",
          });
        } else if (data && data.length > 0) {
          dreamId = data[0].id;
        }
      } else if (dreamId) {
        // If we have an ID, update the existing record
        const { error } = await supabase
          .from("dreams")
          .update({ 
            questions: updatedQuestions,
            answers: []
          })
          .eq("id", dreamId);

        if (error) {
          console.error("Error saving questions:", error);
          toast({
            title: "Error saving interpretation",
            description: error.message,
            variant: "destructive",
          });
        }
      }
      
    } catch (error) {
      console.error("Error getting interpretation:", error);
      toast({
        title: "Error interpreting dream",
        description: "Failed to get dream interpretation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !threadId || isInterpretationComplete) return;

    const question = userInput.trim();
    setUserInput("");
    setIsLoading(true);

    // Update local state immediately for better UX
    const updatedAnswers = [...chatHistory.answers, question];
    setChatHistory((prev) => ({
      ...prev,
      answers: updatedAnswers,
    }));

    try {
      // Send the user's answer to the thread
      const userId = (await supabase.auth.getUser()).data.user?.id || "user";
      await sendMessageToAssistant(threadId, question, userId);
      
      // Get the next question number
      const nextQuestionNumber = chatHistory.questions.length + 1;
      
      // Run the assistant to get the next question or final interpretation
      const assistantResponse = await runAssistantAndGetResponse(threadId, nextQuestionNumber);
      
      // Update chat history with the assistant's response
      const updatedQuestions = [...chatHistory.questions, assistantResponse];
      const newChatHistory = {
        questions: updatedQuestions,
        answers: updatedAnswers,
      };
      
      setChatHistory(newChatHistory);

      // If this is the final interpretation (after question 3), set it as the dream interpretation
      if (nextQuestionNumber > 3) {
        setDreamInterpretation(assistantResponse);
        setIsInterpretationComplete(true);
      }

      // Save to database
      let dreamId = id;
      if (!dreamId && currentDream) {
        // Try to get the dream ID from the database
        const { data, error } = await supabase
          .from("dreams")
          .select("id")
          .eq("user_id", userId)
          .eq("dream_text", dreamText)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0) {
          dreamId = data[0].id;
        }
      }
      
      if (dreamId) {
        const updateData: any = {
          questions: updatedQuestions,
          answers: updatedAnswers,
        };
        
        // If this was the final interpretation, mark it as such
        if (nextQuestionNumber > 3) {
          updateData.interpretation = assistantResponse;
          updateData.status = "completed";
        }
        
        const { error } = await supabase
          .from("dreams")
          .update(updateData)
          .eq("id", dreamId);

        if (error) {
          console.error("Error saving chat history:", error);
          toast({
            title: "Error saving question",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error asking follow-up question:", error);
      toast({
        title: "Error",
        description: "Failed to get answer",
        variant: "destructive",
      });

      // Remove the answer from the local state if it failed
      setChatHistory((prev) => ({
        ...prev,
        answers: prev.answers.slice(0, -1),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Render the dream submission as the first message
  const renderDreamSubmission = () => {
    if (!dreamText) return null;
    
    return (
      <div className="mb-6">
        <div className="flex justify-end mb-2">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground max-w-[80%]">
            <p className="text-sm font-medium mb-1">My Dream:</p>
            <p className="text-sm">{dreamText}</p>
          </div>
          <Avatar className="h-8 w-8 ml-2">
            <div className="h-full w-full bg-muted flex items-center justify-center rounded-full">
              <span className="text-xs">You</span>
            </div>
          </Avatar>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden" ref={scrollAreaRef}>
        <ScrollArea className="h-full pr-4">
          {isLoading && !chatHistory.questions.length && (
            <div className="flex justify-center items-center py-10">
              <LoadingAnimation message="Preparing dream interpretation..." />
            </div>
          )}
          
          {renderDreamSubmission()}
          
          {chatHistory.questions.map((question, index) => (
            <div key={index} className="mb-6">
              <div className="flex items-start mb-2">
                <Avatar className="h-8 w-8 mr-2">
                  <img src={aiAvatar} alt="AI" className="h-full w-full object-cover" />
                </Avatar>
                <div className="bg-primary/10 p-3 rounded-lg max-w-[80%]">
                  <p className="text-sm whitespace-pre-wrap">{question}</p>
                </div>
              </div>

              {index < chatHistory.answers.length && (
                <div className="flex items-start justify-end mb-2">
                  <div className="bg-primary p-3 rounded-lg text-primary-foreground max-w-[80%]">
                    <p className="text-sm">{chatHistory.answers[index]}</p>
                  </div>
                  <Avatar className="h-8 w-8 ml-2">
                    <div className="h-full w-full bg-muted flex items-center justify-center rounded-full">
                      <span className="text-xs">You</span>
                    </div>
                  </Avatar>
                </div>
              )}
            </div>
          ))}

          {isLoading && chatHistory.questions.length > 0 && (
            <div className="flex justify-center items-center py-4">
              <LoadingAnimation />
            </div>
          )}
          
          {isInterpretationComplete && (
            <div className="flex justify-center mt-8 mb-4">
              <Button 
                onClick={() => navigate("/dreams")}
                variant="outline" 
                className="islamic-gradient-btn"
              >
                See My Past Dreams
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      <form onSubmit={handleSubmitQuestion} className="mt-4">
        <div className="flex gap-2">
          <Textarea
            placeholder={isInterpretationComplete 
              ? "Interpretation complete" 
              : "Answer the question about your dream..."}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="resize-none"
            disabled={isLoading || isInterpretationComplete}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !userInput.trim() || isInterpretationComplete}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InterpretationChat;
