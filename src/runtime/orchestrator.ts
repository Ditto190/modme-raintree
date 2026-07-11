/**
 * orchestrator.ts
 *
 * Baseline bootstrap demonstrating how a local agent hooks into an AG2 /
 * AutoGen multi-agent orchestrator.  The file is intentionally framework-
 * agnostic at the type level: concrete AG2 / CopilotKit client packages are
 * imported as dynamic peers so this file compiles without them installed.
 *
 * Usage:
 *   npx ts-node src/runtime/orchestrator.ts
 *   (or: tsx src/runtime/orchestrator.ts)
 */

import { randomUUID } from 'node:crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Discriminated union covering every message direction the bus carries. */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** A single message exchanged between agents on the bus. */
export interface AgentMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/** Minimal capability declaration every registered agent must expose. */
export interface AgentCapability {
  readonly id: string;
  readonly description: string;
  /** Skill IDs from agent.json that back this capability. */
  readonly skills: readonly string[];
}

/**
 * Contract every concrete agent must fulfil.
 * Programmatic agents (e.g. AG2 ConversableAgent wrappers) and declarative
 * skill-JSON agents both implement this interface.
 */
export interface Agent {
  readonly id: string;
  readonly capabilities: readonly AgentCapability[];
  /**
   * Receive a message and return zero or more reply messages.
   * Returning an empty array signals the agent has no response for this turn.
   */
  receive(message: AgentMessage): Promise<readonly AgentMessage[]>;
}

/** Snapshot of in-flight orchestration state. */
export interface OrchestrationContext {
  readonly sessionId: string;
  readonly agents: ReadonlyMap<string, Agent>;
  readonly history: readonly AgentMessage[];
}

/** Configuration accepted by {@link Orchestrator}. */
export interface OrchestratorConfig {
  /** Maximum round-trips before the loop is forcibly terminated. */
  readonly maxRounds: number;
  /**
   * Wall-clock milliseconds a single agent.receive() call may take before the
   * orchestrator treats it as a timeout.  Defaults to the env var
   * MCP_RUNTIME_TIMEOUT (parsed as ms) or 30 000 ms.
   */
  readonly agentTimeoutMs: number;
  /** Whether to emit structured JSON lines to stdout for external consumers. */
  readonly jsonLog: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveTimeout(): number {
  const raw = process.env['MCP_RUNTIME_TIMEOUT'];
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 30_000;
}

function makeId(): string {
  return randomUUID();
}

function buildMessage(
  role: MessageRole,
  content: string,
  senderId: string,
  recipientId: string,
  metadata?: Record<string, unknown>,
): AgentMessage {
  return {
    id: makeId(),
    role,
    content,
    senderId,
    recipientId,
    timestamp: Date.now(),
    metadata,
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Lightweight multi-agent message bus.
 *
 * Dispatch flow:
 *   1. Caller enqueues a seed message via `dispatch`.
 *   2. The bus delivers it to the addressed agent.
 *   3. Replies from that agent are enqueued and the loop repeats until the
 *      queue drains, an agent returns no replies, or `maxRounds` is reached.
 */
export class Orchestrator {
  private readonly agents = new Map<string, Agent>();
  private readonly config: OrchestratorConfig;
  private history: AgentMessage[] = [];

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxRounds: config?.maxRounds ?? 10,
      agentTimeoutMs: config?.agentTimeoutMs ?? resolveTimeout(),
      jsonLog: config?.jsonLog ?? false,
    };
  }

  /** Register an agent with the bus.  Duplicate ids replace the prior entry. */
  register(agent: Agent): this {
    this.agents.set(agent.id, agent);
    return this;
  }

  /** Current read-only snapshot of the orchestration context. */
  get context(): OrchestrationContext {
    return {
      sessionId: this.sessionId,
      agents: this.agents,
      history: this.history,
    };
  }

  private readonly sessionId = makeId();

  /**
   * Dispatch a seed message and run the orchestration loop.
   * Returns the full message history once the loop terminates.
   */
  async dispatch(
    content: string,
    senderId: string,
    recipientId: string,
  ): Promise<readonly AgentMessage[]> {
    const seed = buildMessage('user', content, senderId, recipientId);
    const queue: AgentMessage[] = [seed];

    let rounds = 0;

    while (queue.length > 0 && rounds < this.config.maxRounds) {
      const message = queue.shift()!;
      this.history.push(message);
      this.log(message);

      const target = this.agents.get(message.recipientId);
      if (!target) {
        this.warn(`No agent registered for id "${message.recipientId}" — message dropped.`);
        continue;
      }

      const replies = await this.callWithTimeout(target, message);

      for (const reply of replies) {
        this.history.push(reply);
        this.log(reply);
        // Only re-enqueue if there is a registered recipient — prevents loops
        // caused by agents sending to unknown peers.
        if (this.agents.has(reply.recipientId)) {
          queue.push(reply);
        }
      }

      rounds += 1;
    }

    return this.history;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async callWithTimeout(
    agent: Agent,
    message: AgentMessage,
  ): Promise<readonly AgentMessage[]> {
    return new Promise<readonly AgentMessage[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Agent "${agent.id}" timed out after ${this.config.agentTimeoutMs} ms`));
      }, this.config.agentTimeoutMs);

      agent.receive(message).then(
        (replies) => {
          clearTimeout(timer);
          resolve(replies);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  private log(message: AgentMessage): void {
    if (this.config.jsonLog) {
      process.stdout.write(`${JSON.stringify(message)}\n`);
    }
  }

  private warn(text: string): void {
    process.stderr.write(`[orchestrator] WARN: ${text}\n`);
  }
}

// ── Example stub agents ───────────────────────────────────────────────────────

/**
 * ProgrammaticAgent — represents an AG2 / AutoGen ConversableAgent that
 * runs Python-side logic via the py-executor MCP.
 *
 * In a real integration, `receive` would call the MCP tool and return the
 * structured response.  This stub demonstrates the wiring shape.
 */
export class ProgrammaticAgent implements Agent {
  readonly id: string;
  readonly capabilities: readonly AgentCapability[];

  constructor(id: string, capabilities: AgentCapability[]) {
    this.id = id;
    this.capabilities = capabilities;
  }

  async receive(message: AgentMessage): Promise<readonly AgentMessage[]> {
    // Stub: echo back a structured acknowledgement so integration tests can
    // assert round-trip mechanics without a live MCP connection.
    const reply = buildMessage(
      'assistant',
      `[${this.id}] ACK: ${message.content}`,
      this.id,
      message.senderId,
      { originalId: message.id },
    );
    return [reply];
  }
}

/**
 * SkillAgent — wraps a declarative agent.json skill environment.
 *
 * Skill execution is delegated to the agent-starter sync output; this class
 * provides a typed handle for the orchestrator to address and route messages.
 */
export class SkillAgent implements Agent {
  readonly id: string;
  readonly capabilities: readonly AgentCapability[];

  constructor(id: string, skillIds: string[]) {
    this.id = id;
    this.capabilities = skillIds.map((skillId) => ({
      id: skillId,
      description: `Declarative skill: ${skillId}`,
      skills: [skillId],
    }));
  }

  async receive(message: AgentMessage): Promise<readonly AgentMessage[]> {
    // Stub: skill agents parse the content and respond indicating which skill
    // would handle it.  Real implementation would invoke the skill via the MCP.
    const matched = this.capabilities.find((cap) =>
      message.content.toLowerCase().includes(cap.id),
    );
    if (!matched) {
      return [];
    }
    const reply = buildMessage(
      'assistant',
      `[${this.id}] Invoking skill "${matched.id}" for: ${message.content}`,
      this.id,
      message.senderId,
      { skillId: matched.id, originalId: message.id },
    );
    return [reply];
  }
}

// ── Bootstrap entry-point ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const orchestrator = new Orchestrator({ jsonLog: true });

  const programmatic = new ProgrammaticAgent('ag2-assistant', [
    {
      id: 'code-exec',
      description: 'Executes Python via py-executor MCP',
      skills: ['cleanup-all', 'cleanup-types'],
    },
  ]);

  const declarative = new SkillAgent('skill-agent', [
    'cleanup-all',
    'cleanup-types',
    'toon-formatter',
  ]);

  orchestrator.register(programmatic).register(declarative);

  const history = await orchestrator.dispatch(
    'Run cleanup-all on the current workspace',
    'user',
    'ag2-assistant',
  );

  process.stderr.write(`[orchestrator] Session complete. ${history.length} messages exchanged.\n`);
}

// Only auto-run when this file is executed directly, not when imported.
if (
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  new URL(import.meta.url).pathname === process.argv[1]
) {
  main().catch((err: unknown) => {
    process.stderr.write(`[orchestrator] Fatal: ${String(err)}\n`);
    process.exit(1);
  });
}
