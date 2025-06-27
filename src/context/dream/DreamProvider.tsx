
import React, { createContext, useContext } from "react";
import { DreamContextType, DreamProviderProps } from "./types";
import { useDreamState } from "./DreamState";
import { useDreamActions } from "./DreamActions";

// Create the context
const DreamContext = createContext<DreamContextType | undefined>(undefined);

export const DreamProvider = ({ children }: DreamProviderProps) => {
  // Get dream state
  const dreamState = useDreamState();
  
  // Get dream actions
  const dreamActions = useDreamActions(dreamState);
  
  // Combine state and actions for the context value
  const contextValue: DreamContextType = {
    currentDream: dreamState.currentDream,
    currentSession: dreamState.currentSession,
    interpretationSession: dreamState.interpretationSession,
    setCurrentDream: dreamState.setCurrentDream,
    startNewDreamSession: dreamState.startNewDreamSession,
    isLoading: dreamState.isLoading,
    ...dreamActions
  };

  return (
    <DreamContext.Provider value={contextValue}>
      {children}
    </DreamContext.Provider>
  );
};

export const useDream = () => {
  const context = useContext(DreamContext);
  if (context === undefined) {
    throw new Error("useDream must be used within a DreamProvider");
  }
  return context;
};
