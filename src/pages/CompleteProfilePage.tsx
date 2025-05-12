
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const profileFormSchema = z.object({
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old" }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"]),
  hasKids: z.enum(["yes", "no"]),
  hasPets: z.enum(["yes", "no"]),
  workStatus: z.enum(["employed", "unemployed", "student", "retired", "other"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const CompleteProfilePage: React.FC = () => {
  const { user, hasCompleteProfile, refreshProfileStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Form initialization
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      gender: undefined,
      maritalStatus: undefined,
      hasKids: undefined,
      hasPets: undefined,
      workStatus: undefined
    },
  });

  // Check if profile is already complete and redirect if it is
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    
    console.log("CompleteProfilePage - checking profile completion");
    const checkAndRedirect = async () => {
      try {
        console.log("Checking if profile is already complete for user:", user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('age, gender, marital_status, has_kids, has_pets, work_status')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error checking profile:", error);
          setIsChecking(false);
          return;
        }
        
        const isComplete = data && 
          data.age !== null && 
          data.gender !== null && 
          data.marital_status !== null && 
          data.has_kids !== null && 
          data.has_pets !== null && 
          data.work_status !== null;
          
        console.log("Profile data from check:", data, "Complete:", isComplete);
        
        if (isComplete) {
          console.log("Profile is already complete, redirecting to dreams page");
          await refreshProfileStatus();
          navigate("/dreams", { replace: true });
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error in profile check:", error);
        setIsChecking(false);
      }
    };
    
    checkAndRedirect();
  }, [user, navigate, refreshProfileStatus]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age: values.age,
          gender: values.gender,
          marital_status: values.maritalStatus,
          has_kids: values.hasKids === "yes",
          has_pets: values.hasPets === "yes",
          work_status: values.workStatus
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile completed",
        description: "Your profile has been successfully saved",
      });
      
      // Refresh profile status in context
      await refreshProfileStatus();
      
      // After confirming the profile is saved, redirect to dreams page
      console.log("Profile saved, redirecting to dreams page");
      navigate("/dreams", { replace: true });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center">Checking profile status...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide some information about yourself to help us personalize your dream interpretations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your age" 
                        type="number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasKids"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Do you have children?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="hasKids-yes" />
                          <Label htmlFor="hasKids-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="hasKids-no" />
                          <Label htmlFor="hasKids-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasPets"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Do you have pets?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="hasPets-yes" />
                          <Label htmlFor="hasPets-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="hasPets-no" />
                          <Label htmlFor="hasPets-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="workStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfilePage;
