import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agent Starter launch assets",
  description:
    "Submission-ready copy, tags, install commands, and reviewer facts for launching Agent Starter on developer communities and directories.",
  alternates: {
    canonical: siteConfig.launchPath,
  },
  openGraph: {
    title: "Agent Starter launch assets",
    description:
      "Submission-ready copy and reviewer facts for Agent Starter: one manifest for Claude Code, Codex, Cursor, and MCP setup.",
    url: siteConfig.launchPath,
    siteName: siteConfig.name,
    type: "website",
  },
};

const facts = [
  ["Repository", siteConfig.repoUrl],
  ["npm package", siteConfig.npmUrl],
  ["Install", "npx create-agent-starter@latest --agent all"],
  ["Targets", "Claude Code, Codex, Cursor"],
  ["Core file", "agent.json"],
  ["License", "MIT"],
];

const submissionCopy = [
  {
    label: "Tagline",
    copy: "One manifest for Claude Code, Codex, and Cursor setup.",
  },
  {
    label: "50-word description",
    copy:
      "Agent Starter is an open-source multi-agent project starter and config manager. It installs project-local skills, AGENTS.md, Codex skills, Cursor rules, Claude Code skills, MCP config, and repeatable workflows from one shared manifest, so teams can standardize AI coding assistants without hand-copying brittle setup files across every repo.",
  },
  {
    label: "Show HN title",
    copy: "Show HN: Agent Starter - one manifest for Claude Code, Codex, and Cursor",
  },
  {
    label: "DevHunt pitch",
    copy:
      "Agent Starter is a project-local config manager for AI coding assistants. It uses one shared manifest to generate Claude Code skills, Codex guidance and skills, Cursor rules, and MCP configuration.",
  },
];

const tags = [
  "developer-tools",
  "ai-agents",
  "claude-code",
  "codex",
  "cursor-rules",
  "mcp",
  "cli",
  "open-source",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Agent Starter launch assets",
  url: absoluteUrl(siteConfig.launchPath),
  description:
    "Submission-ready copy, tags, install commands, and reviewer facts for launching Agent Starter on developer communities and directories.",
  about: {
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    codeRepository: siteConfig.repoUrl,
    applicationCategory: "DeveloperApplication",
  },
};

export default function LaunchPage() {
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
            Launch assets
          </p>
          <h1 className="mt-4 max-w-3xl font-mono text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Copy, tags, and facts for developer-tool submissions.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            This page gives reviewers, directory moderators, and community
            submitters the concise version of what Agent Starter is, how to
            install it, and why it belongs in agent-tooling lists.
          </p>
        </section>

        <section className="mt-12 grid gap-5 sm:grid-cols-2" aria-labelledby="facts-heading">
          <h2 id="facts-heading" className="sr-only">
            Launch facts
          </h2>
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border/60 bg-muted/20 p-4">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </div>
              <div className="mt-2 break-words font-mono text-sm">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-12 space-y-5" aria-labelledby="copy-heading">
          <h2 id="copy-heading" className="font-mono text-2xl font-semibold">
            Reusable copy
          </h2>
          {submissionCopy.map((item) => (
            <div key={item.label} className="rounded-md border border-border/60 bg-muted/20 p-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="mt-12" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="font-mono text-2xl font-semibold">
            Suggested tags
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href={siteConfig.npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            npm package
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            GitHub repo
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </main>
  );
}
