import React, { createContext, useContext, useState } from "react";
import { Stack } from "expo-router";

export type OnboardingDraft = {
  glp1Drug?: string;
  dosageStage?: string;
  weightCurrent?: number;
  weightGoal?: number;
  proteinTarget?: number;
  dietaryPreferences: string[];
};

type Ctx = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function useOnboarding() {
  const c = useContext(OnboardingContext);
  if (!c) throw new Error("useOnboarding must be used within onboarding layout");
  return c;
}

export default function OnboardingLayout() {
  const [draft, setDraft] = useState<OnboardingDraft>({
    dietaryPreferences: [],
    proteinTarget: 100,
  });
  const update = (patch: Partial<OnboardingDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <OnboardingContext.Provider value={{ draft, update }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingContext.Provider>
  );
}
