# Enterprise Design System 💎

We have structured the Instagram Automation platform's UI around a premium, high-fidelity enterprise design system. Standardizing visual tokens, layout semantics, and spacing variables ensures visual consistency and speeds up development.

## 📁 Folder Structure

All reusable primitives reside inside the frontend application workspace:

```
apps/web/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── index.tsx          # Unified design system primitives
│   │   ├── layout/
│   │   │   └── AppShell.tsx       # Root framework navigation & workspace layout
│   │   └── workspace/
│   │       └── WorkspaceComponents.tsx # Workspace dropdowns & health indicators
```

---

## 🎨 Token Standardization (CSS Variables)

Defined global tokens are declared dynamically inside `apps/web/src/app/globals.css`. These control theme consistency:

| Attribute   | Variable Name | Output Token Reference                         |
| :---------- | :------------ | :--------------------------------------------- |
| **Colors**  | `--bg`        | `#0b0f19` (Dark base canvas)                   |
|             | `--surface`   | `#131b2e` (Secondary layer card containers)    |
|             | `--primary`   | `#2563eb` (Stripe-blue accents)                |
|             | `--success`   | `#10b981` (Completed logs / sync status)       |
|             | `--danger`    | `#ef4444` (Permanent failure flags/disconnect) |
| **Shadows** | `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)`                |
|             | `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)`               |
| **Radius**  | `--radius-md` | `6px`                                          |
|             | `--radius-lg` | `8px` (Standard container roundings)           |
| **Motion**  | `--duration`  | `150ms`                                        |
|             | `--ease`      | `cubic-bezier(0.4, 0, 0.2, 1)`                 |

---

## 🏗️ Primitive Components & API References

All components are fully typed React components exported from `src/components/ui/index.tsx`.

### 1. `<PageHeader>`

Renders standard page layout headings, descriptive subtitle copy, and contextual actions.

- **Props:**
  - `title: string` — The header title value.
  - `subtitle?: string` — Optional brief description.
  - `icon?: React.ReactNode` — Icon preceding title.
  - `actions?: React.ReactNode` — Call-to-action buttons header alignment.

```tsx
import { PageHeader } from "@/components/ui";
import { Plus } from "lucide-react";

<PageHeader
  title="Automations"
  subtitle="Manage and configure your automated message rules."
  actions={
    <button className="btn-primary">
      <Plus size={16} /> New Rule
    </button>
  }
/>;
```

---

### 2. `<Section>`

Standard wrapper container representing dashboard sectors. Includes optional extra controls.

- **Props:**
  - `title?: string` — Section title.
  - `description?: string` — Minor metadata description.
  - `extra?: React.ReactNode` — Right-aligned auxiliary settings/links.

```tsx
import { Section } from "@/components/ui";

<Section title="Media Sync History" extra={<button>Sync Now</button>}>
  <div className="content">Visual grid goes here...</div>
</Section>;
```

---

### 3. `<MetricCard>`

Visualizes top-level system indices with trend badge overlays.

- **Props:**
  - `title: string` — Label of index.
  - `value: string | number` — The main quantity.
  - `subtitle: string` — Comparative timestamp index label.
  - `trend?: { value: string; positive: boolean }` — Trend label & state.

```tsx
import { MetricCard } from "@/components/ui";
import { Eyeglasses } from "lucide-react";

<MetricCard
  title="Impression Rate"
  value="1,409"
  subtitle="vs last 7 days"
  trend={{ value: "+12.4%", positive: true }}
/>;
```

---

### 4. `<WorkflowCard>`

Automations grid listing block. Shows runs, toggles, success metrics, and quick action configuration.

```tsx
import { WorkflowCard } from "@/components/ui";

<WorkflowCard
  name="Auto-Reply Reel Thread"
  triggerType="REEL_COMMENT"
  enabled={true}
  runs={124}
  successRate="98%"
  onToggle={(enabled) => updateRule(enabled)}
  onEdit={() => openEditModal()}
/>;
```

---

### 5. `<StatusBadge>`

Renders standardized status badges for executions.

```tsx
import { StatusBadge } from "@/components/ui";

<StatusBadge status="SUCCESS" />
<StatusBadge status="RUNNING" />
<StatusBadge status="FAILED" />
```

---

### 6. `<EmptyState>`

Provides actionable instruction vectors for pages lacking database records.

```tsx
import { EmptyState } from "@/components/ui";
import { FileQuestion } from "lucide-react";

<EmptyState
  title="No files imported yet"
  description="Feed images to build triggers based on comment rules."
  icon={<FileQuestion size={24} />}
  actionLabel="Import Media"
  onAction={() => triggerImport()}
/>;
```

---

### 7. `<Timeline>`

Step connector widget to visualize logic executions inside logs drawers.

```tsx
import { Timeline } from "@/components/ui";

<Timeline
  steps={[
    {
      name: "Trigger event matched",
      status: "success",
      detail: "Keyword matched: 'promo'",
    },
    { name: "Delay pause", status: "running", detail: "Waiting 5 seconds..." },
  ]}
/>;
```

---

## 🔮 Extensibility & Maintenance Recommendations

1.  **Strict Lint Rules**: Leverage Tailwind/CSS checks or local lints to prevent raw style definitions (`style={{ color: "red" }}`) inside domain routes. Direct developers to inject variables or add a class.
2.  **Modular Shimmer Animations**: When adding a new table view or complex wizard, prioritize checking out `<LoadingSkeleton variant="table" />` rather than raw loaders.
3.  **Atomic Styling Declarations**: Keep CSS declarations inside `globals.css` instead of importing third-party libraries for simple structures to ensure performance optimization.
