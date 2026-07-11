/**
 * integration.test.ts
 *
 * Abstract integration testing harness that validates message-passing
 * mechanics between a ProgrammaticAgent (AG2/AutoGen-backed) and a
 * SkillAgent (declarative agent.json skill environment).
 *
 * Run with: npx ts-node --test src/testing/integration.test.ts
 *           or: tsx --test src/testing/integration.test.ts
 *
 * The harness is framework-agnostic: it imports only the orchestrator stubs
 * defined in src/runtime/orchestrator.ts and uses Node's built-in test runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type AgentMessage,
  type AgentCapability,
  type Agent,
  Orchestrator,
  ProgrammaticAgent,
  SkillAgent,
} from '../runtime/orchestrator.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal orchestrator pre-loaded with both stub agent types. */
function buildTestOrchestrator(): {
  orchestrator: Orchestrator;
  programmatic: ProgrammaticAgent;
  declarative: SkillAgent;
} {
  const programmatic = new ProgrammaticAgent('ag2-assistant', [
    {
      id: 'code-exec',
      description: 'AG2 Python executor',
      skills: ['cleanup-all', 'cleanup-types'],
    },
  ]);

  const declarative = new SkillAgent('skill-agent', [
    'cleanup-all',
    'cleanup-types',
    'toon-formatter',
  ]);

  const orchestrator = new Orchestrator({
    maxRounds: 5,
    agentTimeoutMs: 5_000,
    jsonLog: false,
  });

  orchestrator.register(programmatic).register(declarative);

  return { orchestrator, programmatic, declarative };
}

// ── Agent shape tests ─────────────────────────────────────────────────────────

test('ProgrammaticAgent exposes a well-typed capability list', () => {
  const caps: AgentCapability[] = [
    { id: 'cap-a', description: 'Test capability', skills: ['cleanup-all'] },
  ];
  const agent: Agent = new ProgrammaticAgent('test-prog', caps);

  assert.equal(agent.id, 'test-prog');
  assert.equal(agent.capabilities.length, 1);
  assert.equal(agent.capabilities[0]!.id, 'cap-a');
  assert.deepEqual(agent.capabilities[0]!.skills, ['cleanup-all']);
});

test('SkillAgent derives capabilities from skill ids', () => {
  const agent: Agent = new SkillAgent('test-skill', ['toon-formatter', 'cleanup-types']);

  assert.equal(agent.id, 'test-skill');
  assert.equal(agent.capabilities.length, 2);
  const ids = agent.capabilities.map((c) => c.id);
  assert.ok(ids.includes('toon-formatter'));
  assert.ok(ids.includes('cleanup-types'));
});

// ── Message-passing mechanics ─────────────────────────────────────────────────

test('ProgrammaticAgent echoes an ACK message to the sender', async () => {
  const agent = new ProgrammaticAgent('prog', [
    { id: 'cap', description: 'cap', skills: ['cleanup-all'] },
  ]);

  const inbound: AgentMessage = {
    id: 'msg-001',
    role: 'user',
    content: 'Hello from user',
    senderId: 'user',
    recipientId: 'prog',
    timestamp: Date.now(),
  };

  const replies = await agent.receive(inbound);

  assert.equal(replies.length, 1);
  assert.equal(replies[0]!.senderId, 'prog');
  assert.equal(replies[0]!.recipientId, 'user');
  assert.ok(replies[0]!.content.includes('ACK'));
  assert.equal(replies[0]!.role, 'assistant');
});

test('SkillAgent returns a reply when content matches a skill id', async () => {
  const agent = new SkillAgent('skl', ['toon-formatter']);

  const inbound: AgentMessage = {
    id: 'msg-002',
    role: 'user',
    content: 'Please run toon-formatter on this file',
    senderId: 'user',
    recipientId: 'skl',
    timestamp: Date.now(),
  };

  const replies = await agent.receive(inbound);

  assert.equal(replies.length, 1);
  assert.ok(replies[0]!.content.includes('toon-formatter'));
  assert.equal(replies[0]!.metadata?.['skillId'], 'toon-formatter');
});

test('SkillAgent returns no reply when no skill matches', async () => {
  const agent = new SkillAgent('skl', ['cleanup-all']);

  const inbound: AgentMessage = {
    id: 'msg-003',
    role: 'user',
    content: 'An unrelated request that matches nothing',
    senderId: 'user',
    recipientId: 'skl',
    timestamp: Date.now(),
  };

  const replies = await agent.receive(inbound);
  assert.equal(replies.length, 0);
});

// ── Orchestrator round-trip tests ─────────────────────────────────────────────

test('Orchestrator routes a seed message and records a full history', async () => {
  const { orchestrator } = buildTestOrchestrator();

  const history = await orchestrator.dispatch(
    'Run cleanup-all on the workspace',
    'user',
    'ag2-assistant',
  );

  assert.ok(history.length >= 2, 'At least seed + one reply recorded');

  const seedMsg = history[0]!;
  assert.equal(seedMsg.senderId, 'user');
  assert.equal(seedMsg.recipientId, 'ag2-assistant');

  const replyMsg = history[1]!;
  assert.equal(replyMsg.senderId, 'ag2-assistant');
  assert.equal(replyMsg.role, 'assistant');
});

test('Orchestrator respects maxRounds termination', async () => {
  /**
   * Install a looping agent that always replies to itself via the other agent.
   * maxRounds: 3 ensures the loop terminates without hanging the test suite.
   */
  const loopOrchestrator = new Orchestrator({
    maxRounds: 3,
    agentTimeoutMs: 5_000,
    jsonLog: false,
  });

  const pingPong: Agent = {
    id: 'ping',
    capabilities: [],
    async receive(message: AgentMessage): Promise<readonly AgentMessage[]> {
      return [
        {
          id: `reply-${message.id}`,
          role: 'assistant',
          content: 'pong',
          senderId: 'ping',
          recipientId: 'ping', // replies to itself — intentional loop
          timestamp: Date.now(),
        },
      ];
    },
  };

  loopOrchestrator.register(pingPong);

  const history = await loopOrchestrator.dispatch('ping', 'user', 'ping');

  // maxRounds=3 → seed + 3 processed rounds max, so history length ≤ 4
  assert.ok(history.length <= 4, `Expected ≤4 messages, got ${history.length}`);
});

test('Orchestrator drops messages addressed to unregistered agents without throwing', async () => {
  const { orchestrator } = buildTestOrchestrator();

  await assert.doesNotReject(
    orchestrator.dispatch('Hello unknown', 'user', 'does-not-exist'),
  );
});

// ── Cross-agent message flow (programmatic ↔ declarative) ────────────────────

test('Two-agent round-trip: programmatic agent forwards to skill agent', async () => {
  /**
   * Wiring:
   *   user → coordinator (ProgrammaticAgent)
   *   coordinator → skill-runner (SkillAgent)
   */
  const coordinator = new ProgrammaticAgent('coordinator', [
    { id: 'delegate', description: 'Delegates to skill runner', skills: ['cleanup-all'] },
  ]);

  // Override receive so coordinator explicitly routes to skill-runner.
  const originalReceive = coordinator.receive.bind(coordinator);
  (coordinator as { receive: Agent['receive'] }).receive = async (
    msg: AgentMessage,
  ): Promise<readonly AgentMessage[]> => {
    const acks = await originalReceive(msg);
    const forward: AgentMessage = {
      id: `fwd-${msg.id}`,
      role: 'assistant',
      content: `cleanup-all forwarded by coordinator: ${msg.content}`,
      senderId: 'coordinator',
      recipientId: 'skill-runner',
      timestamp: Date.now(),
    };
    return [...acks, forward];
  };

  const skillRunner = new SkillAgent('skill-runner', [
    'cleanup-all',
    'cleanup-types',
  ]);

  const orch = new Orchestrator({ maxRounds: 5, agentTimeoutMs: 5_000, jsonLog: false });
  orch.register(coordinator).register(skillRunner);

  const history = await orch.dispatch(
    'Run cleanup-all across the project',
    'user',
    'coordinator',
  );

  const skillMsg = history.find(
    (m) => m.senderId === 'skill-runner' && m.role === 'assistant',
  );
  assert.ok(skillMsg !== undefined, 'SkillAgent should have replied');
  assert.ok(
    skillMsg.content.includes('cleanup-all'),
    'SkillAgent reply should name the matched skill',
  );
});
