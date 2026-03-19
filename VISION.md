# FogUI Vision Notes (Conversation Log)

Date: 2026-03-18

## 1) Founder Context and Strategic Direction

You explained the evolution of FogUI vision in three phases:

1. Original vision: make chatbot and RAG experiences more productive by rendering UI in chat instead of plain text.
2. Mid phase: emphasize compatibility with existing company design systems so teams can adopt FogUI in production environments.
3. Recent phase: move toward agent UI and shadcn-oriented support due to ecosystem momentum and practical implementation speed.

You also raised concern that the recent direction might be weaker than the original high-conviction thesis.

## 2) Core Strategic Questions You Asked

You asked:

1. If FogUI already supports customer components through adapters, are we already supporting design systems in practice?
2. If we pivot from chatbot/RAG UI to agent UI, do we really need deeper design-system support (contracted props/events and design-system fidelity)?
3. What are the pros and cons of requiring deeper support?
4. Is there real demand in open source for this level of support, especially among frontend developers?
5. Which layer should FogUI own if compared to ecosystem players like CopilotKit/AG-UI/A2UI/OpenUI/json-render?

## 3) Response: Adapter Support Is Real, But It Is Level 1

Answer given:

FogUI already supports design systems at a meaningful level through adapters. That is valid and important. However, that support is only the first maturity layer.

### Practical maturity model

1. Level 1: Component mapping
	- Map generated component intent to existing components.
	- FogUI already does this.

2. Level 2: Contracted props and events
	- Stable prop schemas, action semantics, event contracts, deterministic fallback behavior.
	- This is where reliability and trust begin.

3. Level 3: Design-system fidelity
	- Variant and token semantics, typography roles, spacing conventions, interaction states.
	- This is where generated UI feels truly native in enterprise products.

## 4) Do We Need Level 2 and Level 3 If We Pivot to Agent UI?

Short answer from the discussion:

1. Level 2 is necessary for both chatbot and agent use cases.
2. Level 3 is not mandatory on day one, but strategically important for enterprise-quality adoption.

Reasoning:

1. Agent UIs increase complexity (longer sessions, tool actions, stream updates, state transitions).
2. More complexity increases failure modes, which makes contracts and deterministic behavior non-optional.
3. Enterprises evaluate whether AI UI feels native to their product language. This is where Level 3 matters.

## 5) Pros and Cons of Deeper Design-System Support

### Pros

1. Stronger product trust
	- Deterministic contracts reduce render/runtime surprises.

2. Better enterprise fit
	- Teams can align generated UI with internal design standards and governance.

3. Better differentiation
	- Moves FogUI beyond "another renderer" into "reliability and compatibility layer".

4. Easier team adoption
	- Frontend teams accept tools that preserve existing architecture and UI conventions.

5. Better agent-era readiness
	- Structured events/actions and deterministic props become critical in interactive agent workflows.

### Cons

1. Higher implementation scope
	- Requires schema/versioning discipline and adapter validation tooling.

2. Greater maintenance surface
	- Contracts, mappings, and compatibility matrices require long-term stewardship.

3. Slower early feature velocity
	- Strictness can feel slower versus rapid experimentation.

4. More docs and DX burden
	- Need clear guidance for adapter authors and integrators.

## 6) Is There OSS Demand for This?

Answer given:

Yes, but with nuance.

Open-source frontend developers typically adopt libraries that are:

1. Useful quickly (good defaults, fast onboarding).
2. Safe in production (predictable behavior).
3. Flexible enough to integrate with existing stacks.

Implication for FogUI OSS:

1. Level 2 is the strongest OSS value now.
	- It provides objective reliability value to all users.

2. Level 3 should be incremental.
	- Start with enough fidelity hooks to avoid lock-in.
	- Avoid overbuilding a full token/theming platform too early.

## 7) Ecosystem Positioning Conclusion from Conversation

FogUI should avoid being only:

1. a component library,
2. a prompt-template project,
3. or a protocol clone.

FogUI can own:

1. deterministic UI contract enforcement,
2. adapter-based compatibility with existing design systems,
3. safe rendering and stream reconciliation for chatbots and agents.

Suggested positioning statement from the discussion:

FogUI is the deterministic design-system rendering layer for AI-generated interfaces.

## 8) Immediate Product Guidance Captured

1. Keep adapter support as the foundation (Level 1).
2. Prioritize Level 2 now (contracted props/events, deterministic behavior).
3. Add Level 3 in targeted increments for enterprise/native feel.
4. Keep architecture compatible with broader agent ecosystem patterns (event-driven, transport-agnostic, renderer-safe).

## 9) Clarification on OSS vs Product (Deferred)

You noted confusion around the OSS/product split and asked to continue that brainstorming later.

Current decision in this file:

1. Focus now on strategy and design-system support implications.
2. Revisit OSS packaging and boundaries in a separate focused discussion.

---

## Quick TL;DR

1. FogUI already supports design systems via adapters, but that is only Level 1.
2. Pivoting to agent UI increases need for Level 2 determinism, not decreases it.
3. Level 3 fidelity is strategically valuable but can be phased.
4. In OSS, frontend developers will adopt reliability + compatibility tooling if onboarding remains simple.
5. Best direction: become the deterministic contract and rendering-trust layer for AI UI, not just another renderer.

