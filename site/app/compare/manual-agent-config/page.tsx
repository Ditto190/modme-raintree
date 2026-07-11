import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agent Starter vs manual agent config",
  description:
    "Compare Agent Starter with hand-maintained CLAUDE.md, AGENTS.md, Cursor rules, and MCP config files.",
  alternates: {
    canonical: siteConfig.comparePath,
  },
  openGraph: {
    title: "Agent Starter vs manual agent config",
    description:
      "Why one agent.json manifest beats copying separate Claude Code, Codex, Cursor, and MCP setup files by hand.",
    url: siteConfig.comparePath,
    siteName: siteConfig.name,
    type: "article",
  },
};

const manualCosts = [
  "Claude Code skills, Codex skills, AGENTS.md, Cursor .mdc rules, and MCP config drift independently.",
  "Every repo needs a new setup checklist, and every teammate has to interpret it the same way.",
  "Secrets and MCP environment variables are easy to document incorrectly or commit accidentally.",
  "There is no cheap way to ask whether the manifest and generated native files still match.",
];

const agentStarterBenefits = [
  "One agent.json declares profile, targets, skills, and MCP servers.",
  "sync writes each agent's native project files and preserves manual edits outside managed blocks.",
  "status diffs the manifest against generated config and exits non-zero on drift.",
  "Secrets stay as environment-variable references and are surfaced in .env.example.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Agent Starter vs manual agent config",
  description:
    "Compare Agent Starter with hand-maintained CLAUDE.md, AGENTS.md, Cursor rules, and MCP config files.",
  url: absoluteUrl(siteConfig.comparePath),
  author: {
    "@type": "Organization",
    name: siteConfig.organization.name,
    url: siteConfig.organization.url,
  },
  about: {
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    codeRepository: siteConfig.repoUrl,
    applicationCategory: "DeveloperApplication",
  },
};

function List({
  items,
  icon,
}: {
  items: string[];
  icon: "bad" | "good";
}) {
  const Icon = icon === "good" ? CheckCircle2 : XCircle;
  const tone = icon === "good" ? "text-emerald-500" : "text-red-500";

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ManualConfigComparisonPage() {
  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to agent-starter
        </Link>

        <section className="pt-12">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Comparison
          </p>
          <h1 className="mt-4 max-w-3xl font-mono text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Agent Starter vs copying agent config by hand.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Manual setup works for one repo and one assistant. It breaks when a
            team needs Claude Code, Codex, Cursor, and MCP servers to agree on
            the same project rules over time.
          </p>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2" aria-label="Comparison summary">
          <div className="rounded-md border border-border/60 bg-muted/20 p-5">
            <h2 className="font-mono text-lg font-semibold">Manual files</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fast to start, expensive to keep consistent.
            </p>
            <div className="mt-5">
              <List items={manualCosts} icon="bad" />
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 p-5">
            <h2 className="font-mono text-lg font-semibold">Agent Starter</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              One checked-in manifest, generated native files.
            </p>
            <div className="mt-5">
              <List items={agentStarterBenefits} icon="good" />
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-md border border-border/60 bg-muted/30 p-5">
          <h2 className="font-mono text-lg font-semibold">When to use it</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Use Agent Starter when the project config itself is part of the
            workflow: shared skills, MCP servers, cleanup rules, Apple HIG
            checks, or team onboarding. Stick with manual files for a quick
            single-agent experiment where sync and drift checks do not matter.
          </p>
          <div className="mt-6 overflow-x-auto rounded-md bg-background px-4 py-3 font-mono text-sm">
            <code>npx create-agent-starter@latest --agent all</code>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/#install"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Install Agent Starter
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            View source
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </main>
  );
}
