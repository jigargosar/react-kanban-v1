# Kanban

A simple Kanban board built with React, TypeScript, and Tailwind CSS.

## Features

- Drag and drop cards between columns
- Create, edit, and delete cards
- Persistent storage

## Tech Stack

- React 19
- TypeScript
- Vite + SWC
- Tailwind CSS v4

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## TODO

### Error Handling Strategy
- Define consistent approach for programmer errors vs runtime errors
- Add `assertNever` utility for exhaustive type checks
- Decide on error logging (console, Sentry, etc.)
- Audit silent error swallowing in store (e.g., "not found" during move)

### KeyboardSensor Issue
- Default KeyboardSensor only drags columns, not cards
- Conflicts with add card/column input forms
- Consider disabling or configuring properly
