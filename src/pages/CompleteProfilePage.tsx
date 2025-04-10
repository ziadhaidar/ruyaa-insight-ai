
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Layout from "@/components/Layout";

const profileFormSchema = z.object({
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old" }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], { 
    required_error: "Please select your gender" 
  }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"], { 
    required_error: "Please select your marital status" 
  }),
  hasKids: z.enum(["yes", "no"], { 
    required_error: "Please indicate if you have children" 
  }),
  hasPets: z.enum(["yes", "no"], { 
    required_error: "Please indicate if you have pets" 
  }),
  workStatus: z.enum(["employed", "unemployed", "student", "retired", "other"], { 
    required_error: "Please select your employment status" 
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const CompleteProfilePage: React.FC = () => {
  const { user, refreshProfileStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

  // Fetch existing profile data if available
  useEffect(() => {
    const getProfileData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (data) {
          // Set default values from existing profile
          form.setValue('age', data.age || undefined);
          form.setValue('gender', data.gender || undefined);
          form.setValue('maritalStatus', data.marital_status || undefined);
          form.setValue('hasKids', data.has_kids ? 'yes' : 'no');
          form.setValue('hasPets', data.has_pets ? 'yes' : 'no');
          form.setValue('workStatus', data.work_status || undefined);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    };

    getProfileData();
  }, [user, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.from('profiles').update({
        age: values.age,
        gender: values.gender,
        marital_status: values.maritalStatus,
        has_kids: values.hasKids === "yes",
        has_pets: values.hasPets === "yes",
        work_status: values.workStatus
      }).eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      await refreshProfileStatus();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully completed",
      });
      
      navigate("/home");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "There was a problem updating your profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide the following information to help us personalize your dream interpretations.
              This information is required to continue using the app.
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
                          {...field} 
                          type="number" 
                          placeholder="Your age" 
                          required
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
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
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
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="hasKids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have children?</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row space-x-4"
                          required
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
                    <FormItem>
                      <FormLabel>Do you have pets?</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row space-x-4"
                          required
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
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employment status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CompleteProfilePage;
