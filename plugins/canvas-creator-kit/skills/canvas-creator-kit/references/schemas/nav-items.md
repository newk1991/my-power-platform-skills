# Creator Kit — Nav: Items schema, selection key & default selection

Purpose: Authoritative schema for the Creator Kit **Nav** (`PowerCAT.Nav`) `items` dataset — exact field names, the `SelectedKey` selection pattern, and default selection — from the PCF manifest, confirmed against real Power Fx.

Source:
- `CreatorKitCore/SolutionPackage/src/Controls/cat_PowerCAT.Nav/ControlManifest.xml`
- `CreatorKitReferencesCanvas/.../Src/Components/NavBasic.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/Components/LeftNav.fx.yaml` (navigation-driven, `colScreens`)

> In Studio added as `'Fluent Nav'.pcfdataset`; bind via the **`Items`** property.

---

## 1. Items dataset (`items`) — every field name

EXACT `property-set` names from `<data-set name="items">`. All `usage="bound"`. Case-sensitive.

| Field | Type | Required | Meaning / values |
|---|---|---|---|
| `ItemDisplayName` | SingleLine.Text | **required** | Link label. |
| `ItemKey` | SingleLine.Text | **required** | Unique key; matched against `SelectedKey`; surfaced as `Self.Selected.ItemKey`. |
| `ItemEnabled` | TwoOptions | optional | `false` = disabled link. |
| `ItemVisible` | TwoOptions | optional | `false` = hidden link. |
| `ItemIconName` | SingleLine.Text | optional | Fluent icon name, e.g. `"News"`. |
| `ItemIconColor` | SingleLine.Text | optional | CSS color for the icon, e.g. `"red"`. |
| `ItemTextColor` | SingleLine.Text | optional | CSS color for the link text. |
| `ItemParentKey` | SingleLine.Text | optional | `ItemKey` of the parent → nests this link as a child (collapsible group). |
| `ItemExpanded` | TwoOptions | optional | `true` = parent group expanded by default. |

Hierarchy is expressed with `ItemParentKey` (child → parent's `ItemKey`); top-level groups omit `ItemParentKey`.

---

## 2. Selection — `SelectedKey` (bound) + `OnSelect`

Nav exposes a **bound scalar** `SelectedKey` (SingleLine.Text) — set it to control the highlighted item, and read the clicked item from `Self.Selected.ItemKey` in `OnSelect`. This is the selection-key pattern:

```powerfx
// verbatim, NavBasic.fx.yaml
OnSelect: =Set(varNavSelected, Self.Selected.ItemKey)
SelectedKey: =varNavSelected
```

Other items can drive the selection by writing the same variable, e.g. a button: `OnSelect: =Set(varNavSelected,"news")` — the Nav then highlights the `news` item because `SelectedKey` is bound to `varNavSelected`.

Control properties: `SelectedKey` (bound), `Theme` (Multiple/JSON), `AccessibilityLabel`, `CollapseByDefault` (TwoOptions), `InputEvent` (SingleLine.Text).

### Default selection
There is no dedicated "default" property. Default selection = whatever `SelectedKey` evaluates to initially. Two real patterns:
- **App variable** seeded elsewhere: `SelectedKey: =varNavSelected` (set `varNavSelected` in `App.OnStart`/screen `OnVisible`).
- **Derived from current screen** (verbatim, `LeftNav.fx.yaml`):
  ```powerfx
  SelectedKey: =LookUp(colScreens, TargetScreen=App.ActiveScreen).ItemKey
  ```

---

## 3. Real examples

### Example A — nested groups, conditional visible/enabled/icon-color (verbatim, `NavBasic.fx.yaml`)

```powerfx
Items: |-
    =Table(
        {ItemKey:"page", ItemDisplayName:"Pages"},
        {ItemKey:"activity", ItemDisplayName:"Activity", ItemParentKey:"page"},
        {ItemKey:"news", ItemDisplayName:"News", ItemParentKey:"page", ItemVisible:chkVisibleNav.Checked},
        {ItemKey:"morepages", ItemDisplayName:"More pages"},
        {ItemKey:"settings", ItemDisplayName:"Settings", ItemParentKey:"morepages", ItemIconName:"News", ItemIconColor:If(chkCustomIconColor.Checked,"red")},
        {ItemKey:"notes", ItemDisplayName:"Notes", ItemParentKey:"morepages", ItemEnabled:chkEnableNav.Checked}
    )
OnSelect: =Set(varNavSelected, Self.Selected.ItemKey)
SelectedKey: =varNavSelected
```

### Example B — navigation menu bound to screens (verbatim, `LeftNav.fx.yaml`)

```powerfx
CollapseByDefault: =true
Items: =colScreens
OnSelect: =If(Self.Selected.TargetScreen<>App.ActiveScreen, Navigate(Self.Selected.TargetScreen))
SelectedKey: =LookUp(colScreens, TargetScreen=App.ActiveScreen).ItemKey
```
Here `colScreens` is a custom collection whose records include `ItemKey`, `ItemDisplayName` (the bound Nav fields) plus a custom `TargetScreen` field carrying the screen object. `Self.Selected` exposes all record fields, including custom ones like `TargetScreen`.
