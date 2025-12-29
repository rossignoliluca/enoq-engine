# ENOQ_UX_SPEC

## Technical Specification for Interface Implementation

---

## I. ATMOSPHERE SYSTEM

### Type Definition

```typescript
type Atmosphere = 
  | 'OPERATIONAL'   // Task completion, active work
  | 'HUMAN_FIELD'   // Emotional presence, support
  | 'DECISION'      // Choice mapping, clarity
  | 'V_MODE'        // Deep reflection, stillness
  | 'EMERGENCY';    // Crisis containment, safety
```

### State Machine

```
Any ←──────────────────────────────→ Any
              (fluid transitions)
                     │
                     │ (immediate)
                     ▼
               EMERGENCY
                     │
                     │ (slow exit)
                     ▼
                   Any
```

All atmospheres can transition to any other.
EMERGENCY is always accessible immediately.
Exit from EMERGENCY is slow (800ms).

---

## II. DESIGN TOKENS

### Color

```css
:root {
  /* Base */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #FAFAFA;
  --color-bg-tertiary: #F5F5F5;
  
  /* Text */
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-text-muted: #A3A3A3;
  
  /* Atmosphere: HUMAN_FIELD */
  --color-warm-bg: #FFFBF7;
  --color-warm-secondary: #FFF5ED;
  
  /* Atmosphere: V_MODE */
  --color-soft-bg: #F8F9FA;
  --color-soft-secondary: #F1F3F4;
  
  /* Atmosphere: EMERGENCY */
  --color-alert-bg: #FEF7F0;
  --color-alert-border: #F0E0D0;
  --color-alert-text: #8B5A2B;
}
```

### Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-sm: 0.875rem;
  
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  --leading-loose: 2;
}
```

### Spacing

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
```

### Timing

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 800ms;
  
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
}
```

---

## III. ATMOSPHERE TOKENS

### OPERATIONAL

```css
[data-atmosphere="OPERATIONAL"] {
  --bg: var(--color-bg-primary);
  --content-width: 800px;
  --message-spacing: var(--space-4);
  --response-delay: 0ms;
  --density: 1;
}
```

### HUMAN_FIELD

```css
[data-atmosphere="HUMAN_FIELD"] {
  --bg: var(--color-warm-bg);
  --content-width: 700px;
  --message-spacing: var(--space-6);
  --response-delay: 200ms;
  --density: 0.7;
}
```

### DECISION

```css
[data-atmosphere="DECISION"] {
  --bg: var(--color-bg-primary);
  --content-width: 750px;
  --message-spacing: var(--space-6);
  --response-delay: 100ms;
  --density: 0.8;
}
```

### V_MODE

```css
[data-atmosphere="V_MODE"] {
  --bg: var(--color-soft-bg);
  --content-width: 600px;
  --message-spacing: var(--space-8);
  --response-delay: 500ms;
  --density: 0.3;
  --font-weight: 300;
  --line-height: var(--leading-loose);
}
```

### EMERGENCY

```css
[data-atmosphere="EMERGENCY"] {
  --bg: var(--color-alert-bg);
  --content-width: 650px;
  --message-spacing: var(--space-4);
  --response-delay: 0ms;
  --density: 0.5;
  --border: 1px solid var(--color-alert-border);
}
```

---

## IV. COMPONENT VISIBILITY

### Matrix

| Component | OPERATIONAL | HUMAN_FIELD | DECISION | V_MODE | EMERGENCY |
|-----------|:-----------:|:-----------:|:--------:|:------:|:---------:|
| Conversation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Input | ✓ | ✓ | ✓ | ✓ | ✓ |
| Field Indicator | ✓ | ○ | ✓ | ✗ | ⚠ |
| File Upload | ✓ | ○ | ○ | ✗ | ✗ |
| Decision Map | ○ | ✗ | ✓ | ✗ | ✗ |
| Emergency Resources | ✗ | ○ | ✗ | ✗ | ✓ |
| Settings | ✓ | ○ | ○ | ✗ | ✗ |
| Exit | ✓ | ✓ | ✓ | ✓ | ✓ |

**Legend:**
- ✓ = Visible
- ○ = Subtle/available
- ✗ = Hidden
- ⚠ = Alert state

---

## V. TRANSITIONS

### Default Transition

```css
.atmosphere-transition {
  transition: 
    background-color var(--duration-slow) var(--ease-out),
    max-width var(--duration-slow) var(--ease-out),
    padding var(--duration-slow) var(--ease-out);
}
```

### Special Cases

```typescript
const transitionDurations = {
  toEmergency: 200,    // Fast entry
  fromEmergency: 800,  // Slow exit
  toVMode: 800,        // Gentle entry
  default: 500
};
```

### Component Stagger

When multiple components change:
- Stagger delay: 50ms between components
- Animation: fade (opacity 0→1)
- Duration: 300ms per component

---

## VI. RESPONSIVE

### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
```

### Mobile Adjustments

```css
@media (max-width: 768px) {
  :root {
    --content-width: 100%;
  }
  
  .conversation {
    padding: var(--space-4) var(--space-3);
  }
}
```

---

## VII. ACCESSIBILITY

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
```

### Focus

```css
:focus-visible {
  outline: 2px solid var(--color-text-muted);
  outline-offset: 2px;
}
```

### Screen Reader

```html
<div role="status" aria-live="polite" class="sr-only">
  <!-- Atmosphere changes announced here -->
</div>
```

---

## VIII. IMPLEMENTATION

### React Context

```typescript
interface AtmosphereContext {
  atmosphere: Atmosphere;
  setAtmosphere: (a: Atmosphere) => void;
  isTransitioning: boolean;
}
```

### Usage

```tsx
function Conversation() {
  const { atmosphere } = useAtmosphere();
  
  return (
    <div 
      className="conversation" 
      data-atmosphere={atmosphere}
    >
      <MessageList />
      <InputArea />
    </div>
  );
}
```

### Atmosphere-Aware Component

```tsx
function AtmosphereAware({ 
  config, 
  children 
}: { 
  config: Record<Atmosphere, Visibility>;
  children: ReactNode;
}) {
  const { atmosphere } = useAtmosphere();
  const visibility = config[atmosphere];
  
  if (visibility === 'hidden') return null;
  
  return (
    <div className={`visibility-${visibility}`}>
      {children}
    </div>
  );
}
```

---

## IX. TESTING

### Checklist

**Visual:**
- [ ] Each atmosphere visually distinct but subtle
- [ ] Transitions smooth
- [ ] Text readable in all states

**Functional:**
- [ ] Atmosphere changes on kernel signal
- [ ] Transitions interruptible
- [ ] EMERGENCY always accessible

**Accessibility:**
- [ ] Color contrast WCAG AA
- [ ] Reduced motion respected
- [ ] Keyboard navigation works

**Performance:**
- [ ] No layout thrashing
- [ ] GPU-accelerated animations
- [ ] < 16ms frame time

---

*Technical specification for ENOQ Space implementation.*
