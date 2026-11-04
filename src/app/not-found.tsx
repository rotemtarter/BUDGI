import type { Metadata } from "next";
import { NotFoundCard } from "@/components/common/not-found-card";

export const metadata: Metadata = { title: "הדף לא נמצא · Budgi" };

// Any address that does not exist (outside the Shell)
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
      <NotFoundCard />
    </main>
  );
}
