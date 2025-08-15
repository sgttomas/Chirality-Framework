"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the Phase 1 workbench
    router.push("/admin/phase1");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Chirality Admin</h1>
        <p className="text-gray-600 mb-4">Redirecting to Phase 1 Workbench...</p>
        <div className="text-sm text-gray-500">
          If not redirected, <a href="/admin/phase1" className="text-blue-600 underline">click here</a>
        </div>
      </div>
    </div>
  );
}