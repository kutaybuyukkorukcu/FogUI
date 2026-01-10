# Changelog

All notable changes to the `@fogui/react` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-01-06

### Added
- **Design System Adapters** - New `/adapters` export for easy integration
  - `createShadcnAdapter()` - Map Shadcn/Radix components to FogUI
  - `createHeadlessAdapter()` - Fully custom component implementations
- **Custom Endpoint Support** - `endpoint` prop on `FogUIProvider` for self-hosted deployments
- **Provider-level Components** - `components` prop on `FogUIProvider` to set design system globally
- **TypeScript Types** - Exported `CardProps`, `ListProps`, `TableProps`, `CalloutProps` for custom components
- **Registry Utilities** - `createRegistry()` and `mergeRegistries()` helpers

### Changed
- `FogUIRenderer` now automatically uses components from `FogUIProvider` context
- Improved JSDoc documentation with more examples
- Focused adapter pattern on mapping existing design systems (removed pre-built Tailwind components)

## [0.1.0] - 2024-12-29

### Added
- Initial beta release
- `FogUIProvider` - Context provider for FogUI configuration
- `useFogUI` - Hook for transforming LLM outputs to UI components
- `FogUIRenderer` - Component for rendering transformed UI
- Default component registry with common UI patterns
- Core transformation engine
- TypeScript support with full type definitions
