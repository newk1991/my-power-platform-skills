# Navigation Controls

Covers the Creator Kit navigation controls: **Nav, Pivot, Breadcrumb, ExpandMenu, SubwayNav**.

`Source:` PCF manifests `CreatorKitCore/SolutionPackage/src/Controls/cat_PowerCAT.{Nav,Pivot,Breadcrumb,SubwayNav}/ControlManifest.xml`; canvas component `cat_powercatcomponentlibrary_0be3a/Src/Components/ExpandMenu.fx.yaml`. Deep dataset schemas: [../schemas/nav-items.md](../schemas/nav-items.md) and [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Nav
**Type:** PCF (virtual)

A navigation pane that provides links to the main areas of an app or site. Supports nested items (via `ItemParentKey`), per-item icons/colors, enable/visible flags, and a collapsed mode. Use for a persistent left-hand nav. Selection is tracked through the bound `SelectedKey`.

| Property | Type | Usage |
|---|---|---|
| `SelectedKey` | SingleLine.Text | bound |
| `CollapseByDefault` | TwoOptions | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — item fields incl. `ItemDisplayName`, `ItemKey`, `ItemEnabled`, `ItemVisible`, `ItemIconName`, `ItemIconColor`, `ItemTextColor`, `ItemParentKey`, `ItemExpanded` |

Events/outputs: none beyond bound `SelectedKey` (selection raised via `OnSelect` + `SelectedKey`). **Theme:** yes. Full items schema → [../schemas/nav-items.md](../schemas/nav-items.md).

---

## Pivot
**Type:** PCF (virtual)

A pivot/tab bar for switching between content views. Renders as links or tabs (`RenderType`) at normal or large size (`RenderSize`). Items can carry an icon and a count badge. Selected tab is tracked via the bound `SelectedKey`.

| Property | Type | Usage |
|---|---|---|
| `SelectedKey` | SingleLine.Text | bound |
| `RenderType` | Enum (`PivotLinks`=0, `PivotTabs`=1) | input |
| `RenderSize` | Enum (`Normal`=0, `Large`=2) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — `ItemDisplayName`, `ItemKey`, `ItemEnabled`, `ItemVisible`, `ItemChecked`, `ItemIconName`, `ItemCount` |

**Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Breadcrumb
**Type:** PCF (virtual)

A breadcrumb trail showing the user's location in a hierarchy, with automatic overflow handling. Use above content to show drill-down paths. Items can be individually clickable.

| Property | Type | Usage |
|---|---|---|
| `MaxDisplayedItems` | Whole.None | input |
| `OverflowIndex` | Whole.None | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — `ItemDisplayName` (req), `ItemKey` (req), `ItemClickable` (TwoOptions) |

**Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## ExpandMenu
**Type:** Canvas Component

A collapsible navigation menu (conceptually a `Nav`) that toggles its own width between collapsed (46px) and expanded (221px). Designed to be used inside layout containers so the app reflows as the menu width changes. Items are supplied as a Power Fx table (record fields observed in the default sample: `Icon`, `Label`, `Screen`, `Tooltip`).

| Custom property | Kind | Notes |
|---|---|---|
| `OnButtonSelect()` | event | fires when a menu item is selected |
| `OnExpandSelect()` | event | fires when expand/collapse toggled |
| `Items` | input (Table) | menu items table (`Icon`, `Label`, `Screen`, `Tooltip`) |
| `IsExpanded` | input/output (Boolean) | current expanded state (defaults from `IsOpen`) |
| `DefaultExpandValue` | input (Boolean) | initial expanded state, default `false` |
| `IsNavigationEnabled` | input (Boolean) | default `true` |
| `SelectedItem` | output | `glExpandMenu.Selected` |
| `Theme` | input (record) | Fluent palette record (`Theme.palette.*`) |
| `Fill` | input | `ColorValue(ExpandMenu.Theme.palette.white)` |
| `OnReset` | behavior | resets `IsOpen` to `DefaultExpandValue` |

**Theme:** yes (custom record property; defaults to the standard Fluent palette — see [../theming/themejson-reference.md](../theming/themejson-reference.md)).

---

## SubwayNav
**Type:** PCF (virtual)

A subway/wizard navigation that visualizes the ordered steps of a multi-step flow, including current/complete/error states and optional sub-steps (via `ParentItemKey`). Use for guided, sequential experiences. Emits a `Steps` object output (schema driven by the hidden bound `StepsSchema`).

| Property | Type | Usage |
|---|---|---|
| `WizardCompleteorError` | Enum (`None`/`WizardComplete`/`Error`) | input |
| `ShowAnimation` | TwoOptions (default true) | input |
| `ApplyDarkTheme` | TwoOptions | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `StepsSchema` | SingleLine.Text (hidden) | bound |
| `Steps` | Object | **output** |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — `ItemLabel`, `ItemKey`, `ParentItemKey`, `ItemState` (all req), `ItemDisabled`, `ItemVisuallyDisabled`, `ItemIcon`, `ItemColor` |

**Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Header
**Type:** Canvas Component

An application header bar showing a title, an optional back button, and configurable left/right buttons (images), with a themable fill. Use as a top app chrome. (Listed here as it is navigation-adjacent chrome; also referenced from the control index.)

| Custom property | Kind | Notes |
|---|---|---|
| `OnBackSelect()` / `OnLeftButtonSelect()` / `OnRightButtonSelect()` | events | button behaviors |
| `Text` | input | header title text |
| `BackButtonVisible` | input (Boolean) | default `false` |
| `LeftButtonVisible` / `RightButtonVisible` | input (Boolean) | default `true` |
| `LeftButtonImage` / `RightButtonImage` | input (image/SVG data URI) | button glyphs |
| `HeaderFill` | input (color) | falls back to `Theme.palette.themePrimary` |
| `Color` | input (color) | title color (falls back to `Theme.palette.white`) |
| `ContentWidth` | input | default `App.Width` |
| `Theme` | input (record) | Fluent palette record |

**Theme:** yes (custom record property).
