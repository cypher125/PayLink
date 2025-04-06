"use client";

import { useState, useEffect } from "react";
import { getProfile } from "./api";
import { UserProfile } from "./types";
import toast from "./toast";

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await getProfile();
        setUserProfile(profileData);
        
        // Update the pin_set cookie based on the user's PIN status
        if (profileData && typeof profileData.has_pin !== 'undefined') {
          if (profileData.has_pin) {
            document.cookie = `pin_set=true; path=/; SameSite=Lax`;
          } else {
            document.cookie = `pin_set=false; path=/; SameSite=Lax`;
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Using setTimeout to avoid React rendering issues with toast
        setTimeout(() => {
          toast.error("Failed to load user profile");
        }, 0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return { userProfile, isLoading };
}
