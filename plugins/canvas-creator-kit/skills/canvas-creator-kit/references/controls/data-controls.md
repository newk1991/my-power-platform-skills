# Data & Display Controls

Covers: **FluentDetailsList, Card, Elevation, Facepile, Persona** (plus the **Material** canvas component).

`Source:` PCF manifests `cat_PowerCAT.{FluentDetailsList,Card,Elevation,Facepile,Persona}/ControlManifest.xml`; canvas component `cat_powercatcomponentlibrary_0be3a/Src/Components/Material.fx.yaml`. Deep dataset schemas: [../schemas/detailslist-columns.md](../schemas/detailslist-columns.md) and [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## FluentDetailsList
**Type:** PCF (virtual) — manifest constructor `FluentDetailsList`, resx `DetailsList.1033.resx`.

A robust, information-dense grid for displaying a collection of records with sortable, resizable, multi-type columns and single/multiple selection. Use when information density matters (lists, tables, admin grids). Has two datasets: `records` (the rows) and `columns` (the column definitions, which carry the rich per-column formatting). Supports client paging for large datasets.

Key input properties:

| Property | Type | Usage |
|---|---|---|
| `SelectionType` | Enum (`None`=0, `Single`=1, `Multiple`=2) | input (required) |
| `SelectRowsOnFocus` | TwoOptions | input |
| `PageSize` | Whole.None (default 150) | input |
| `LargeDatasetPaging` | TwoOptions | input |
| `CurrentSortColumn` | SingleLine.Text | input |
| `CurrentSortDirection` | Enum (`Ascending`=0, `Descending`=1) | input |
| `Compact` | TwoOptions (default true) | input |
| `HeaderVisible` | TwoOptions (default true) | input |
| `AlternateRowColor` | SingleLine.Text | input |
| `SelectionAlwaysVisible` | TwoOptions | input |
| `RaiseOnRowSelectionChangeEvent` | TwoOptions | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

Outputs: `PageNumber`, `HasNextPage`, `HasPreviousPage`, `TotalRecords`, `TotalPages`, `EventName`, `EventColumn`, `EventRowKey`, `SortEventColumn`, `SortEventDirection`.

Datasets: `records` (`RecordKey`, `RecordCanSelect`, `RecordSelected`) and `columns` (30+ `Col*` fields). **Theme:** yes. Full column schema → [../schemas/detailslist-columns.md](../schemas/detailslist-columns.md).

---

## Card
**Type:** PCF (virtual) — manifest display key `Card_Display_Key`, Fluent 9.

A card surface that presents a title, subtitle, description, optional image and a toolbar of command buttons (the `Items` dataset). Use to present a summary "tile" of an entity with quick actions. Sizing and layout are preset via enums; height can auto-size.

| Property | Type | Usage |
|---|---|---|
| `Title` | SingleLine.Text | bound |
| `Subtitle` | Multiple | bound |
| `Description` | Multiple | bound |
| `HeaderImage` | Image | input |
| `Image` | Image | input |
| `ImagePlacement` | Enum (`Above header`/`Below header`) | input |
| `Size` | Enum (`Small`/`Medium`/`Large`) | input |
| `Alignment` | Enum (`Vertical`/`Horizontal`) | input |
| `AccessibleLabel` | SingleLine.Text | input |
| `Items` (dataset) | — | bound toolbar items (`ItemDisplayName`, `ItemKey`, `ItemIconName`, `ItemIconStyle`, `ItemAppearance`, `ItemTooltip`, `ItemVisible`, `ItemDisabled`) |

Outputs/events: `AutoHeight` (output); `OnSelect` (common event, `Self.Selected.ItemKey`); common `Height`/`Width`. **Theme:** NO — the Card manifest exposes no `Theme` property. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Elevation
**Type:** PCF (standard)

A container that draws a Fluent depth/shadow around its content, with separate resting and hover depths. Use to lift dialogs, tiles, or self-contained surfaces off the canvas. Reports hover state.

| Property | Type | Usage |
|---|---|---|
| `Depth` | Enum (`Depth0`/`Depth4`/`Depth8`/`Depth16`/`Depth64`) | input |
| `HoverDepth` | Enum (same set) | input |
| `FillColor` | SingleLine.Text (default `#ffffff`) | bound |
| `HoverFillColor` | SingleLine.Text | bound |
| `DarkOverlay` | TwoOptions | input (required) |
| `PaddingLeft` / `PaddingRight` / `PaddingTop` / `PaddingBottom` | Whole.None | bound |
| `IsHovered` | TwoOptions | **output** (required) |

**Theme:** NO — no `Theme` property in the manifest.

---

## Facepile
**Type:** PCF (virtual)

A horizontal pile of persona circles representing a list of people, with overflow and an optional add button. Use to show who has access / who is assigned. Each persona can show an image or initials and a presence badge.

| Property | Type | Usage |
|---|---|---|
| `MaxDisplayablePersonas` | Whole.None (default 5) | input |
| `PersonaSize` | Enum (`Size8`..`Size56`) | input |
| `OverflowButtonType` | Enum (`none`/`descriptive`/`downArrow`/`more`) | input (required) |
| `ImageShouldFadeIn` | TwoOptions | input |
| `ShowAddButton` | TwoOptions | input |
| `OverflowButtonAriaLabel` / `AddbuttonAriaLabel` | SingleLine.Text | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemPersonaName`, `ItemPersonaKey`, `ItemPersonaImage` (File), `ItemPersonaImageInfo`, `ItemPersonaPresence`, `IsImage`, `ItemPersonaClickable`) |

Outputs: `EventName`. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Persona
**Type:** PCF (virtual)

A single persona showing an avatar (image or initials), presence, and up to four lines of detail text. Use to represent one person. No dataset — all text is set directly via properties.

| Property | Type | Usage |
|---|---|---|
| `Text` | SingleLine.Text | input (primary text) |
| `SecondaryText` / `TertiaryText` / `OptionalText` | SingleLine.Text | input |
| `ImageUrl` | SingleLine.Text | input |
| `ImageInitials` | SingleLine.Text | input |
| `ImageAlt` | SingleLine.Text | input |
| `HidePersonaDetails` | TwoOptions | input |
| `PersonaSize` | Enum (`Size8`..`Size120`) | input |
| `Presence` | Enum (`None`/`Offline`/`Online`/`Away`/`Dnd`/`Blocked`/`Busy`) | input |
| `PersonaInitialsColor` | Enum (20 named colors, e.g. `Blue`, `Teal`, `Violet`) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |

**Theme:** yes.

---

## Material
**Type:** Canvas Component

A frosted-glass / acrylic "material" surface implemented with an HTML viewer (CSS `backdrop-filter: blur(...)` plus box-shadow). Use as a translucent background panel for layered UI. All inputs are author-defined component properties; there are no events or output properties.

| Custom property | Type | Default |
|---|---|---|
| `Blur` | number | `5` |
| `FillColor` | text (rgba) | `"rgba(100,100,100,0.1)"` |
| `BorderColor` | text (rgba) | `"rgba(255,255,255,0.1)"` |
| `BorderThickness` | number | `0` |
| `BorderRadius` | number | `8` |
| `BorderRadiusTopLeft` / `TopRight` / `BottomLeft` / `BottomRight` | number | `8` |
| `Margin` | number | `20` |
| `ShadowBlur` | number | `8` |
| `ShadowOpacity` | number | `28` |
| `ShadowXAxis` / `ShadowYAxis` | number | `0` / `0.5` |

**Theme:** NO — Material has no `Theme` property.
