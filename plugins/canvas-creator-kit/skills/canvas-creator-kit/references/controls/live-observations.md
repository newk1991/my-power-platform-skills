# Live Authoring-Session Observations (empirical ground truth)

**Purpose:** Record what the Canvas Authoring MCP reports for the live ground-truth app, and the design-shaping facts it reveals. This is the empirical layer of Phase 1, gathered via the MCP (authoritative for control schemas) rather than browser screenshots.

**Session:** Connected via `canvas-authoring` MCP to environment `1e30dbee-8302-ea27-86cc-a0f19e0bcc15`, app `f7b4e3ae-8d28-42a3-a334-7116ce7aac9b` (the "all Creator Kit controls installed" reference app). Method: `list_controls`, `describe_control`.

---

## Finding 1 — `list_controls` returns first-party controls only (122)

The session lists **122 controls**, all **first-party**: standard (Button, Gallery, Label, Image, Timer…), **FluentV9 modern** (ModernButton, ModernTextInput, ModernDataGrid, Avatar, Badge, TabList…), and Classic/* variants.

The Creator Kit PCF code components are **NOT listed by their Creator Kit names** — absent: CommandBar, FluentDetailsList, Nav, Pivot, Facepile, DonutChart, GaugeChart, HorizontalBarChart, StackedBarChart, Calendar, PeoplePicker, TagList, Card, Elevation, ContextMenu, SubwayNav, ProgressIndicator, ResizableTextarea, SearchBox, Persona, etc.

## Finding 2 — `describe_control` cannot introspect Creator Kit controls

| Control queried | Result |
|---|---|
| `Breadcrumb` | ✅ resolves — but it's the **first-party FluentV9 Breadcrumb**, not CK |
| `Spinner` | ✅ resolves — **first-party FluentV9 Spinner**, not CK |
| `CommandBar` | ❌ **HTTP 404 — "Control 'CommandBar' not found."** |
| `FluentDetailsList` | ❌ **HTTP 404 — "Control 'FluentDetailsList' not found."** |

**Implication (design-shaping):** The parent `canvas-app` planner's normal discovery flow (`describe_control`) **fails for Creator Kit controls**. The `canvas-creator-kit` skill's own `references/schemas/*` and `references/powerfx/*` files (sourced from the packaged manifests + reference Canvas App) are the **authoritative schema source** — the skill must instruct authors NOT to rely on `describe_control` for CK controls.

## Finding 3 — Name-collision hazard with first-party Fluent controls

Several first-party controls share a **name** with a Creator Kit control but are **different controls with different schemas**. Authors (and the planner) must disambiguate.

**Exact-name collisions present in the first-party catalog:** `Breadcrumb`, `Spinner`, `SpinButton`, `Icon`, `Header`.

Example — the two "Breadcrumb"s are not the same:
- **First-party FluentV9 Breadcrumb** (from `describe_control`): inputs `Items` (Table), `DefaultSelectedItems` (Table), `OnChange`, `OnSelect`; outputs `Selected` (Record), `SelectedItems` (Table).
- **Creator Kit `PowerCAT.Breadcrumb`** (PCF): has its own `Items` schema (see `../schemas/other-items-schemas.md`) and `OnSelect` semantics — different field names.

Example — first-party FluentV9 `Spinner` exposes `Appearance`, `SpinnerSize`, `Label`, `LabelPosition`, `SpinnerColor`, `TrackColor` — a *loading spinner*; the CK `Spinner` PCF is configured differently (see `feedback-controls.md`).

**Conceptual overlaps** (different names, similar role — don't substitute): first-party `PieChart` vs CK `DonutChart`; `BarChart` vs CK `HorizontalBarChart`/`StackedBarChart`; `Progress` vs CK `ProgressIndicator`; `TabList`/`ModernTabList` vs CK `Pivot`; `Toolbar` vs CK `CommandBar`; `DataTable`/`ModernDataGrid` vs CK `FluentDetailsList`; `Avatar`/`Badge` vs CK `Persona`/`Facepile`.

## Finding 4 — authoritative `.pa.yaml` authoring syntax (RESOLVED via `sync_canvas`)

`sync_canvas` of the live app produced 33 `.pa.yaml` files. The exact way Creator Kit controls are instantiated in the coauthoring `.pa.yaml` format:

**Creator Kit PCF code component** — `Control: CodeComponent` + `ComponentName: cat_PowerCAT.<Name>`:
```yaml
- DonutChart1:
    Control: CodeComponent
    ComponentName: cat_PowerCAT.DonutChart
    Properties:
      Height: =320
      InnerRadius: =sliderDonutInnerRadius.Value
      Items: |-
        =Table(
            { ItemLegend: "Leaders", ItemValue: 20 },
            { ItemLegend: "Team",    ItemValue: 36 },
            { ItemLegend: "Other",   ItemValue: 54 }
        )
      Width: =Parent.Width
```

**Creator Kit canvas component** (Dialog, Panel, ExpandMenu, Header) — `Control: CanvasComponent` + `ComponentName: <Name>` + `ComponentLibraryUniqueName: cat_powercatcomponentlibrary_0be3a`:
```yaml
- Header_4:
    Control: CanvasComponent
    ComponentName: Header
    ComponentLibraryUniqueName: cat_powercatcomponentlibrary_0be3a
    Properties:
      ContentWidth: =App.Width
```

**Enum / choice values** use the Power Fx enum-reference syntax `='PowerCAT.<Control>.<EnumName>'.<Value>`, e.g. `='PowerCAT.Elevation.Depth'.Depth4`, `='PowerCAT.Pivot.RenderType'.PivotLinks`, `='PowerCAT.FluentDetailsList.SortEventDirection'.Ascending`.

## Finding 5 — the real theming pattern (from live `App.OnStart`)

The app does **NOT** use `Set(varTheme, ParseJSON(...))`. `App.OnStart` builds an inline record and the app theme is the standard `PowerAppsTheme`:
```
Set(varTheme, {
  palette: { themePrimary: ColorValue("#0078d4"), themeLighterAlt: ColorValue("#eff6fc"), /* …21 keys… */ white: ColorValue("#ffffff") },
  paletteCSS: { themePrimary: "#0078d4", /* …hex strings… */ },
  themeJSON: "{""palette"":{""themePrimary"": ""#0078d4"", …}}",
  fontSizes: { xs:10, s:11, m:13, l:16, xl:20 },
  U: 4
});
// App.Theme = =PowerAppsTheme
```
- **PCF controls** consume the JSON **string**: `Theme: =varTheme.themeJSON` (the `Theme` property is `of-type="Multiple"` = text).
- **Canvas components** (Dialog/Panel/Header/ExpandMenu) consume the **record**: `Theme: =varTheme`.
- The Fluent theme JSON has exactly one top-level key, `palette`, with 21 color keys (themePrimary … white). `ParseJSON(jsonString)` is a valid alternative way to produce the record, but the shipped kit binds the JSON string directly to PCF `Theme`.
- `varTheme.U` (spacing unit, =4) and `varTheme.fontSizes.<size>` are used for sizing/typography across the reference app.

## QA — field names verified against manifests (zero-hallucination gate)

Confirmed by `-o` grep of the actual `ControlManifest.xml`:
- **FluentDetailsList** `columns` set: ColName, ColDisplayName, ColWidth, ColCellType, ColHorizontalAlign, ColVerticalAlign, ColMultiLine, ColResizable, ColSortable, ColSortBy, ColIsBold, ColTagColorColumn, ColTagBorderColorColumn, ColHeaderPaddingLeft, ColShowAsSubTextOf, ColPaddingLeft, ColPaddingTop, ColLabelAbove, ColMultiValueDelimiter, ColFirstMultiValueBold, ColInlineLabel, ColHideWhenBlank, ColSubTextRow, ColAriaTextColumn, ColCellActionDisabledColumn, ColImageWidth, ColImagePadding, ColRowHeader; `records`: RecordKey, RecordCanSelect, RecordSelected; sort/selection: CurrentSortColumn, RaiseOnRowSelectionChangeEvent, SortEventColumn, SortEventDirection; + Theme. (Shipped Power Fx misspells `ColMultiValueDelimiter` as `ColMultiValueDelimeter` — a no-op; manifest spelling is correct.)
- **CommandBar** `items`: ItemDisplayName, ItemKey, ItemEnabled, ItemVisible, ItemChecked, ItemSplit, ItemIconName, ItemIconColor, ItemIconOnly, ItemOverflow, ItemFarItem, ItemHeader, ItemTopDivider, ItemDivider, ItemParentKey; + Theme.
- **Nav** `items`: ItemDisplayName, ItemKey, ItemEnabled, ItemVisible, ItemIconName, ItemIconColor, ItemTextColor, ItemParentKey, ItemExpanded; + scalar SelectedKey; + Theme.

## Finding 6 — `compile_canvas` cannot resolve Creator Kit components (Phase 7)

Authoring a screen with the skill's exact syntax and running `compile_canvas` on the synced app returned 230 errors — **all** of the form `Unknown Code Component with name 'cat_PowerCAT.X'` or `Could not find Canvas Component with name 'Y'`. These hit the **genuine, known-good reference screens equally** (`scrDonut` → `cat_PowerCAT.DonutChart` unknown; `scrCommandBar` → `CommandBarColors` not found, etc.).

The authored test screen (`scrSkillTest`) produced **only** the 2 expected `cat_PowerCAT.CommandBar` / `cat_PowerCAT.FluentDetailsList` "unknown component" diagnostics and **no** YAML-structure, formula, or property errors — confirming the `Control: CodeComponent` + `ComponentName` instantiation, the `|-` block `Items`/`columns_Items`/`OnSelect` formulas, `RecordKey`, `SelectionType` enum, and `Theme` binding all parse correctly.

**Takeaway:** `compile_canvas` (a static validator) and `describe_control` lack the Creator Kit component definitions, so they cannot validate `cat_PowerCAT.*` usage — this is an environment limitation that affects every Creator Kit app equally, **not** a defect in the generated YAML. Validate Creator Kit screens via **Studio Preview/Play**; rely on the manifest-verified reference files for schema correctness.

---

*Note:* Visual/behavioral screenshots (clicking buttons, sorting DetailsList, opening a Panel) can be added via the Playwright MCP in Phase 7 if a visual reference is wanted; the schema-level truth above comes from the authoring service directly.
