import { Suspense } from "react";
import ConceptView from "@/components/ConceptView";

export default function ConceptPage() {
  return (
    <Suspense fallback={<p className="p-8 text-white/60">Loading...</p>}>
      <ConceptView />
    </Suspense>
  );
}