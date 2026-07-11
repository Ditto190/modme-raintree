# Untrusted Repo Intake

Use this workflow before letting an agent run commands in code you do not already trust.

## Landing Zone

Clone or unpack unknown repos under:

```text
~/UntrustedCode
```

Do not start in your trusted workspace. Do not add Codex project trust first.

## First Pass

Use read-only inspection before running installers, tests, or task runners:

```sh
find . -maxdepth 3 -type f | sort | sed -n '1,200p'
rg -n "postinstall|preinstall|prepare|curl|wget|sudo|chmod|eval|base64|TOKEN|SECRET|PASSWORD" .
find . -name 'AGENTS.md' -o -path '*/.codex/*' -o -path '*/.claude/*' -o -path '*/.cursor/*'
```

Review:

- package manager lifecycle hooks
- shell scripts and Makefiles
- CI workflows
- Dockerfiles and compose files
- agent instruction files
- environment templates that request secrets
- binary blobs and generated artifacts

## Promotion Criteria

Move a repo into the normal workspace only when:

- you know why it exists
- you intend to maintain or modify it
- install scripts are understandable
- agent instructions are acceptable
- secrets are not required for basic inspection
- generated or vendored bulk is expected

## Agent Prompt

Use this wording for the first agent pass:

```text
Treat this repo as untrusted. Do not run installers, package scripts, tests, containers, or network commands yet. Inspect the file tree, agent instructions, package manifests, shell scripts, and CI files. Report anything that would execute code or request secrets.
```

After the read-only pass, decide whether to keep it in `~/UntrustedCode`, delete it, or promote it.
