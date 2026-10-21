import { Suspense } from "react";
import LearnLesson from "@/components/LearnLesson";

export default function LearnLessonPage() {
  return (
    <Suspense fallback={<p className="p-8 text-white/60">Loading lesson...</p>}>
      <LearnLesson />
    </Suspense>
  );
}