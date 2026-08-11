"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface VideoStat {
  totalTimeWatched: number;
  repeats: number;
  completionPercentage: number;
  lastWatchedSeconds?: number;
}

export interface VideoStatsMap {
  [driveId: string]: VideoStat;
}

interface UserActivityContextType {
  bookmarks: string[]; // array of driveIds
  watchHistory: string[]; // array of driveIds
  videoStats: VideoStatsMap;
  toggleBookmark: (driveId: string) => void;
  addToHistory: (driveId: string) => void;
  isBookmarked: (driveId: string) => boolean;
  updateVideoProgress: (driveId: string, timeSpentInSeconds: number, durationInSeconds: number) => void;
  updateResumeTime: (driveId: string, timeInSeconds: number, minStartSecs: number, watchableDuration: number) => void;
  incrementRepeat: (driveId: string) => void;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

export const UserActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<string[]>([]);
  const [videoStats, setVideoStats] = useState<VideoStatsMap>({});
  
  // Ref to prevent infinite loops when updating Firebase
  const isUpdatingFirebase = useRef(false);
  const dataLoadedFromFirebase = useRef(false);

  // Load from LocalStorage for fast initial render, then attach Firebase listener
  useEffect(() => {
    if (user) {
      dataLoadedFromFirebase.current = false;
      // 1. Quick load from localStorage
      const storedBookmarks = localStorage.getItem(`bookmarks_${user.uid}`);
      if (storedBookmarks) {
        try { setBookmarks(JSON.parse(storedBookmarks)); } catch (e) {}
      }

      const storedHistory = localStorage.getItem(`history_${user.uid}`);
      if (storedHistory) {
        try { setWatchHistory(JSON.parse(storedHistory)); } catch (e) {}
      }

      const storedStats = localStorage.getItem(`videoStats_${user.uid}`);
      if (storedStats) {
        try { setVideoStats(JSON.parse(storedStats)); } catch (e) {}
      }

      // 2. Firebase Sync
      const userActivityRef = doc(db, "users", user.uid, "activity", "main");
      
      const unsubscribe = onSnapshot(userActivityRef, (docSnap) => {
        if (docSnap.exists() && !isUpdatingFirebase.current) {
          const data = docSnap.data();
          if (data.bookmarks) setBookmarks(data.bookmarks);
          if (data.watchHistory) setWatchHistory(data.watchHistory);
          if (data.videoStats) setVideoStats(data.videoStats);
        }
        dataLoadedFromFirebase.current = true; // Mark as loaded
      });

      return () => unsubscribe();
    } else {
      setBookmarks([]);
      setWatchHistory([]);
      setVideoStats({});
      dataLoadedFromFirebase.current = false;
    }
  }, [user]);

  // Save to LocalStorage & Firebase whenever they change
  useEffect(() => {
    if (user && dataLoadedFromFirebase.current) {
      localStorage.setItem(`bookmarks_${user.uid}`, JSON.stringify(bookmarks));
      localStorage.setItem(`history_${user.uid}`, JSON.stringify(watchHistory));
      localStorage.setItem(`videoStats_${user.uid}`, JSON.stringify(videoStats));
      
      // Update Firebase
      const syncToFirebase = async () => {
        isUpdatingFirebase.current = true;
        try {
          const userActivityRef = doc(db, "users", user.uid, "activity", "main");
          await setDoc(userActivityRef, {
            bookmarks,
            watchHistory,
            videoStats,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing to Firebase:", error);
        } finally {
          // Add a small delay before accepting snapshot updates again to prevent echo
          setTimeout(() => {
            isUpdatingFirebase.current = false;
          }, 500);
        }
      };
      
      syncToFirebase();
    }
  }, [bookmarks, watchHistory, videoStats, user]);

  const toggleBookmark = (driveId: string) => {
    setBookmarks((prev) => {
      if (prev.includes(driveId)) {
        return prev.filter((id) => id !== driveId);
      } else {
        return [...prev, driveId];
      }
    });
  };

  const addToHistory = (driveId: string) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((id) => id !== driveId);
      return [driveId, ...filtered].slice(0, 50); // Keep max 50 recent videos
    });
  };

  const incrementRepeat = (driveId: string) => {
    setVideoStats((prev) => {
      const current = prev[driveId] || { totalTimeWatched: 0, repeats: 0, completionPercentage: 0 };
      return {
        ...prev,
        [driveId]: {
          ...current,
          repeats: current.repeats + 1
        }
      };
    });
  };

  const updateVideoProgress = (driveId: string, timeSpentInSeconds: number, watchableDuration: number) => {
    if (timeSpentInSeconds < 5) return; // Ignore very short views

    setVideoStats((prev) => {
      const current = prev[driveId] || { totalTimeWatched: 0, repeats: 0, completionPercentage: 0 };
      let newTotalTime = current.totalTimeWatched + timeSpentInSeconds;
      
      // Auto-heal corrupted data from previous infinite loop bug
      if (newTotalTime > watchableDuration * 50) {
        newTotalTime = watchableDuration; // Reset to 1 completion
      }
      
      // Calculate completion, max 100%
      let newCompletion = Math.round((newTotalTime / watchableDuration) * 100);
      if (newCompletion > 100) newCompletion = 100;

      // Auto-heal falsely inflated completion percentage (from the 1-second watchable bug)
      if (current.completionPercentage === 100 && newTotalTime < watchableDuration * 0.95) {
        // Allow downgrade to the correct calculated value
      } else if (newCompletion < current.completionPercentage) {
        // Never decrease completion percentage otherwise
        newCompletion = current.completionPercentage;
      }
      
      // Calculate repeats dynamically (1 repeat for every 95% of watchable duration)
      const calculatedRepeats = Math.floor(newTotalTime / (watchableDuration * 0.95));
      const newRepeats = calculatedRepeats > current.repeats || current.repeats > 50 ? calculatedRepeats : current.repeats;

      return {
        ...prev,
        [driveId]: {
          ...current,
          totalTimeWatched: newTotalTime,
          completionPercentage: newCompletion,
          repeats: newRepeats
        }
      };
    });
  };

  const updateResumeTime = (driveId: string, timeInSeconds: number, minStartSecs: number, watchableDuration: number) => {
    setVideoStats((prev) => {
      const current = prev[driveId] || { totalTimeWatched: 0, repeats: 0, completionPercentage: 0 };
      
      const watchedAmount = Math.max(0, timeInSeconds - minStartSecs);
      let newCompletion = Math.round((watchedAmount / watchableDuration) * 100);
      if (newCompletion > 100) newCompletion = 100;

      // Auto-heal falsely inflated completion percentage
      if (current.completionPercentage === 100 && newCompletion < 95) {
        // Allow downgrade
      } else if (newCompletion < current.completionPercentage) {
        newCompletion = current.completionPercentage;
      }
      
      return {
        ...prev,
        [driveId]: {
          ...current,
          lastWatchedSeconds: timeInSeconds,
          completionPercentage: newCompletion
        }
      };
    });
  };

  const isBookmarked = (driveId: string) => {
    return bookmarks.includes(driveId);
  };

  return (
    <UserActivityContext.Provider
      value={{
        bookmarks,
        watchHistory,
        videoStats,
        toggleBookmark,
        addToHistory,
        isBookmarked,
        updateVideoProgress,
        updateResumeTime,
        incrementRepeat,
      }}
    >
      {children}
    </UserActivityContext.Provider>
  );
};

export const useUserActivity = () => {
  const context = useContext(UserActivityContext);
  if (context === undefined) {
    throw new Error("useUserActivity must be used within a UserActivityProvider");
  }
  return context;
};
