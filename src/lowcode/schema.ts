/**
 * schema.ts — Low-code / Visual Interface Hooks
 *
 * Lightweight TypeScript schema that maps visual IDE nodes (triggers, actions,
 * skills) to the declarative agent.json structure.  Serves as a conceptual
 * bridge for an IDE layout builder that lets non-engineers wire agent
 * behaviour without editing JSON directly.
 *
 * Design principles:
 *   • Every interface is a strict structural type — no `any`, no `unknown`
 *     escape hatches except where explicitly annotated as opaque payloads.
 *   • Node kinds use a discriminated union on `kind` so exhaustive switch
 *     statements are statically verified by the TypeScript compiler.
 *   • The schema is intentionally serialisable: no class instances, no
 *     circular references, no DOM types.
 */

// ── Primitives ────────────────────────────────────────────────────────────────

/** Kebab-case node identifier — mirrors agent.json skill ids. */
export type NodeId = string;

/** ISO-8601 datetime string. */
export type ISODateString = string;

/** Opaque key→value environment map (values may be ${VAR} references). */
export type EnvMap = Record<string, string>;

// ── Trigger nodes ─────────────────────────────────────────────────────────────

/** A trigger node fires when an external condition is met. */
export interface TriggerNode {
  readonly kind: 'trigger';
  readonly id: NodeId;
  readonly label: string;
  /**
   * What activates this trigger.
   *   file-change  — fs-watchdog MCP emits a change event
   *   schedule     — cron-style recurring activation
   *   message      — inbound orchestrator message matches a pattern
   *   manual       — user-initiated from the IDE
   */
  readonly triggerType: 'file-change' | 'schedule' | 'message' | 'manual';
  readonly config: TriggerConfig;
}

export type TriggerConfig =
  | FileChangeTriggerConfig
  | ScheduleTriggerConfig
  | MessageTriggerConfig
  | ManualTriggerConfig;

export interface FileChangeTriggerConfig {
  readonly type: 'file-change';
  /** Glob patterns watched by the fs-watchdog MCP. */
  readonly patterns: readonly string[];
  /** Debounce window in milliseconds before the trigger fires. */
  readonly debounceMs: number;
}

export interface ScheduleTriggerConfig {
  readonly type: 'schedule';
  /** POSIX cron expression, e.g. "0 9 * * 1-5". */
  readonly cron: string;
  /** IANA timezone identifier, e.g. "America/New_York". */
  readonly timezone: string;
}

export interface MessageTriggerConfig {
  readonly type: 'message';
  /** Regular expression applied to incoming message content. */
  readonly pattern: string;
  /** Agent id whose outbound messages are watched. */
  readonly sourceAgentId: string;
}

export interface ManualTriggerConfig {
  readonly type: 'manual';
  /** Human-readable description shown in the IDE trigger panel. */
  readonly description: string;
}

// ── Action nodes ──────────────────────────────────────────────────────────────

/**
 * An action node executes when it receives a flow signal from an upstream
 * trigger or another action.
 */
export interface ActionNode {
  readonly kind: 'action';
  readonly id: NodeId;
  readonly label: string;
  /**
   * What the action does.
   *   mcp-call     — invoke a named MCP server tool
   *   agent-route  — dispatch a message to an orchestrator agent
   *   transform    — apply a pure data transformation to the payload
   *   notify       — emit a human-readable notification
   */
  readonly actionType: 'mcp-call' | 'agent-route' | 'transform' | 'notify';
  readonly config: ActionConfig;
}

export type ActionConfig =
  | McpCallActionConfig
  | AgentRouteActionConfig
  | TransformActionConfig
  | NotifyActionConfig;

export interface McpCallActionConfig {
  readonly type: 'mcp-call';
  /** Must match a `name` declared in agent.json mcps array. */
  readonly mcpName: string;
  /** Tool name exposed by the MCP server. */
  readonly toolName: string;
  /** Arguments forwarded to the tool.  Values may be ${VAR} references. */
  readonly args: Record<string, string>;
  readonly env?: EnvMap;
}

export interface AgentRouteActionConfig {
  readonly type: 'agent-route';
  /** Orchestrator agent id to address the message to. */
  readonly recipientId: string;
  /** Message content template — supports ${PAYLOAD} interpolation. */
  readonly contentTemplate: string;
}

export interface TransformActionConfig {
  readonly type: 'transform';
  /**
   * Named transformation to apply.
   *   toon-encode  — compress output with TOON formatter
   *   toon-decode  — expand TOON-compressed input
   *   json-extract — extract a JSONPath value from the payload
   */
  readonly transform: 'toon-encode' | 'toon-decode' | 'json-extract';
  readonly params?: Record<string, string>;
}

export interface NotifyActionConfig {
  readonly type: 'notify';
  readonly channel: 'stderr' | 'stdout' | 'mcp-event';
  readonly messageTemplate: string;
  readonly severity: 'info' | 'warn' | 'error';
}

// ── Skill nodes ───────────────────────────────────────────────────────────────

/**
 * A skill node links a visual flow to a declarative agent.json skill.
 * Rendering the node shows the skill metadata; connecting it to actions
 * expresses which skills are invoked by which actions.
 */
export interface SkillNode {
  readonly kind: 'skill';
  readonly id: NodeId;
  /** Must match a skill id registered in src/profiles.js / agent.json skills. */
  readonly skillId: string;
  readonly label: string;
  /** Short description surfaced in the IDE node tooltip. */
  readonly description: string;
  /** Skill category mirrors the category field in profiles.js SKILLS array. */
  readonly category: 'quality' | 'design' | 'marketing' | 'utilities' | 'workflow';
}

// ── Flow edges ────────────────────────────────────────────────────────────────

/** Directed edge connecting two nodes in the visual flow graph. */
export interface FlowEdge {
  readonly id: string;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  /**
   * Condition that must evaluate to true for the edge to carry the signal.
   * Absence means the edge is unconditional.
   */
  readonly condition?: EdgeCondition;
}

export interface EdgeCondition {
  /**
   * Simple expression language:
   *   exists   — upstream payload key exists
   *   equals   — upstream payload key equals a literal value
   *   matches  — upstream payload key matches a regex pattern
   */
  readonly operator: 'exists' | 'equals' | 'matches';
  readonly key: string;
  readonly value?: string;
}

// ── Top-level graph ───────────────────────────────────────────────────────────

/** Union of all visual node types for exhaustive type-narrowing. */
export type FlowNode = TriggerNode | ActionNode | SkillNode;

/**
 * Complete visual flow graph.  Serialised as JSON and stored alongside
 * agent.json so the IDE layout builder can reconstruct the diagram from
 * the declarative config without loss of information.
 */
export interface AgentFlowGraph {
  readonly version: 1;
  readonly id: string;
  readonly label: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

// ── agent.json bridge ─────────────────────────────────────────────────────────

/**
 * Projection of the agent.json manifest fields that the visual schema
 * references.  Intentionally a subset — the full manifest shape lives in
 * src/manifest.js.
 */
export interface AgentJsonBridge {
  readonly version: 1;
  /** Resolves to profiles defined in src/profiles.js. */
  readonly profile?: string;
  readonly targets: readonly ('claude' | 'codex' | 'cursor')[];
  readonly skills: readonly string[];
  readonly mcps: readonly AgentJsonMcpEntry[];
}

export interface AgentJsonMcpEntry {
  readonly name: string;
  readonly command?: string;
  readonly url?: string;
  readonly args?: readonly string[];
  readonly env?: EnvMap;
  readonly headers?: Record<string, string>;
}

// ── Utility: extract references from a graph ─────────────────────────────────

/**
 * Walk the graph and return all skill ids referenced by SkillNodes.
 * Useful for validating that a flow graph's skills are all declared in
 * agent.json before the IDE persists the file.
 */
export function extractSkillIds(graph: AgentFlowGraph): readonly string[] {
  return graph.nodes
    .filter((n): n is SkillNode => n.kind === 'skill')
    .map((n) => n.skillId);
}

/**
 * Walk the graph and return all MCP names referenced by McpCallAction nodes.
 * Useful for cross-validating agent.json mcps against the flow graph.
 */
export function extractMcpNames(graph: AgentFlowGraph): readonly string[] {
  const names: string[] = [];
  for (const node of graph.nodes) {
    if (node.kind === 'action' && node.config.type === 'mcp-call') {
      names.push(node.config.mcpName);
    }
  }
  return [...new Set(names)];
}

/**
 * Assert that every skill and MCP referenced in the graph appears in the
 * provided agent.json bridge.
 *
 * Throws a {@link GraphValidationError} if any references are unresolvable.
 */
export function validateGraphReferences(
  graph: AgentFlowGraph,
  manifest: AgentJsonBridge,
): void {
  const skillSet = new Set(manifest.skills);
  const mcpSet = new Set(manifest.mcps.map((m) => m.name));

  const missingSkills = extractSkillIds(graph).filter((id) => !skillSet.has(id));
  const missingMcps = extractMcpNames(graph).filter((name) => !mcpSet.has(name));

  const errors: string[] = [];
  if (missingSkills.length > 0) {
    errors.push(`Unresolved skill ids: ${missingSkills.join(', ')}`);
  }
  if (missingMcps.length > 0) {
    errors.push(`Unresolved MCP names: ${missingMcps.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new GraphValidationError(errors.join('\n'));
  }
}

/** Thrown by {@link validateGraphReferences} when the graph has dangling refs. */
export class GraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphValidationError';
  }
}
