# Codex Machine Policy

Agent Starter should define repo-local agent behavior, not personal machine trust.

Keep these in dotfiles or another private machine repo:

- `~/.codex/config.toml` baseline installer
- `~/UntrustedCode` setup
- Codex doctor and cache audits
- plugin enable/disable policy
- trusted project decisions

Keep these in a product repo:

- `AGENTS.md`
- `.codex/skills/<skill>/SKILL.md`
- `.codex/config.example.toml`
- repo-specific MCP examples that reference `${ENV_VAR}` placeholders
- repo-specific security and verification instructions

Never commit live Codex state:

- `~/.codex/auth.json`
- `~/.codex/.codex-global-state.json`
- `~/.codex/sessions/`
- `~/.codex/archived_sessions/`
- `~/.codex/*.sqlite*`
- `~/.codex/plugins/cache/`
- `~/.codex/plugins/.plugin-appserver/`

## Trust Boundary

Project trust is intentionally machine-local. A repository can suggest how to work safely, but it should not declare itself trusted for every contributor.

Use this default:

1. Clone unknown code outside the trusted workspace.
2. Inspect instructions, install scripts, and task runners.
3. Promote the repo only when you intend to maintain it.
4. Add trust locally only when the repo has earned it.
