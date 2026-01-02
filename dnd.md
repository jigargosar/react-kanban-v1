# Drag and Drop Requirements

## Overview

A generic, reusable drag-and-drop facade that abstracts dnd-kit complexity while supporting nested sortable contexts.

## Core Requirements

### Generic Facade

The facade must remain agnostic of domain concepts (columns, cards, tasks, etc.). It operates on:

- **Items** - any sortable entities
- **Groups** - containers that hold items
- **MoveInfo** - reports what moved and its new neighbors

### Uniform Group Handling

Single-group and multi-group scenarios use identical facade logic:

- Single group: client returns a constant group ID for all items (e.g., `"board"`)
- Multiple groups: client returns varying group IDs per item (e.g., `card.columnId`)

The facade has no awareness of whether there's one group or many. No special cases, no conditional handling.

### MoveInfo Contract

When an item moves, the facade reports:

- Which item moved
- Destination group
- Neighbor IDs (before/after) at the drop position

The facade does not compute positions, indices, or any domain-specific values. Consumers derive what they need from neighbor IDs.

### Nesting Support

The facade must support composition for nested drag-and-drop:

- Outer level: e.g., columns sortable within a board
- Inner level: e.g., cards sortable within and across columns

Each level is an independent facade instance. Nesting is a client-side concern through composition, not a special mode within the facade.

## Current Problem

The existing implementation has become entangled with application-specific logic:

- Column and card handling mixed into the facade
- No longer generic or reusable
- Difficult to understand and maintain
- Lost the clean abstraction that separated dnd-kit mechanics from domain logic

## Goal

Restore the facade to a clean, generic abstraction that:

1. Works identically for any sortable items with groups
2. Supports nesting through composition
3. Keeps all domain logic in the consumer
4. Remains easy to understand and maintain
