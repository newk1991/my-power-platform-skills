---
name: canvas-creator-kit
description: >-
  Load ALONGSIDE canvas-apps for any Power Apps Creator Kit / PowerCAT control work
  (cat_PowerCAT.* PCF + canvas components) in a Canvas App or custom page. It is their schema
  authority - describe_control and compile_canvas 404 / report 'unknown code component' for
  them, so don't guess. Trigger on Creator Kit, PowerCAT, or any of: CommandBar,
  FluentDetailsList, Nav, Pivot, Breadcrumb, SubwayNav, ExpandMenu, Panel, Dialog, SearchBox,
  PeoplePicker, TagPicker, TagList, Calendar, ResizableTextarea, SpinButton, Facepile, Persona,
  Card, Elevation, Spinner, Shimmer, ProgressIndicator, AutoWidthLabel, Icon, DonutChart,
  GaugeChart, HorizontalBarChart, StackedBarChart, ThemeJSON. Typical asks: the Items /
  columns_Items / RecordKey formula, button/icon tables, column sort, selected row,
  filter-as-you-type, opening a Panel/Dialog from a record, the component name, or controls
  showing as blank rectangles or won't insert. Skip plain canvas apps using only standard or
  first-party modern controls.
metadata:
  requires: canvas-apps
  version: 1.0.0
  author: Microsoft Corporation
---

# Power Apps Creator Kit — Canvas Component Extension

This skill **extends `/canvas-apps`** with Creator Kit–specific knowledge. **Load both skills together.**
It does **not** repeat what `canvas-apps` already covers — Power Fx fundamentals, `.pa.yaml` syntax,
Studio navigation, layout strategy, data-source connections, standard controls, and the
`sync_canvas` → plan → build → `compile_canvas` workflow. It picks up exactly where that skill
leaves off: at the boundary of Fluent UI Creator Kit components.

**Mandatory prerequisite:** `canvas-apps` must be loaded alongside this skill. Author/compile every
Creator Kit control through the same Canvas Authoring MCP coauthoring session the parent uses.

> **The single most important fact:** Creator Kit controls are **invisible to `describe_control`**
> (it returns 404 for them — verified for CommandBar, FluentDetailsList). The parent planner's normal
> "discover the control via `describe_control`" step **does not work** for Creator Kit controls.
> **The reference files in this skill ARE the schema authority.** Read them; do not guess, and do not
> rely on live introspection for these controls.

---

## Environment prerequisites (not covered by canvas-apps)

A Creator Kit control will show as a **blank rectangle**, fail to insert, or break compile unless:

- The **CreatorKitCore** managed solution is imported into the environment (the controls are PCF code
  components shipped in that solution). Canvas components (Panel, Dialog, ExpandMenu, Header) come from
  the **Creator Kit Reference component library** (`cat_powercatcomponentlibrary_*`) — a separate import.
- **Power Apps component framework for canvas apps** is **ON** in the environment (PPAC → Environment →
  Settings → Product → Features). Without it, PCF code components render as empty boxes.
- The app lives **inside a Solution**. Code components are solution-aware; a standalone app outside a
  solution won't surface them reliably.

If a control is missing from the Insert panel, the cause is almost always one of the three above — not the formula.

---

## How Creator Kit controls appear and are authored

There are **three name forms** for each control — don't confuse them:

| Form | Example | Where it's used |
|------|---------|-----------------|
| Friendly / common name | "DetailsList" | Conversation, docs |
| Studio Insert display name | `'Fluent Details List'` | Drag-drop in Studio |
| `.pa.yaml` `ComponentName` | `cat_PowerCAT.FluentDetailsList` | The YAML the parent authors |

**In `.pa.yaml`, a Creator Kit PCF control is a code component:**

```yaml
- DetailsList1:
    Control: CodeComponent
    ComponentName: cat_PowerCAT.FluentDetailsList   # PCF controls use the cat_PowerCAT.<Name> token
    Properties:
      Items: =colEmployees
      # columns binds via the dataset property name "columns_Items"
      columns_Items: =colEmployeeColumns
      RecordKey: ="EmployeeID"
```

**A Creator Kit canvas component (Panel, Dialog, ExpandMenu, Header) is a CanvasComponent:**

```yaml
- Panel1:
    Control: CanvasComponent
    ComponentName: Panel
    ComponentLibraryUniqueName: cat_powercatcomponentlibrary_0be3a
    Properties:
      Visible: =showHidePanel
```

**Enum / choice values** use the Power Fx enum-reference syntax `='PowerCAT.<Control>.<Enum>'.<Value>`,
e.g. `='PowerCAT.FluentDetailsList.SelectionType'.Multiple`, `='PowerCAT.Pivot.RenderType'.PivotLinks`.

**Name-collision warning:** Power Apps ships **first-party FluentV9** controls that share names with Creator
Kit controls but are *different controls with different schemas* — `Breadcrumb`, `Spinner`, `SpinButton`,
`Icon`, `Header`. `describe_control "Breadcrumb"` returns the **first-party** one (Items/Selected/SelectedItems),
not the Creator Kit PowerCAT Breadcrumb. When the user means Creator Kit, use `cat_PowerCAT.<Name>` and the
schemas in this skill — never the first-party schema. (Conceptual look-alikes too: first-party `PieChart`≠CK
`DonutChart`, `BarChart`≠CK `HorizontalBarChart`, `Progress`≠CK `ProgressIndicator`, `Toolbar`≠CK `CommandBar`.)

> **Validation caveat:** Neither `describe_control` nor `compile_canvas` resolves `cat_PowerCAT.*` controls —
> `describe_control` 404s, and `compile_canvas` reports `Unknown Code Component with name 'cat_PowerCAT.X'`.
> That's an environment/static-validator limitation (the component definitions aren't available to those tools),
> **not** an error in your YAML — the genuine Creator Kit reference app emits the exact same diagnostics.
> Validate Creator Kit screens by **Preview/Play in Studio**, and trust this skill's reference files for schema.

See [references/controls/live-observations.md](references/controls/live-observations.md) for the
verified authoring syntax, the describe_control evidence, and the full collision list.

---

## Control quick reference (15 most common)

Full catalog of all 35 controls (PCF + canvas components) with key properties:
[references/controls/control-index.md](references/controls/control-index.md). Per-category detail in
`references/controls/{navigation,data,command,input,overlay,feedback,chart}-controls.md`.

| Control | Type | Purpose | Key input properties |
|---------|------|---------|----------------------|
| FluentDetailsList | PCF | Data table: sort, select, custom cells | `Items`, `columns_Items`, `RecordKey`, `SelectionType` |
| CommandBar | PCF | Toolbar w/ overflow, dividers, sub-menus | `Items`, `Theme` |
| Nav | PCF | Left navigation tree | `Items`, `SelectedKey` |
| Pivot | PCF | Tab strip | `Items`, `SelectedKey`, `RenderType` |
| Breadcrumb | PCF | Breadcrumb trail | `Items` |
| SubwayNav | PCF | Stepper / wizard progress | `Items` |
| Panel | Canvas Cmp | Slide-in surface | `Visible`, `Buttons`, `Title`, `Subtitle` |
| Dialog | Canvas Cmp | Modal dialog | `Visible`, `Buttons`, `Title`, `SubTitle` |
| ExpandMenu | Canvas Cmp | Collapsible left menu | `Visible`, `Items` |
| SearchBox | PCF | Search input | `SearchText` (output), `PlaceHolderText`, `IconName` |
| PeoplePicker | PCF | People search/select | `Suggestions_Items`, `SelectedPeople` (output) |
| TagPicker (Picker) | PCF | Tag/term picker | `Items`, `Suggestions_Items` |
| Facepile | PCF | Stacked avatars | `Items` |
| DonutChart | PCF | Donut chart | `Items` (`ItemLegend`,`ItemValue`) |
| Spinner | PCF | Loading spinner | `Label`, `SpinnerSize` |

---

## The four controls you need deeply

### 1. FluentDetailsList — `ComponentName: cat_PowerCAT.FluentDetailsList`
The data table. Two datasets: `Items` (the records) and `columns_Items` (a `Table()` of column metadata).
Full Columns schema (28 `Col*` fields) + cell types + sort/selection: **[references/schemas/detailslist-columns.md](references/schemas/detailslist-columns.md)**.

Minimal working pair (verified field names):
```powerfx
// columns_Items
Table(
    {ColName:"EmployeeID", ColDisplayName:"ID",         ColWidth:60},
    {ColName:"Name",       ColDisplayName:"Name",       ColWidth:200, ColSortable:true, ColRowHeader:true},
    {ColName:"Department", ColDisplayName:"Department", ColWidth:160, ColSortable:true},
    {ColName:"HireDate",   ColDisplayName:"Hire date",  ColWidth:120}
)
// Items
Items: =colEmployees
RecordKey: ="EmployeeID"
```
- **Cell types** (set `ColCellType`): `image`, `clickableimage`, `link`, `tag`, `indicatortag` (omit = plain text).
  Dates: there is no date-format column property — format the field in your source/`Items` (e.g. add a text
  column `Text(HireDate,"[$-en-US]mm/dd/yyyy")` and bind a column to it).
- **Selection** is read from outputs, not an OnSave: `Self.Selected` (single record), `Self.SelectedItems`
  (table). Choose mode with `SelectionType` (`'PowerCAT.FluentDetailsList.SelectionType'.None/.Single/.Multiple`).
  For a *fired* selection event, set `RaiseOnRowSelectionChangeEvent: =true` and handle `OnChange` with
  `Self.EventName="OnRowSelectionChange"` / `Self.EventRowKey`.
- **Sorting**: handle `OnChange` with `Self.EventName="Sort"`, read `Self.SortEventColumn` /
  `Self.SortEventDirection`, optionally write back `CurrentSortColumn` / `CurrentSortDirection`.

### 2. CommandBar — `ComponentName: cat_PowerCAT.CommandBar`
Toolbar. `Items` is a `Table()`; the selected item is read via **`Self.Selected.ItemKey`** (no scalar output).
Full schema (dividers, headers, sub-menus, overflow, far items): **[references/schemas/commandbar-items.md](references/schemas/commandbar-items.md)**.

```powerfx
// Items — three buttons with Fluent icons
Table(
    {ItemKey:"new",    ItemDisplayName:"New",    ItemIconName:"Add"},
    {ItemKey:"edit",   ItemDisplayName:"Edit",   ItemIconName:"Edit"},
    {ItemKey:"delete", ItemDisplayName:"Delete", ItemIconName:"Delete"}
)
// OnSelect — Switch on the selected key
Switch(Self.Selected.ItemKey,
    "new",    Notify("New clicked"),
    "edit",   Notify("Edit clicked"),
    "delete", Notify("Delete clicked"),
    Notify("Unrecognized button")
)
```
- Divider: `{ItemKey:"d1", ItemDivider:true}` (or `ItemTopDivider:true`). Section header: `ItemHeader:true`.
  Sub-menu / grouped items: child rows carry `ItemParentKey:"<parent ItemKey>"`. Overflow (…): `ItemOverflow:true`.
  Right-aligned: `ItemFarItem:true`. Icon-only: `ItemIconOnly:true`.
- **Icon names are Fluent UI v8 (Fabric) icon strings** — `Add`, `Edit`, `Delete`, `Mail`, `Share`, `Upload`,
  `MoveToFolder`, etc. (the bare icon name, not `icon:` prefixed). Browse names at
  https://developer.microsoft.com/en-us/fluentui#/styles/web/icons — do **not** use MDL2 glyph codes.

### 3. Nav — `ComponentName: cat_PowerCAT.Nav`
Left navigation. `Items` is a `Table()`; unlike CommandBar, Nav **has** a scalar `SelectedKey` you bind to a
variable. Full schema: **[references/schemas/nav-items.md](references/schemas/nav-items.md)**.

```powerfx
// Items — 5 destinations
Table(
    {ItemKey:"home",      ItemDisplayName:"Home",      ItemIconName:"Home"},
    {ItemKey:"employees", ItemDisplayName:"Employees", ItemIconName:"People"},
    {ItemKey:"reports",   ItemDisplayName:"Reports",   ItemIconName:"BarChart4"},
    {ItemKey:"settings",  ItemDisplayName:"Settings",  ItemIconName:"Settings"},
    {ItemKey:"help",      ItemDisplayName:"Help",      ItemIconName:"Help"}
)
// OnSelect — record the active key AND navigate
Set(varNavSelected, Self.Selected.ItemKey);
Switch(Self.Selected.ItemKey,
    "home",      Navigate(scrHome),
    "employees", Navigate(scrEmployees),
    "reports",   Navigate(scrReports),
    "settings",  Navigate(scrSettings),
    "help",      Navigate(scrHelp)
)
// SelectedKey — keep the highlight in sync with the variable
SelectedKey: =varNavSelected
```
- **Default selection on launch:** `App.OnStart` → `Set(varNavSelected, "home")`.
- **Keep the highlight correct when users navigate by other means:** in each screen's `OnVisible`, set the
  variable (e.g. `scrReports.OnVisible: Set(varNavSelected,"reports")`) so the Nav (bound via `SelectedKey`)
  re-highlights the active item. Parent/child items use `ItemParentKey`.

### 4. Panel & Dialog — canvas components (`ComponentLibraryUniqueName: cat_powercatcomponentlibrary_0be3a`)
Both are overlays: **Panel** slides in from the side; **Dialog** is modal. Both are driven by a boolean
**context variable** bound to `Visible`, and expose `OnCloseSelect()`, `OnButtonSelect()`, and `SelectedButton.Label`.
Patterns: **[references/powerfx/event-patterns.md](references/powerfx/event-patterns.md)**.

Pattern — open a Panel from a DetailsList row and show that row's data:
```powerfx
// 1. DetailsList: capture the selected row + open the panel (OnSelect or selection-change OnChange)
Set(varSelectedEmployee, Self.Selected); UpdateContext({showHidePanel:true})

// 2. Panel instance
Visible:        =showHidePanel
OnCloseSelect:  =UpdateContext({showHidePanel:false})      // the X button
OnButtonSelect: =If(Self.SelectedButton.Label="Ok", Notify("Saved")); UpdateContext({showHidePanel:false})

// 3. Controls INSIDE the panel read the record variable
lblName.Text:  =varSelectedEmployee.Name
lblDept.Text:  =varSelectedEmployee.Department
```
- Use `UpdateContext({showHidePanel:true/false})` (screen-scoped) or `Set(...)` (global) consistently — pick one.
  Footer buttons come from the `Buttons` table: `Table({Label:"Cancel", ButtonType:'Button.ButtonType'.Standard},{Label:"Ok", ButtonType:'Button.ButtonType'.Primary})`.
- Dialog is identical in shape; note the casing difference: Dialog uses `Title`/**`SubTitle`**, Panel uses
  `Title`/**`Subtitle`** + `PanelPosition` (`"Right"`/`"Left"`).

---

## Theming (Fluent ThemeJSON)

Almost every Creator Kit control accepts a **`Theme`** property so the whole app shares one Fluent palette.
Structure, the 21 palette keys, the full default + custom examples, and the accept/reject control list:
**[references/theming/themejson-reference.md](references/theming/themejson-reference.md)**.

**The real shipped pattern** — build the theme once in `App.OnStart`, then point every control at it:
```powerfx
// App.OnStart
Set(varTheme, {
    palette: {
        themePrimary:    ColorValue("#0078d4"),
        themeLighterAlt: ColorValue("#eff6fc"),
        /* …21 palette keys total (themeLighter … neutralDark, black, white)… */
        white:           ColorValue("#ffffff")
    },
    themeJSON: "{""palette"":{""themePrimary"":""#0078d4"", ...all 21 keys... }}"
});
```
- **PCF controls consume the JSON string:** `Theme: =varTheme.themeJSON` (the `Theme` property is text).
  Apply the *same* variable to every control so they stay in sync:
  `CommandBar.Theme = =varTheme.themeJSON`, `Nav.Theme = =varTheme.themeJSON`, `DetailsList.Theme = =varTheme.themeJSON`.
- **Canvas components** (Panel, Dialog, ExpandMenu, Header) consume the **record**: `Theme: =varTheme`.
- `ParseJSON("{...}")` is a valid alternative way to produce the record from a JSON string (e.g. one exported
  from the **ThemeDesigner**), but the kit binds the JSON string directly to PCF `Theme`.
- **Controls that do NOT accept Theme** (style them with their own color props instead): AutoWidthLabel, Card,
  Elevation, KeyboardShortcuts, ResizableTextarea, ThemeDesigner, and the Material canvas component.
- Generate a palette from a single brand color with the **Fluent Theme Designer** app (ships with the kit), or
  https://aka.ms/themedesigner.

---

## Power Fx patterns for Creator Kit

Copy-paste `Items`/`columns_Items` formulas for the 8 key controls (with real field names):
**[references/powerfx/items-formulas.md](references/powerfx/items-formulas.md)**.
Event handlers (CommandBar Switch, SearchBox→filter, DetailsList selection/sort, TagPicker add/remove,
Panel/Dialog open-close): **[references/powerfx/event-patterns.md](references/powerfx/event-patterns.md)**.

**Populate a DetailsList** from any tabular source — `Items: =colEmployees` / `=Employees` (Dataverse) /
`='My SharePoint List'`. The control doesn't care about the source; it renders whatever `Items` + `columns_Items` describe.

**Wire a SearchBox to filter a DetailsList** — SearchBox exposes **`SearchText`** (no dataset of its own):
```powerfx
// SearchBox.OnChange
Set(varSearch, Self.SearchText)
// DetailsList.Items — contains-match on Title; blank search shows everything
Filter(Projects, IsBlank(varSearch) || varSearch in Title)
```
(`X in Y` is a case-insensitive contains test; the blank guard returns all rows when the box is empty. You can
also bind `Items: =Search(Projects, SearchBox1.SearchText, "Title")` directly.)

---

## Common mistakes (Creator-Kit-specific)

1. **Trusting `describe_control` / `compile_canvas` to validate a Creator Kit control** — `describe_control` 404s and `compile_canvas` reports `Unknown Code Component 'cat_PowerCAT.X'` for every CK control (the genuine app does too). Use this skill's reference files for schema; validate visually via Studio Preview/Play, not the static compiler.
2. **Confusing a CK control with the same-named first-party FluentV9 control** (Breadcrumb, Spinner, SpinButton, Icon, Header). Use `cat_PowerCAT.<Name>` and the CK schema.
3. **Invented column properties on DetailsList.** Only the ~28 `Col*` fields exist (see schema). e.g. it's `ColName`/`ColDisplayName`/`ColSortable`/`ColCellType` — not `FieldName`/`Header`/`Sortable`. (Note the shipped samples misspell `ColMultiValueDelimiter` as `ColMultiValueDelimeter` — use the correct spelling.)
4. **Binding the Columns table to the wrong property** — the dataset property is `columns_Items`, and rows/records bind to `Items` with `RecordKey` for identity.
5. **Expecting an `OnSave`/`SelectedItem` on DetailsList.** Read `Self.Selected` / `Self.SelectedItems`; for an event use `RaiseOnRowSelectionChangeEvent` + `OnChange`.
6. **Reading CommandBar selection from a scalar.** CommandBar has none — use `Self.Selected.ItemKey` in `OnSelect` (Nav and Pivot *do* have `SelectedKey`).
7. **MDL2 glyph codes instead of Fluent UI icon names** in CommandBar/Nav (`ItemIconName:"Add"`, not `""`).
8. **Passing ThemeJSON to the wrong shape:** PCF `Theme` wants the JSON **string** (`varTheme.themeJSON`); canvas components want the **record** (`varTheme`). A raw JSON string handed to a canvas component (or a record to a PCF control) won't theme.
9. **App not in a Solution / PCF-for-canvas feature off / CreatorKitCore not imported** → controls are blank rectangles or missing from Insert. (See Environment prerequisites.)
10. **Forgetting the component library** for Panel/Dialog/ExpandMenu/Header — they're canvas components from `cat_powercatcomponentlibrary_*`, a separate import from the PCF controls.

---

## Reference map — when to read what

| Read this | When |
|-----------|------|
| `references/controls/control-index.md` | Need the full list of all 35 controls / pick a control |
| `references/controls/{navigation,data,command,input,overlay,feedback,chart}-controls.md` | Per-control properties for a category |
| `references/controls/live-observations.md` | Exact `.pa.yaml` authoring syntax, describe_control behavior, name collisions |
| `references/schemas/detailslist-columns.md` | Building a DetailsList `columns_Items` (the most complex schema) |
| `references/schemas/commandbar-items.md` | CommandBar `Items` (dividers/headers/overflow/sub-menus) |
| `references/schemas/nav-items.md` | Nav `Items` + selection key |
| `references/schemas/other-items-schemas.md` | Breadcrumb / Pivot / PeoplePicker / TagPicker / ContextMenu |
| `references/powerfx/items-formulas.md` | Copy-paste `Items`/`columns_Items` for the 8 key controls |
| `references/powerfx/event-patterns.md` | OnSelect / OnChange / selection / sort / Panel-Dialog open-close |
| `references/theming/themejson-reference.md` | ThemeJSON structure + which controls accept `Theme` |
