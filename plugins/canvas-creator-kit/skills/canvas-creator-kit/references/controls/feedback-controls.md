# Feedback & Status Controls

Covers: **Spinner, Shimmer, ProgressIndicator, AutoWidthLabel**.

`Source:` PCF manifests `cat_PowerCAT.{Spinner,Shimmer,ProgressIndicator,AutoWidthLabel}/ControlManifest.xml`. Shimmer `items` schema: [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Spinner
**Type:** PCF (virtual)

An indeterminate loading spinner (animated circle) with an optional label, shown when a task duration is unknown. Use for short, indeterminate waits. Size, alignment and label position are preset via enums.

| Property | Type | Usage |
|---|---|---|
| `Label` | SingleLine.Text | input |
| `SpinnerSize` | Enum (`xSmall`=0, `Small`=1, `Medium`=2, `Large`=3) | input (required) |
| `SpinnerAlignment` | Enum (`Center`=0, `Left`=1, `Right`=2) | input (required) |
| `LabelPosition` | Enum (`Bottom`/`Top`/`Right`/`Left`) | input (required) |
| `BackgroundColor` | SingleLine.Text (default `#ffffff`) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |

**Theme:** yes.

---

## Shimmer
**Type:** PCF (virtual)

A placeholder shimmer used while content loads, configurable as multiple rows of shimmer shapes. Use as a skeleton loading state. The shape of each shimmer line is defined by the `items` dataset.

| Property | Type | Usage |
|---|---|---|
| `RowCount` | Whole.None (default 1) | input (required) |
| `SpacebetweenShimmer` | Enum (`0px`/`10px`/`20px`/`30px`/`40px`/`50px`) | input (required) |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemType` (req), `ItemHeight`, `ItemWidth`, `ItemVerticalAlign`) |

**Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## ProgressIndicator
**Type:** PCF (virtual)

A linear progress bar showing completion of an operation lasting more than ~2 seconds. Use the determinate variant when you can compute progress (`PercentComplete`); use the indeterminate variant (or a Spinner) when you cannot.

| Property | Type | Usage |
|---|---|---|
| `PercentComplete` | Whole.None (default 40) | input (required) |
| `TypeofIndicator` | Enum (`DefaultIndicator`/`IndeterminateIndicator`) | input (required) |
| `BarHeight` | Whole.None (default 2) | input (required) |
| `HideProgressBar` | TwoOptions (default false) | input |
| `Label` | SingleLine.Text | input |
| `Description` | SingleLine.Text | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |

**Theme:** yes.

---

## AutoWidthLabel
**Type:** PCF (standard)

A label that expands its width dynamically to fit its text (functionality not natively available to standard canvas labels). Use where you need a label sized exactly to its content. Reports the computed width via the `AutoWidth` output. Extensive font/fill/border styling including focus/hover/disabled states.

| Property | Type | Usage |
|---|---|---|
| `Text` | SingleLine.Text (default `Text`) | bound (required) |
| `FontName` | SingleLine.Text (default `Segoe UI`) | input |
| `FontSize` | Decimal (default 10.5) | input |
| `FontSizeUnits` | Enum (`Pt`=0, `Px`=1) | input |
| `FontColor` / `FontWeight` | SingleLine.Text | input |
| `FillColor` | SingleLine.Text | input |
| `BorderColor` | SingleLine.Text | input |
| `BorderThickness` | Whole.None (default 0) | input |
| `BorderRadius` | Whole.None | input |
| `PaddingLeft` / `PaddingRight` / `PaddingTop` / `PaddingBottom` | Whole.None (default 0) | input |
| (+ Disabled/Focus/Hover variants of font, fill, border) | SingleLine.Text / Whole.None | input |
| `AutoWidth` | Whole.None | **output** (required) — computed width |

**Theme:** NO — AutoWidthLabel has no `Theme` property; it is styled entirely via its explicit color/font/border properties.
