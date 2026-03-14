# FogUI Roadmap & Product Direction
**Positioning:** *"Tailwind/Shadcn for Agent UI"*
**One-liner:** FogUI turns agent output into real UI using your existing components — like Tailwind/Shadcn, but for AI.

## 1) Product Thesis
Agents will replace chatbots, and agent output needs to render as **UI** rather than text.
Most tools solve “JSON → UI,” but they **don’t adapt to existing design systems**.
FogUI’s wedge is **design-system native agent UI**.

## 2) Core Principles
- **Adapter-first**: canonical schema + adapter = “HTML + CSS” for agent UI.
- **Agent-agnostic**: works with any LLM or agent runtime.
- **BYOK-friendly**: bring your own LLM key; FogUI backend optional later.
- **Open-source first**: community adoption before monetization.

## 3) What FogUI Is
A **frontend library** that renders agent-generated UI into your design system.
FogUI is not a full agent platform; it’s the **design layer** for agent outputs.

## 4) What FogUI Is Not
- Not another LLM wrapper
- Not a closed UI kit
- Not tied to a single agent framework

## 5) Product Architecture (MVP)
- **Canonical schema v1**: small, stable UI spec (Card, Table, List, Form, Input, Button, Stack, Grid, Tabs, Badge).
- **Renderer**: `FogUIRenderer` renders schema into React.
- **Adapter API**: `createAdapter` maps canonical components to real DS components.
- **Shadcn/Tailwind adapter**: default, no CSS shipped.
- **Action system**: UI → action → agent loop.

## 6) Developer Experience (Shadcn-style)
**FogUI Create** (CLI):
```
npx fogui create
✔ framework: Next.js
✔ styling: Tailwind
✔ components: Shadcn
✔ theme: Zinc / Radius 8
✔ icons: Lucide
✔ output: fogui.adapter.ts
```
Outputs:
- Adapter file
- Theme tokens / CSS vars
- Example schema + renderer usage

## 7) Differentiation
- json-render/OpenUI → define schema + render their UI
- FogUI → **adapter ecosystem + DS fidelity**
- FogUI becomes the **design system bridge** for agents.

## 8) Roadmap

### Phase 1 — OSS Core (0–4 weeks)
- Canonical schema v1
- Adapter API
- Shadcn adapter
- Minimal docs + demo

### Phase 2 — Adapter Ecosystem (4–8 weeks)
- MUI or Chakra adapter
- Token mapping + validation
- Missing component warnings

### Phase 3 — Agent-First UX (8–12 weeks)
- UI patches / state updates
- Action lifecycle hooks
- Example integrations (Cloudflare Agents, custom backend)

### Phase 4 — Optional Managed Backend (later)
- FogUI API: prompt → schema
- Usage auth, rate limits
- BYOK always supported

## 9) Open Source + Monetization
- OSS library drives adoption
- Managed backend is optional (subscription)
- Enterprises pay for governance, compliance, and support

## 10) Next Actions
- Finalize canonical schema v1
- Implement Shadcn adapter
- Draft `FogUI Create` CLI spec
- Build demo app with agent JSON
