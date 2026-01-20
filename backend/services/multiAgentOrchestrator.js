/**
 * Multi-Agent Orchestrator
 * - Planner -> (optional) RAG -> Specialist Draft -> Verifier -> Finalizer
 *
 * This is intentionally framework-free (no LangChain/CrewAI) but still runs
 * multiple role-specialized LLM calls to reduce hallucination and improve accuracy.
 */

const { processRouting, AgentType, getAgentPrompt } = require('./agentRouter');
const { performRAG } = require('./ragService');
const { chatCompletion, extractFirstJsonObject } = require('./llmClient');

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && h.role && h.content && ['user', 'assistant'].includes(h.role))
    .slice(-10)
    .map((h) => ({
      role: h.role,
      content: String(h.content).slice(0, 4000)
    }));
}

function buildKbContext(ragContext, ragSources, extraContext) {
  const hasRag = Boolean(ragContext && String(ragContext).trim());
  const hasExtra = Boolean(extraContext && String(extraContext).trim());
  if (!hasRag && !hasExtra) return '';

  const sourceLines = (ragSources || [])
    .slice(0, 5)
    .map((s, idx) => {
      const label = `KB${idx + 1}`;
      const title = s.question || s.title || s.id || `source_${idx + 1}`;
      return `${label}: ${title}`;
    })
    .join('\n');

  const blocks = [];

  if (hasRag) {
    blocks.push(`## Knowledge Base Context

下面是从校园知识库检索到的参考资料（请优先使用并在回答中引用 [KB1]/[KB2]...）：

${ragContext}

可用引用标签：
${sourceLines}`.trim());
  }

  if (hasExtra) {
    blocks.push(`## Web Context

下面是联网搜索到的补充背景信息（可能不完全可靠；涉及校园具体规定仍以学校官方为准）：

${String(extraContext).slice(0, 6000)}

可用引用标签：
WEB1`.trim());
  }

  return blocks.join('\n\n');
}

async function planWithPlannerAgent(message, history, baseRouting, trace) {
  const plannerSystem = `You are "PlannerAgent".
You route the user's request to the best specialist agent and decide whether retrieval is needed.

Return ONLY valid JSON:
{
  "agent": "knowledge" | "tutor" | "general",
  "needsRAG": boolean,
  "confidence": number,
  "plan": string[],
  "notes": string
}

Rules:
- agent="knowledge" for campus policy/process/location/schedule questions.
- agent="tutor" for practice, interview, evaluation, role-play training.
- agent="general" for chit-chat or non-campus topics.
- needsRAG should be true only when agent="knowledge" and the answer depends on campus-specific facts.
- confidence is 0..1.`;

  const plannerUser = `User message:
${message}

Recent conversation:
${normalizeHistory(history)
  .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
  .join('\n') || '(none)'}

Heuristic routing suggestion:
${JSON.stringify(baseRouting)}`;

  const resp = await chatCompletion(
    [
      { role: 'system', content: plannerSystem },
      { role: 'user', content: plannerUser }
    ],
    { temperature: 0.1, maxTokens: 500 }
  );

  if (trace) trace({ step: 'planner', content: resp.content });

  const json = extractFirstJsonObject(resp.content);
  if (!json || !json.agent) return null;

  const agent = [AgentType.KNOWLEDGE, AgentType.TUTOR, AgentType.GENERAL].includes(json.agent)
    ? json.agent
    : null;
  if (!agent) return null;

  return {
    agent,
    needsRAG: Boolean(json.needsRAG),
    confidence: typeof json.confidence === 'number' ? json.confidence : baseRouting.confidence,
    plan: Array.isArray(json.plan) ? json.plan.map(String).slice(0, 8) : [],
    notes: json.notes ? String(json.notes).slice(0, 500) : ''
  };
}

async function draftWithSpecialistAgent(agentType, message, history, kbContext, trace) {
  const specialistSystemBase = getAgentPrompt(agentType);

  const specialistSystem = `${specialistSystemBase}

你现在处于多 Agent 协作系统的 "SpecialistAgent" 阶段。

硬性要求：
1) 若使用了知识库上下文，请用 [KB1]/[KB2]/... 为关键事实做引用。
2) 不要编造校园具体规定、流程、地点、时间；没有依据就说不确定，并给出官方确认渠道建议。
3) 输出为中文，结构清晰，优先使用步骤/要点列表。`.trim();

  const userPrompt = [
    kbContext ? kbContext : '',
    `## User Question\n${message}`
  ]
    .filter(Boolean)
    .join('\n\n');

  const resp = await chatCompletion(
    [
      { role: 'system', content: specialistSystem },
      ...normalizeHistory(history),
      { role: 'user', content: userPrompt }
    ],
    { temperature: 0.2, maxTokens: 1200 }
  );

  if (trace) trace({ step: 'draft', content: resp.content });
  return resp.content;
}

async function verifyWithVerifierAgent(draft, kbContext, trace) {
  const verifierSystem = `You are "VerifierAgent".
You check the draft answer for hallucination and unsupported campus-specific claims.

Return ONLY valid JSON:
{
  "verdict": "pass" | "revise",
  "issues": string[],
  "missing_citations": string[],
  "rewrite_guidance": string
}

Rules:
- If a statement depends on campus-specific facts but is not supported by KB context, verdict must be "revise".
- If KB context exists and the draft contains key claims without [KB*] citations, list them in missing_citations.
- Keep rewrite_guidance short and actionable.`;

  const verifierUser = `## Knowledge Base Context
${kbContext || '(none)'}

## Draft Answer
${draft}`;

  const resp = await chatCompletion(
    [
      { role: 'system', content: verifierSystem },
      { role: 'user', content: verifierUser }
    ],
    { temperature: 0.0, maxTokens: 600 }
  );

  if (trace) trace({ step: 'verifier', content: resp.content });

  const json = extractFirstJsonObject(resp.content);
  if (!json || !json.verdict) {
    return {
      verdict: 'revise',
      issues: ['Verifier output is not valid JSON'],
      missing_citations: [],
      rewrite_guidance: '请减少不确定的校园细节，补齐引用标签 [KB1]/[KB2]，并明确不确定项需要官方确认。'
    };
  }

  return {
    verdict: json.verdict === 'pass' ? 'pass' : 'revise',
    issues: Array.isArray(json.issues) ? json.issues.map(String).slice(0, 10) : [],
    missing_citations: Array.isArray(json.missing_citations)
      ? json.missing_citations.map(String).slice(0, 10)
      : [],
    rewrite_guidance: json.rewrite_guidance ? String(json.rewrite_guidance).slice(0, 800) : ''
  };
}

async function finalizeWithFinalizerAgent(agentType, message, draft, verification, kbContext, trace) {
  const finalizerSystem = `你是 "FinalizerAgent"。
你把 Specialist 草稿 + Verifier 反馈整合为最终回答。

强制规则：
1) 不要输出任何 JSON；直接输出最终中文回答。
2) 对校园具体事实：有 KB 就引用 [KB1]/[KB2]；没有 KB 或不支持就明确不确定并给出官方确认渠道。
3) 若 Verifier 判定需要修改，必须遵循 rewrite_guidance 修正草稿。
4) 结尾追加一个简短的“参考资料”小节，仅列出你在正文引用过的 [KB*] 标签对应的标题。`.trim();

  const verifierBlock = `## Verifier Verdict
${verification.verdict}

## Issues
${(verification.issues || []).join('\n') || '(none)'}

## Missing citations
${(verification.missing_citations || []).join('\n') || '(none)'}

## Rewrite guidance
${verification.rewrite_guidance || '(none)'}`.trim();

  const userPrompt = [
    kbContext ? kbContext : '',
    `## User Question\n${message}`,
    `## Draft Answer\n${draft}`,
    verifierBlock
  ]
    .filter(Boolean)
    .join('\n\n');

  const resp = await chatCompletion(
    [
      { role: 'system', content: finalizerSystem },
      { role: 'user', content: userPrompt }
    ],
    { temperature: 0.2, maxTokens: 1400 }
  );

  if (trace) trace({ step: 'final', content: resp.content });
  return resp.content;
}

async function runMultiAgent(message, history, options = {}) {
  const trace = typeof options.trace === 'function' ? options.trace : null;
  const extraContext = options.extraContext || '';

  const baseRouting = processRouting(message, history);
  const plannerRouting = await planWithPlannerAgent(message, history, baseRouting, trace);

  const routing = plannerRouting
    ? {
        agent: plannerRouting.agent,
        needsRAG: plannerRouting.needsRAG,
        confidence: plannerRouting.confidence,
        reason: plannerRouting.notes || 'PlannerAgent routing'
      }
    : baseRouting;

  let ragContext = '';
  let ragSources = [];

  if (routing.needsRAG) {
    const ragResult = await performRAG(message);
    if (ragResult.usedRAG) {
      ragContext = ragResult.context || '';
      ragSources = ragResult.sources || [];
    }
    if (trace) {
      trace({
        step: 'rag',
        content: ragResult.usedRAG
          ? `RAG used. sources=${ragSources.length}`
          : `RAG skipped or no hits. usedRAG=${ragResult.usedRAG}`
      });
    }
  }

  const kbContext = buildKbContext(ragContext, ragSources, extraContext);

  const draft = await draftWithSpecialistAgent(routing.agent, message, history, kbContext, trace);
  const verification = await verifyWithVerifierAgent(draft, kbContext, trace);
  const finalText = await finalizeWithFinalizerAgent(
    routing.agent,
    message,
    draft,
    verification,
    kbContext,
    trace
  );

  return {
    routing,
    sources: ragSources,
    finalText
  };
}

module.exports = {
  runMultiAgent
};
