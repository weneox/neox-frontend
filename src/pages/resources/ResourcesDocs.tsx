import React from "react";
import { Link, useParams } from "react-router-dom";
import type { Lang } from "../../i18n/lang";

export default function ResourcesDocs() {
  const { lang } = useParams<{ lang: Lang }>();
  return (
    <main className="pageShell">
      <section className="pageHero">
        <h1>Docs</h1>
        <p>NEOX sənədlər: quraşdırma, inteqrasiya, istifadə.</p>
        <div className="pageActions">
          <Link className="btn" to={`/${lang}/contact`}>Contact</Link>
          <Link className="btn btnGhost" to={`/${lang}/resources/guides`}>Guides</Link>
        </div>
      </section>
    </main>
  );
}
