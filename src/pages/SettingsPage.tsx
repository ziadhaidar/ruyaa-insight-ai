import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { countries } from "@/lib/countries";
import { safeGenderCast, safeMaritalStatusCast, safeWorkStatusCast } from "@/types";

interface Profile {
  id: string;
  full_name?: string;
  country?: string;
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  marital_status?: "single" | "married" | "divorced" | "widowed" | "other";
  has_kids?: boolean;
  has_pets?: boolean;
  work_status?: "employed" | "unemployed" | "student" | "retired" | "other";
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile({
          ...data,
          gender: safeGenderCast(data.gender),
          marital_status: safeMaritalStatusCast(data.marital_status),
          work_status: safeWorkStatusCast(data.work_status)
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || ""}
                    onChange={(e) => setProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile?.age || ""}
                    onChange={(e) => setProfile(prev => prev ? {...prev, age: parseInt(e.target.value) || undefined} : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={profile?.gender || ""} onValueChange={(value) => setProfile(prev => prev ? {...prev, gender: safeGenderCast(value)} : null)}>
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
                </div>

                <div>
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select value={profile?.marital_status || ""} onValueChange={(value) => setProfile(prev => prev ? {...prev, marital_status: safeMaritalStatusCast(value)} : null)}>
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
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={profile?.country || ""} onValueChange={(value) => setProfile(prev => prev ? {...prev, country: value} : null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="work_status">Work Status</Label>
                  <Select value={profile?.work_status || ""} onValueChange={(value) => setProfile(prev => prev ? {...prev, work_status: safeWorkStatusCast(value)} : null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={logout} variant="destructive">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
