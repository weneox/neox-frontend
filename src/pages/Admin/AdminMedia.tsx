import React from "react";
import AdminSectionSkeleton from "./AdminSectionSkeleton";

export default function AdminMedia() {
  return (
    <AdminSectionSkeleton
      title="Media"
      subtitle="Media manager skeleton. Burada upload, file list, preview, tags və istifadə olunan yerlər (refs) olacaq."
      chips={["/api/admin/media", "upload", "list", "delete", "tags", "cdn/url"]}
    >
      <div style={{ fontWeight: 900 }}>Plan</div>
      <div style={{ marginTop: 8, opacity: 0.78, lineHeight: 1.4 }}>
        1) Upload • 2) Grid/list view • 3) Preview • 4) Copy URL • 5) Tagging • 6) Delete/restore
      </div>
    </AdminSectionSkeleton>
  );
}
