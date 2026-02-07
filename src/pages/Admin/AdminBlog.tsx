import React from "react";
import AdminSectionSkeleton from "./AdminSectionSkeleton";

export default function AdminBlog() {
  return (
    <AdminSectionSkeleton
      title="Blog"
      subtitle="Blog bölməsi üçün skeleton. Burada post list, draft/publish, editor və SEO sahələri olacaq."
      chips={["/api/admin/blog", "POST create", "PATCH update", "publish/unpublish", "search + filters"]}
    >
      <div style={{ fontWeight: 900 }}>Plan</div>
      <div style={{ marginTop: 8, opacity: 0.78, lineHeight: 1.4 }}>
        1) Post list + filter (status, lang, author) • 2) Editor (title, slug, content) • 3) SEO meta • 4) Publish flow
      </div>
    </AdminSectionSkeleton>
  );
}
