import React from "react";
import { Link, useParams } from "react-router-dom";
import type { Lang } from "../../i18n/lang";

export default function ResourcesGuides() {
  const { lang } = useParams<{ lang: Lang }>();
  return (
    <main className="pageShell">
      <section className="pageHero">
        <h1>Guides</h1>
        <p>Praktik bələdçilər: use-cases, setup, best practices.</p>
        <div className="pageActions">
          <Link className="btn" to={`/${lang}/contact`}>Contact</Link>
          <Link className="btn btnGhost" to={`/${lang}/resources/faq`}>FAQ</Link>
        </div>
      </section>
    </main>
  );
}
