# Chat Interface Redesign — Design Spec

**Date:** 2026-07-31
**Status:** Approved
**Component Reference:** Ruixen Moon Chat (layout structure only)

---

## Overview

Redesign the FitMate chat interface (`/chat`) to adopt the Ruixen Moon Chat's centered-input layout while preserving FitMate's "Movement Companion" design identity (clean whites, forest greens, flat surfaces, rounded forms).

**Key decisions:**
- Layout structure borrowed from Ruixen; visual style stays FitMate (no glassmorphism, no dark theme, no background images)
- Input is the visual anchor — large and centered when no messages, shrinks and docks to bottom when conversation starts
- Animated transition between states using framer-motion
- Profile dropdown in top-right header (Radix DropdownMenu)
- No emoji characters anywhere — all visual markers are lucide-react SVG icons
- Quick action buttons removed entirely

---

## Design Rules Compliance

All four non-negotiable rules from DESIGN.md are preserved:

| Rule | Status | How |
|------|--------|-----|
| Green Budget Rule | Preserved | Green only on buttons, links, active states |
| Evidence Hierarchy Rule | Preserved | Source citations always visible below assistant messages in Geist Mono |
| Flat-By-Default Rule | Preserved | No shadows at rest; input card is flat with border, no glassmorphism |
| No-Sharp-Edges Rule | Preserved | Minimum 8px radius on all elements |

---

## Visual States

### State A: Empty / Welcome (no messages)

Full-viewport layout with the title + input cluster vertically centered.

```
+-----------------------------------------------+
| [FitMate logo]                [Profile icon]  |  <- Header (sticky top)
|                                               |
|                                               |
|              [Sparkles SVG]                   |
|          Welcome back, {name}                 |  <- Centered vertically
|   Ask me anything about fitness,              |
|   nutrition, or healthy living.                |
|                                               |
|   +---------------------------------------+   |
|   |                                       |   |  <- LARGE input card
|   |  Ask FitMate anything about           |   |     min-h: 80px
|   |  exercise, nutrition, or health       |   |     max-w-2xl centered
|   |                                       |   |     bg-muted/50 border-border
|   |                                [Send] |   |     rounded-xl
|   +---------------------------------------+   |
|                                               |
|                                               |
+-----------------------------------------------+
```

**Welcome elements:**
- Icon container: 64x64, `bg-primary/10 rounded-2xl`, contains `Sparkles` icon in `text-primary`
- Title: `text-lg font-semibold text-foreground`
- Subtitle: `text-sm text-muted-foreground`, max-w-sm centered
- Entire cluster (icon + title + subtitle + input) is vertically centered as one unit

**Input card (empty state):**
- `bg-muted/50 border border-border rounded-xl`
- Internal padding: `px-4 py-3`
- Textarea: `min-h-[80px] max-h-[150px]`, transparent background, no border
- Send button: Inside the card, bottom-right. `bg-primary text-white` when active, `bg-border text-muted-foreground` when disabled
- `max-w-2xl mx-auto` centered horizontally

### State B: Active Chat (has messages)

Layout shifts to standard chat flow with input docked at bottom.

```
+-----------------------------------------------+
| [FitMate logo]                [Profile icon]  |  <- Header (sticky top)
|                                               |
|   +---------------------------------------+   |
|   | How do I do a proper squat?           |   |  <- User bubble (right)
|   +---------------------------------------+   |
|                                               |
|   +---------------------------------------+   |
|   | Stand with feet shoulder-width...     |   |  <- Assistant bubble (left)
|   | (Source: ACE Exercise Library)         |   |
|   +---------------------------------------+   |
|                                               |
|   [typing indicator: . . .]                   |
|                                               |
|-----------------------------------------------|  <- border-t
|   +---------------------------------------+   |
|   | Ask FitMate anything...         [Send]|   |  <- SMALL input (bottom)
|   +---------------------------------------+   |     min-h: 44px
|   FitMate provides general guidance...        |     bg-muted/50 border-border
+-----------------------------------------------+
```

**Messages area:**
- `flex-1 overflow-y-auto chat-scroll`
- Messages scroll in upper portion of viewport
- `pb-[20vh]` padding so last message doesn't overlap input area
- Auto-scrolls to bottom on new messages

**Chat bubbles (unchanged from current):**
- User: `bg-primary text-primary-foreground rounded-xl`, right-aligned, max-w-[85%]
- Assistant: `bg-muted text-foreground rounded-xl`, left-aligned, max-w-[85%]
- Source citation: `font-mono text-xs text-muted-foreground` with `BookOpen` icon, always visible

**Input card (active state):**
- `bg-muted/50 border border-border rounded-xl`
- Textarea: `min-h-[44px] max-h-[150px]`, compact single-line feel
- Footer disclaimer below: `text-xs text-muted-foreground/60`
- Docked at viewport bottom with `border-t border-border`

---

## Transition Animation

When the user sends their **first message**, the layout transitions from State A to State B:

1. **Welcome fades out:** opacity 0 + translateY(-8px), duration 200ms
2. **Input shrinks and slides down:**
   - `min-height` transitions from 80px to 44px
   - Position transitions from centered to bottom-docked
   - Uses framer-motion `layout` animation for smooth interpolation
   - Duration: 300ms, ease-out

When all messages are **cleared** (new conversation via profile dropdown):
- Reverse animation: input slides back up and grows, welcome fades in
- Same durations and easing

**Implementation approach:**
- `AnimatePresence` wraps the welcome content (conditional render)
- Input card uses `motion.div` with `layout` prop for position animation
- `layoutId="chat-input"` ensures smooth interpolation between positions
- State is driven by `messages.length === 0` check

---

## Component Architecture

### File Structure

```
components/chat/
  fitmate-chat.tsx          # Main orchestrator (rewritten)
  chat-header.tsx           # Header bar + profile dropdown trigger
  chat-welcome.tsx          # Centered welcome state (icon + greeting)
  chat-messages.tsx         # Scrollable message list + typing indicator
  chat-input.tsx            # Floating input card with send button

components/ui/
  button.tsx                # EXISTING — no changes
  textarea.tsx              # EXISTING — no changes
  profile-dropdown.tsx      # NEW — Radix DropdownMenu for profile
```

### Dependencies to Install

All required dependencies are already installed:
- `lucide-react` (icons)
- `zustand` (state management)
- `framer-motion` (animations)
- `@radix-ui/react-slot` (button composition)

**New dependency needed:**
- `@radix-ui/react-dropdown-menu` — for the profile dropdown

### Component Specs

#### FitMateChat (`fitmate-chat.tsx`)
**Purpose:** Main orchestrator. Manages the two visual states and wires stores to sub-components.

**State:**
- `input` (string) — current input text
- Reads from `useChatStore()` and `useOnboardingStore()`

**Behavior:**
- Renders `ChatHeader` always
- When `messages.length === 0`: renders `ChatWelcome` + centered `ChatInput`
- When `messages.length > 0`: renders `ChatMessages` + bottom-docked `ChatInput`
- Handles `handleSend()` — same logic as current (calls `sendMessage` API, manages store)
- Handles `handleKeyDown()` — Enter to send, Shift+Enter for newline

**Layout:**
- Full viewport height: `h-[100dvh] flex flex-col bg-background`
- Header: sticky top
- Content area: `flex-1` with conditional rendering

#### ChatHeader (`chat-header.tsx`)
**Purpose:** Top navigation bar with branding and profile access.

**Props:** None (reads from stores directly)

**Layout:**
- Left: Sparkles icon in `bg-primary/10 rounded-lg` + "FitMate" text
- Right: Profile button — user initials in `bg-primary/10 text-primary rounded-full`
- `border-b border-border`, sticky top, `bg-background`

**Profile button:**
- Shows first letter of user's name (uppercase)
- `h-9 w-9 rounded-full bg-primary/10 text-primary font-medium text-sm`
- Triggers `ProfileDropdown` on click

#### ChatWelcome (`chat-welcome.tsx`)
**Purpose:** Empty state welcome content shown when no messages exist.

**Props:**
- `name: string` — user's name from onboarding store

**Layout:**
- Icon: 64x64 `bg-primary/10 rounded-2xl` with `Sparkles` icon
- Title: "Welcome back, {name}"
- Subtitle: "Ask me anything about exercise, nutrition, or healthy living."
- Wrapped in `motion.div` with `initial={{ opacity: 0, y: 8 }}` and `animate={{ opacity: 1, y: 0 }}`

#### ChatMessages (`chat-messages.tsx`)
**Purpose:** Scrollable message list with typing indicator.

**Props:**
- `messages: ChatMessage[]` — from chat store
- `isLoading: boolean` — from chat store

**Behavior:**
- Auto-scrolls to bottom on new messages (via `useEffect` + `ref`)
- Shows `TypingIndicator` when `isLoading`

**Sub-components (inline):**
- `ChatBubble` — user/assistant message styling
- `SourceCitation` — Geist Mono citation badge
- `TypingIndicator` — three pulsing dots

#### ChatInput (`chat-input.tsx`)
**Purpose:** The input card — the visual anchor of the page.

**Props:**
- `value: string` — current input text
- `onChange: (value: string) => void`
- `onSend: () => void`
- `onKeyDown: (e: React.KeyboardEvent) => void`
- `isLoading: boolean`
- `isCompact: boolean` — true when messages exist (docked bottom), false when centered

**Layout:**
- Outer: `motion.div` with `layout` prop for animated position transitions
- Card: `bg-muted/50 border border-border rounded-xl`
- Textarea: auto-resize (48px-150px centered, 44px-150px compact)
- Send button: bottom-right inside card, green when active, muted when disabled
- Footer disclaimer: `text-xs text-muted-foreground/60`, only visible in compact mode

**Positioning (driven by `isCompact` prop):**
- `isCompact=false` (centered): part of the vertically-centered cluster
- `isCompact=true` (docked): `mt-auto` to push to bottom, `border-t` separator

#### ProfileDropdown (`profile-dropdown.tsx`)
**Purpose:** Dropdown menu for profile info and actions.

**Trigger:** User initials button in ChatHeader

**Menu items (all SVG icons, no emoji):**
| Icon | Label | Action |
|------|-------|--------|
| `User` | My Profile | (placeholder — future /profile page) |
| `Target` | Goals | Shows current goals from onboarding store |
| `MessageSquarePlus` | New Chat | Calls `useChatStore().clearMessages()` |
| `Settings` | Settings | (placeholder — future) |
| `RotateCcw` | Reset Onboarding | Calls `resetOnboarding()` + navigates to /onboarding |

**Styling:**
- `bg-background border border-border rounded-xl`
- Items: `px-3 py-2 text-sm hover:bg-muted rounded-lg`
- Icons: `h-4 w-4 text-muted-foreground`
- Separator between main actions and reset

**Data displayed:**
- User name from `useOnboardingStore().profile.name`
- Quick stats: fitness_level, weight_kg, height_cm (if available)
- Goals list (if available)

---

## State Management

No new Zustand stores needed. Existing stores are sufficient:

| Store | Used For | Data |
|-------|----------|------|
| `useChatStore` | Messages, loading, conversation | `messages`, `isLoading`, `conversationId`, `clearMessages()` |
| `useOnboardingStore` | User profile, name, goals | `profile.name`, `profile.fitness_level`, `profile.weight_kg`, `profile.height_cm`, `profile.goals`, `userId`, `resetOnboarding()` |

---

## Files to Create/Modify

### New Files
1. `components/chat/chat-header.tsx` — Header bar component
2. `components/chat/chat-welcome.tsx` — Welcome state component
3. `components/chat/chat-messages.tsx` — Message list component
4. `components/chat/chat-input.tsx` — Input card component
5. `components/ui/profile-dropdown.tsx` — Profile dropdown menu

### Modified Files
1. `components/chat/fitmate-chat.tsx` — Complete rewrite as orchestrator
2. `app/chat/page.tsx` — Minor: no changes needed (already renders FitMateChat)

### Dependencies to Install
```bash
npm install @radix-ui/react-dropdown-menu
```

---

## Responsive Behavior

- **Desktop (>768px):** `max-w-2xl` centered column, full header
- **Mobile (<768px):** `max-w-full px-4`, same layout but tighter spacing
- **Input:** Always `max-w-2xl mx-auto`, scales proportionally
- **Header:** Adapts — profile button stays right-aligned

---

## Accessibility

- All interactive elements have focus-visible states
- Keyboard navigation: Tab through header, input, send button
- Enter to send, Shift+Enter for newline (existing behavior preserved)
- Dropdown menu supports arrow key navigation (Radix built-in)
- `aria-label` on send button and profile button
- Reduced motion: framer-motion respects `prefers-reduced-motion`

---

## Testing Checklist

- [ ] Empty state renders centered welcome + large input
- [ ] Sending first message triggers transition animation
- [ ] Input shrinks and moves to bottom after first message
- [ ] Messages scroll correctly without overlapping input
- [ ] Auto-scroll to bottom on new messages
- [ ] Profile dropdown opens/closes correctly
- [ ] Profile dropdown shows correct user data
- [ ] "New Chat" clears messages and returns to welcome state
- [ ] Source citations visible below assistant messages
- [ ] Typing indicator shows during loading
- [ ] Enter sends, Shift+Enter creates newline
- [ ] No emoji characters anywhere in the UI
- [ ] All icons are lucide-react SVGs
- [ ] Responsive on mobile viewports
- [ ] Dark mode tokens work (prefers-color-scheme)
