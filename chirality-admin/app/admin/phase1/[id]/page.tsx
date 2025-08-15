"use client";
import { useEffect, useState } from "react";
import CanonPreview from "@/components/CanonPreview";
import { useParams } from "next/navigation";

export default function CanonDetailPage() {
  const { id } = useParams();
  const [canon, setCanon] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/phase1/get?id=${id}`)
        .then(r => r.json())
        .then(j => {
          setCanon(j.canon);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div>Loading canon...</div>;
  if (!canon) return <div>Canon not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Canon Detail</h2>
        <span className="text-sm text-gray-600">ID: {id}</span>
      </div>
      
      <div className="grid gap-4">
        <div>
          <h3 className="font-medium mb-2">Metadata</h3>
          <div className="text-sm space-y-1">
            <div><strong>Model:</strong> {canon.model}</div>
            <div><strong>CF Version:</strong> {canon.cf_version}</div>
            <div><strong>Created:</strong> {canon.createdAt}</div>
            <div><strong>Matrix Default:</strong> {canon.matrix_default}</div>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Full Canon</h3>
          <CanonPreview json={canon} />
        </div>
      </div>
    </div>
  );
}