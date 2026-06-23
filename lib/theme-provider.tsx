import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

type ThemeState = { scheme: "light" | "dark" };
const ThemeContext = createContext<ThemeState>({ scheme: "light" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  return (
    <ThemeContext.Provider value={{ scheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
