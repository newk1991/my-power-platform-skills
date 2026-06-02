# Chart Controls

Covers: **DonutChart, GaugeChart, HorizontalBarChart, StackedBarChart**.

`Source:` PCF manifests `cat_PowerCAT.{DonutChart,GaugeChart,HorizontalBarChart,StackedBarChart}/ControlManifest.xml` (all Fluent 8 virtual controls). Deep chart `items` schemas: [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

> Common pattern: each chart binds an `items` dataset, exposes `Theme` (Multiple), and offers a `CustomColors` (TwoOptions) flag — when on, per-item color comes from the item's `ItemColor` field. Charts also set common `Height`/`Width` defaults.

---

## DonutChart
**Type:** PCF (virtual)

A donut chart showing parts of a whole as proportional slices — best for showing each part's percentage of a total when change over time is not important. Labels can render as percentages; a value can be shown inside the ring.

| Property | Type | Usage |
|---|---|---|
| `Title` | SingleLine.Text | input |
| `InnerRadius` | Whole.None (default 35) | input |
| `HideLabel` | TwoOptions (default false) | input (required) |
| `HideTooltip` | TwoOptions (default false) | input |
| `ShowLabelsInPercentage` | TwoOptions (default true) | input |
| `ValueInsideDonut` | SingleLine.Text | input |
| `CustomColors` | TwoOptions (default false) | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemKey`, `ItemLegend`, `ItemValue` (Whole.None), `ItemColor` — all required) |

Common: `Height`/`Width` default 350. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## GaugeChart
**Type:** PCF (virtual)

A radial gauge showing how a single value progresses toward a goal/KPI, with min/max labels and a legend. The arc shading shows progress; the value inside the arc shows the current value (as percentage or fraction).

| Property | Type | Usage |
|---|---|---|
| `Title` | SingleLine.Text | input |
| `Sublabel` | SingleLine.Text | input |
| `ChartValue` | Whole.None | input |
| `MinValue` | Whole.None | input |
| `MaxValue` | Whole.None | input |
| `ChartValueFormat` | Enum (`Percentage`=0, `Fraction`=1) | input |
| `HideMinMax` | TwoOptions (default false) | input |
| `HideLegend` | TwoOptions (default false) | input |
| `CustomColors` | TwoOptions (default false) | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemLegend`, `ItemSize` (Whole.None), `ItemColor` — all required) |

Common: `Height`/`Width` default 400. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## HorizontalBarChart
**Type:** PCF (virtual)

A horizontal bar chart comparing categorical values, useful when category labels are long. Supports an absolute scale or a part-to-whole variant, with data shown as default/fraction/percentage.

| Property | Type | Usage |
|---|---|---|
| `Title` | SingleLine.Text | input |
| `BarHeight` | Whole.None (default 15) | input |
| `Variant` | Enum (`AbsoluteScale`=0, `PartToWhole`=1) | bound |
| `ChartDataMode` | Enum (`Default`/`Fraction`/`Percentage`) | bound |
| `HideLabels` | TwoOptions (default false) | input (required) |
| `HideTooltip` | TwoOptions (default false) | input |
| `CustomColors` | TwoOptions (default false) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemTitle`, `ItemLegend`, `ItemValue`, `ItemTotalValue`, `ItemXPopover`, `ItemYPopover`, `ItemColor` — all required) |

Common: `Height`/`Width` default 400. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## StackedBarChart
**Type:** PCF (virtual) — manifest constructor `StackedBarChart`, resx `StackBarChart.1033.resx`. (Also referred to as HorizontalBarChartStacked.)

A single 100%-width horizontal bar split into stacked category segments (the segments sum to 100% of the bar). Use to show composition of one total across categories.

| Property | Type | Usage |
|---|---|---|
| `Title` | SingleLine.Text | input |
| `BarHeight` | Whole.None (default 15) | input |
| `BarBackgroundColor` | SingleLine.Text | input |
| `HideLegend` | TwoOptions (default false) | input |
| `HideTooltip` | TwoOptions (default false) | input |
| `CustomColors` | TwoOptions (default false) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemTitle`, `ItemKey`, `ItemValue` (Whole.None) — required; `ItemColor`, `ItemCallout` — optional) |

Common: `Height` default 180, `Width` default 350. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).
