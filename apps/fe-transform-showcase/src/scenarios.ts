export interface TransformScenario {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly summary: string;
  readonly intent: string;
  readonly preferredComponents: readonly string[];
  readonly instructions: string;
  readonly focusComponents: readonly string[];
}

export const transformScenarios: readonly TransformScenario[] = [
  {
    id: 'card-summary',
    title: 'Card Summary',
    summary: 'Push the backend toward a single summary card.',
    prompt:
      'Create a concise launch-readiness summary as one card with a title, short description, and one follow-up note for the operator.',
    intent: 'component_card_validation',
    preferredComponents: ['Card'],
    instructions:
      'Favor one canonical Card with compact copy. Avoid mixing in unrelated component families unless strictly needed.',
    focusComponents: ['Card'],
  },
  {
    id: 'badge-status',
    title: 'Badge Statuses',
    summary: 'Validate short categorical output using badges.',
    prompt:
      'Show rollout status for dev, staging, and production environments using short badge-like labels and minimal explanatory text.',
    intent: 'component_badge_validation',
    preferredComponents: ['Badge', 'Stack'],
    instructions:
      'Prefer Badge components for the statuses and keep layout compact.',
    focusComponents: ['Badge'],
  },
  {
    id: 'button-cta',
    title: 'Button CTA',
    summary: 'Validate action-oriented output with a button.',
    prompt:
      'Create a deployment approval panel with a short explanation and a single primary action button for the next operator step.',
    intent: 'component_button_validation',
    preferredComponents: ['Button', 'Card'],
    instructions:
      'Return a clear call-to-action and keep the rest of the layout minimal.',
    focusComponents: ['Button'],
  },
  {
    id: 'list-checklist',
    title: 'List Checklist',
    summary: 'Validate ordered or bulleted content rendering.',
    prompt:
      'Turn a new-customer onboarding flow into a compact checklist with five concrete steps and a short heading.',
    intent: 'component_list_validation',
    preferredComponents: ['List', 'Card'],
    instructions:
      'Prefer a List as the main content vehicle. Keep each item short and explicit.',
    focusComponents: ['List'],
  },
  {
    id: 'table-register',
    title: 'Table Register',
    summary: 'Validate structured tabular output.',
    prompt:
      'Render a release risk register as a compact table with columns for risk, owner, severity, and mitigation.',
    intent: 'component_table_validation',
    preferredComponents: ['Table', 'Card'],
    instructions:
      'Prefer a single Table with 3 to 5 rows and stable headers.',
    focusComponents: ['Table'],
  },
  {
    id: 'grid-kpis',
    title: 'Grid KPIs',
    summary: 'Validate multi-card layout with grid semantics.',
    prompt:
      'Show four KPI snapshots for revenue, margin, uptime, and NPS in a compact dashboard layout.',
    intent: 'component_grid_validation',
    preferredComponents: ['Grid', 'Card', 'Badge'],
    instructions:
      'Prefer Grid for the top-level layout and keep each KPI in its own Card.',
    focusComponents: ['Grid', 'Card'],
  },
  {
    id: 'container-overview',
    title: 'Container Overview',
    summary: 'Validate nested grouping and layout containers.',
    prompt:
      'Compose a release overview with a grouped summary, one short checklist, and a row of environment indicators.',
    intent: 'component_container_validation',
    preferredComponents: ['Container', 'Card', 'List', 'Badge'],
    instructions:
      'Prefer Container as the primary grouping primitive. Nest child components inside it.',
    focusComponents: ['Container'],
  },
  {
    id: 'stack-briefing',
    title: 'Stack Briefing',
    summary: 'Validate vertical sequencing of related blocks.',
    prompt:
      'Create an operator briefing stacked vertically with three sections: current state, blockers, and next actions.',
    intent: 'component_stack_validation',
    preferredComponents: ['Stack', 'Card'],
    instructions:
      'Prefer Stack for the main arrangement and keep all sections concise.',
    focusComponents: ['Stack'],
  },
  {
    id: 'form-intake',
    title: 'Form Intake',
    summary: 'Validate form-oriented UI with inputs and submit action.',
    prompt:
      'Draft a lead intake form for enterprise prospects with fields for name, company, email, urgency, and a submit action.',
    intent: 'component_form_validation',
    preferredComponents: ['Form', 'Input', 'Button', 'Card'],
    instructions:
      'Prefer a compact Form containing Input fields and one clear submit Button.',
    focusComponents: ['Form', 'Input'],
  },
  {
    id: 'tabs-regions',
    title: 'Tabs By Region',
    summary: 'Validate partitioned content using tabs.',
    prompt:
      'Compare launch readiness for Americas, EMEA, and APAC using tabs with a short summary for each region.',
    intent: 'component_tabs_validation',
    preferredComponents: ['Tabs', 'TabPane', 'Card'],
    instructions:
      'Prefer Tabs with three panes and concise content inside each pane.',
    focusComponents: ['Tabs', 'TabPane'],
  },
  {
    id: 'mixed-smoke',
    title: 'Mixed Smoke',
    summary: 'Run one broader scenario that mixes component families.',
    prompt:
      'Build a small operations console with a grouped overview, KPI cards, a short incident list, a status table, and one follow-up action.',
    intent: 'component_smoke_validation',
    preferredComponents: ['Container', 'Grid', 'Card', 'List', 'Table', 'Button', 'Badge'],
    instructions:
      'Keep the response compact but exercise multiple canonical component families in one render.',
    focusComponents: ['Container', 'Grid', 'Card', 'List', 'Table', 'Button', 'Badge'],
  },
];

export const defaultScenarioId = transformScenarios[0]?.id ?? '';