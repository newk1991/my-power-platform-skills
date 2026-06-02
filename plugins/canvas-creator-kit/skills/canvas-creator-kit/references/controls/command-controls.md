# Command Controls

Covers: **CommandBar, ContextMenu, KeyboardShortcuts**.

`Source:` PCF manifests `cat_PowerCAT.{CommandBar,ContextMenu,KeyboardShortcuts}/ControlManifest.xml`. Deep `items` schema (shared command-item shape): [../schemas/commandbar-items.md](../schemas/commandbar-items.md).

---

## CommandBar
**Type:** PCF (virtual)

A toolbar surface that houses commands operating on the content below it, with built-in overflow, far-items, split buttons, dividers and nested sub-items (via `ItemParentKey`). Use as the primary command surface above a list, panel or region. Best with 5-7 visible commands; push the rest to overflow.

| Property | Type | Usage |
|---|---|---|
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — see schema |

The `items` dataset is rich: `ItemDisplayName`, `ItemKey` (both required), `ItemEnabled`, `ItemVisible`, `ItemChecked`, `ItemSplit`, `ItemIconName`, `ItemIconColor`, `ItemIconOnly`, `ItemOverflow`, `ItemFarItem`, `ItemHeader`, `ItemTopDivider`, `ItemDivider`, `ItemParentKey`.

Outputs/events: selection raised via `OnSelect` (item exposed through the kit's standard selected-item pattern). **Theme:** yes. Full item schema → [../schemas/commandbar-items.md](../schemas/commandbar-items.md).

---

## ContextMenu
**Type:** PCF (virtual)

A contextual menu of commands triggered from a button, hover or focus, supporting submenus (`ItemParentKey`), selection checks, icons, headers and dividers. Use for right-click / overflow / "more actions" menus. Extensive styling props for icon, font, fill and border (including hover variants).

| Property | Type | Usage |
|---|---|---|
| `Chevron` | TwoOptions (default true) | input |
| `IconColor` / `HoverIconColor` | SingleLine.Text | input |
| `IconSize` | Whole.None | input |
| `FontSize` | Whole.None | input |
| `FontColor` / `HoverFontColor` | SingleLine.Text | input |
| `FillColor` / `HoverFillColor` | SingleLine.Text | input |
| `BorderColor` / `HoverBorderColor` | SingleLine.Text | input |
| `BorderRadius` | Whole.None | input |
| `TextAlignment` | Enum (`Center`=0, `Left`=1, `Right`=2) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound — `ItemDisplayName`, `ItemKey`, `ItemEnabled`, `ItemVisible`, `ItemChecked`, `ItemIconName`, `ItemIconColor`, `ItemIconOnly`, `ItemHeader`, `ItemTopDivider`, `ItemDivider`, `ItemParentKey` |

**Theme:** yes. Item schema → [../schemas/commandbar-items.md](../schemas/commandbar-items.md).

---

## KeyboardShortcuts
**Type:** PCF (standard)

A non-visual control that registers key-press handlers so keyboard shortcuts can run app logic inside canvas apps / custom pages. Configure the key combinations via `KeyConfig`; the bound `OnKey` output carries which shortcut fired so you can branch your `OnChange`/logic. Note: focus must be inside the app for shortcuts to fire (some combos are reserved by Power Apps Studio and the browser).

| Property | Type | Usage |
|---|---|---|
| `KeyConfig` | SingleLine.Text | input (required) — shortcut configuration |
| `OnKey` | SingleLine.Text | bound (required) — **the key/shortcut that fired** |

**Theme:** NO — KeyboardShortcuts has no `Theme` property (it is non-visual).
