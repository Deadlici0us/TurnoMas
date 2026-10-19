import { Suspense } from "react";

import OnboardingWizard from "@/components/onboarding-wizard";

// El wizard es cliente con next-intl: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
// useSearchParams exige Suspense en el prerender.
export const dynamic = "force-dynamic";

export default function OnboardingPage()
{
  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-surface">
      <Suspense>
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
