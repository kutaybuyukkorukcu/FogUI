# Determinism Evaluation Results (Archived)

This document preserves the benchmark outcome from the live evaluation run completed on 2026-04-17.

The implementation used to generate this report was later removed from the repository, but the measured result remains useful as publication support for the article.

## Run Context

- Generated at: `2026-04-17T17:43:58.891070Z`
- Model: `gpt-4.1-nano`
- Provider: `https://api.openai.com`
- Repetitions: `10`
- Prompt-driven runs: `110` per mode

## Overall Mode Summary

| Mode | Runs | JSON Validity | Canonical Validity | Output Stability | Render Stability | Stream Snapshot Stability | Diagnostic Rate | Fallback Rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIRECT_A2UI_BASELINE | 110 | 90.9% | n/a | 9.0% | n/a | n/a | n/a | n/a |
| DIRECT_CANONICAL_BASELINE | 110 | 100.0% | 0.0% | 9.1% | 100.0% | 100.0% | 100.0% | 0.0% |
| FOGUI_A2UI_COMPATIBILITY | 110 | 90.9% | 100.0% | 9.0% | 9.0% | 9.0% | 9.0% | 9.0% |
| FOGUI_TRANSFORM | 110 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% |

## Operational Overhead By Mode

| Mode | P50 Latency | P95 Latency | Avg Prompt Tokens | Avg Output Tokens | Avg Total Tokens | Avg Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DIRECT_A2UI_BASELINE | 2146 ms | 4971 ms | 254.5 | 301.6 | 556.1 | $0.000334 |
| DIRECT_CANONICAL_BASELINE | 2147 ms | 4572 ms | 1156.0 | 270.3 | 1426.3 | $0.000856 |
| FOGUI_A2UI_COMPATIBILITY | 0 ms | 1 ms | 0.0 | 0.0 | 0.0 | $0.000000 |
| FOGUI_TRANSFORM | 2048 ms | 4704 ms | 1156.0 | 18.0 | 1174.0 | $0.000704 |

## Overhead Deltas

`FOGUI_TRANSFORM` vs `DIRECT_CANONICAL_BASELINE`:

- P50 latency delta: -99 ms
- P95 latency delta: +132 ms
- Average prompt token delta: +0.0
- Average output token delta: -252.3
- Average total token delta: -252.3
- Average cost delta: -$0.000151

Fixed compatibility fixture translation overhead:

- Fixture runs: `4`
- P50 translation latency: 0 ms
- P95 translation latency: 0 ms

## Publication Candidate Highlights

### Card Summary

| Mode | JSON Validity | Canonical Validity | Output Stability | Render Stability | Stream Stability | Diagnostic Rate | P50 Latency | Avg Total Tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIRECT_A2UI_BASELINE | 100.0% | n/a | 20.0% | n/a | n/a | n/a | 919 ms | 339.9 |
| DIRECT_CANONICAL_BASELINE | 100.0% | 0.0% | 60.0% | 100.0% | 100.0% | 100.0% | 957 ms | 1235.8 |
| FOGUI_A2UI_COMPATIBILITY | 100.0% | 100.0% | 20.0% | 20.0% | 20.0% | 50.0% | 1 ms | 0.0 |
| FOGUI_TRANSFORM | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 853 ms | 1183.0 |

### Table Register

| Mode | JSON Validity | Canonical Validity | Output Stability | Render Stability | Stream Stability | Diagnostic Rate | P50 Latency | Avg Total Tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIRECT_A2UI_BASELINE | 100.0% | n/a | 70.0% | n/a | n/a | n/a | 2346 ms | 539.3 |
| DIRECT_CANONICAL_BASELINE | 100.0% | 0.0% | 40.0% | 100.0% | 100.0% | 100.0% | 1840 ms | 1358.3 |
| FOGUI_A2UI_COMPATIBILITY | 100.0% | 100.0% | 70.0% | 70.0% | 70.0% | 10.0% | 0 ms | 0.0 |
| FOGUI_TRANSFORM | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 1842 ms | 1166.0 |

### Mixed Smoke

| Mode | JSON Validity | Canonical Validity | Output Stability | Render Stability | Stream Stability | Diagnostic Rate | P50 Latency | Avg Total Tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DIRECT_A2UI_BASELINE | 10.0% | n/a | 100.0% | n/a | n/a | n/a | 4425 ms | 760.0 |
| DIRECT_CANONICAL_BASELINE | 100.0% | 0.0% | 40.0% | 100.0% | 100.0% | 100.0% | 4758 ms | 1761.0 |
| FOGUI_A2UI_COMPATIBILITY | 10.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0 ms | 0.0 |
| FOGUI_TRANSFORM | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 4641 ms | 1190.0 |

## Compatibility Fixture Results

- Invalid Content Container: canonical validity=100.0%, render stability=100.0%, stream snapshot stability=100.0%, diagnostics=100.0%, fallback rate=0.0%
- Named Component Tree: canonical validity=100.0%, render stability=100.0%, stream snapshot stability=100.0%, diagnostics=0.0%, fallback rate=0.0%
- Supported Text + Card: canonical validity=100.0%, render stability=100.0%, stream snapshot stability=100.0%, diagnostics=0.0%, fallback rate=0.0%
- Unsupported Node Fallback: canonical validity=100.0%, render stability=100.0%, stream snapshot stability=100.0%, diagnostics=100.0%, fallback rate=100.0%

## Conclusion

This run supports a narrow but strong claim:

1. FogUI did not prove semantic determinism of UI generation.
2. FogUI did prove stable runtime behavior around canonical UI payloads.
3. Raw structured prompting was materially less trustworthy than the FogUI transform path for canonical validity and repeatable output shape.
4. A2UI compatibility translation added negligible runtime overhead and preserved a clear interoperability story.

For article use, the safest phrasing is:

FogUI is not a magic determinism engine for the underlying model. It is a canonical UI runtime that constrains, validates, normalizes, and diagnoses model-generated UI before it reaches the renderer.