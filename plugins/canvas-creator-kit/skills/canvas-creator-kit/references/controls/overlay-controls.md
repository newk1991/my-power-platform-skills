# Overlay Controls

Covers the Creator Kit overlay canvas components: **Dialog, Panel**.

`Source:` canvas components `cat_powercatcomponentlibrary_0be3a/Src/Components/{Dialog,Panel}.fx.yaml`. Both are canvas components (not PCF), so their interface is the set of author-defined custom properties (inputs, outputs and `On...()` event behaviors) declared at the top of the YAML.

---

## Dialog
**Type:** Canvas Component

A modal dialog overlay that takes focus and presents a title, subtitle/body and a horizontal button bar (the `Buttons` table). Use for confirmations and small choices (e.g. delete confirmation). The selected button is reported via `SelectedButton`; closing is wired to `OnCloseSelect`.

| Custom property | Kind | Notes / default |
|---|---|---|
| `OnButtonSelect()` | event | fires when a dialog button is selected |
| `OnCloseSelect()` | event | fires when the close (X) icon is selected |
| `Title` | input (text) | default `"Title"` |
| `SubTitle` | input (text) | body text |
| `Description` | input (text) | additional text |
| `Buttons` | input (Table) | button definitions: `Label`, `ButtonType` (`Button.ButtonType` Standard/Primary), `HasBorder` |
| `SelectedButton` | output (record) | `{ Label: ButtonsGallery_2.Selected.Label }` |
| `DialogWidth` | input (number) | default `640` |
| `DialogHeight` | input (number) | default `400` |
| `BorderRadius` | input (number) | default `0` |
| `OverlayColor` | input (color) | default `RGBA(0,0,0,0.4)` |
| `ContentWidth` / `ContentHeight` / `ContentX` / `ContentY` | output (number) | content-region geometry for placing your own content |
| `Theme` | input (record) | Fluent palette record (`Theme.palette.*`) |
| `OnReset` | behavior | — |

**Theme:** yes (custom record property; defaults to the standard Fluent palette — see [../theming/themejson-reference.md](../theming/themejson-reference.md)).

---

## Panel
**Type:** Canvas Component

A side panel overlay (left or right) for supplementary content — viewing details, editing settings, or complex create/edit experiences. Like Dialog it has a title, body and a button bar, plus a `PanelPosition` and content-region outputs for hosting your own controls.

| Custom property | Kind | Notes / default |
|---|---|---|
| `OnButtonSelect()` | event | fires when a panel button is selected |
| `OnCloseSelect()` | event | fires when the close (X) icon is selected |
| `Title` | input (text) | default `"Title"` |
| `Subtitle` | input (text) | body text (note lowercase `t`) |
| `Description` | input (text) | default `""` |
| `Buttons` | input (Table) | `Label`, `ButtonType`, `Visible`, `Enabled` |
| `SelectedButton` | output | `ButtonsGallery_1.Selected` |
| `PanelPosition` | input (text) | `"Right"` (default) or `"Left"` |
| `DialogWidth` | input (number) | panel width, default `400` |
| `RoundedButtons` | input (Boolean) | default `true` |
| `OverlayColor` | input (color) | default `RGBA(255,255,255,0.4)` |
| `ContentWidth` / `ContentHeight` / `ContentX` / `ContentY` | output (number) | content-region geometry |
| `Theme` | input (record) | Fluent palette record (`Theme.palette.*`) |
| `OnReset` | behavior | `Set(NotVisibleReload,true)` |

**Theme:** yes (custom record property).
