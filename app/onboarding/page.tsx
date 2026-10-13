import { Suspense } from "react";

import OnboardingWizard from "@/components/onboarding-wizard";

// El wizard es cliente con next-intl: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
// useSearchParams exige Suspense en el prerender.
export const dynamic = "force-dynamic";

export default function OnboardingPage()
{
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <Suspense>
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
