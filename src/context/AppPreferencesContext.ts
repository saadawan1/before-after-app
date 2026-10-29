import { createContext, useContext } from "react";
import type { AppPreferences } from "../types";

export const AppPreferencesContext = createContext<AppPreferences | null>(null);

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesContext.Provider");
  }
  return context;
};
