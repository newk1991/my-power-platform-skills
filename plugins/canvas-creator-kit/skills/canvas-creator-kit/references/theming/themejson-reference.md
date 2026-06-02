# ThemeJSON Reference (Creator Kit Fluent Theming)

How the Creator Kit themes its Fluent code components via a single Fluent theme JSON string, and which controls accept a `Theme` property.

`Source:`
- App.OnStart `varTheme` record — `CreatorKitReferencesCanvas/SolutionPackage/src/CanvasApps/src/cat_creatorkitcontrolreferenceapp_d66f8/Src/App.fx.yaml` (lines 3-88).
- Per-control `Theme: =varTheme.themeJSON` wiring — same app, `Src/scr*.fx.yaml`.
- Canvas-component `Theme` palette records — `cat_powercatcomponentlibrary_0be3a/Src/Components/{Dialog,Panel,Header,ExpandMenu}.fx.yaml`.
- Fluent Theme Designer parsing — `cat_fluentthemedesigner_00e67/Src/Theme Designer Screen.fx.yaml` + `DataSources/varParsedTheme.json`.
- `cat_PowerCAT.ThemeDesigner/ControlManifest.xml` (theme-builder helper control).

---

## 1. The theme is a Fluent palette JSON

The Creator Kit's Fluent (v8/v9) code components are themed with a **Fluent theme JSON** whose only top-level key is `palette`. Every PCF control that supports theming exposes a `Theme` property of `of-type="Multiple"` (i.e. a multi-line text property) that receives this JSON **as a string**.

The `palette` object has these **21 keys** (verbatim, in the order used throughout the kit):

```
themePrimary, themeLighterAlt, themeLighter, themeLight, themeTertiary,
themeSecondary, themeDarkAlt, themeDark, themeDarker,
neutralLighterAlt, neutralLighter, neutralLight, neutralQuaternaryAlt,
neutralQuaternary, neutralTertiaryAlt, neutralTertiary, neutralSecondary,
neutralPrimaryAlt, neutralPrimary, neutralDark, black, white
```

> Top-level structure of the theme JSON string passed to a `Theme` property = `{ "palette": { …21 keys… } }`. No other top-level keys appear in that JSON.

### Example A — default Fluent theme JSON (`themePrimary` = `#0078d4`)

This is the exact default used by the kit:

```json
{
  "palette": {
    "themePrimary": "#0078d4",
    "themeLighterAlt": "#eff6fc",
    "themeLighter": "#deecf9",
    "themeLight": "#c7e0f4",
    "themeTertiary": "#71afe5",
    "themeSecondary": "#2b88d8",
    "themeDarkAlt": "#106ebe",
    "themeDark": "#005a9e",
    "themeDarker": "#004578",
    "neutralLighterAlt": "#faf9f8",
    "neutralLighter": "#f3f2f1",
    "neutralLight": "#edebe9",
    "neutralQuaternaryAlt": "#e1dfdd",
    "neutralQuaternary": "#d0d0d0",
    "neutralTertiaryAlt": "#c8c6c4",
    "neutralTertiary": "#a19f9d",
    "neutralSecondary": "#605e5c",
    "neutralPrimaryAlt": "#3b3a39",
    "neutralPrimary": "#323130",
    "neutralDark": "#201f1e",
    "black": "#000000",
    "white": "#ffffff"
  }
}
```

### Example B — a second theme (green primary)

Same shape, with `themePrimary` set to a green (`#107c10`) and matching ramp; only the `theme*` family changes, neutrals stay the same:

```json
{
  "palette": {
    "themePrimary": "#107c10",
    "themeLighterAlt": "#f1faf1",
    "themeLighter": "#cef0ce",
    "themeLight": "#a7e3a7",
    "themeTertiary": "#56c456",
    "themeSecondary": "#1faa1f",
    "themeDarkAlt": "#0f700f",
    "themeDark": "#0c5e0c",
    "themeDarker": "#094509",
    "neutralLighterAlt": "#faf9f8",
    "neutralLighter": "#f3f2f1",
    "neutralLight": "#edebe9",
    "neutralQuaternaryAlt": "#e1dfdd",
    "neutralQuaternary": "#d0d0d0",
    "neutralTertiaryAlt": "#c8c6c4",
    "neutralTertiary": "#a19f9d",
    "neutralSecondary": "#605e5c",
    "neutralPrimaryAlt": "#3b3a39",
    "neutralPrimary": "#323130",
    "neutralDark": "#201f1e",
    "black": "#000000",
    "white": "#ffffff"
  }
}
```

> The neutral ramp (`neutral*`, `black`, `white`) above matches the kit's default verbatim; only the `theme*` (accent) ramp is regenerated per primary color. To generate a full ramp from a single brand color, use the Fluent Theme Designer (see §4) or Microsoft's Fluent UI Theme Designer, then paste the resulting `palette` here.

---

## 2. The Creator Kit `App.OnStart` pattern (`varTheme`)

The reference app does **not** call `ParseJSON`. Instead `App.OnStart` builds a single `varTheme` record that carries the palette in three forms plus some sizing helpers, and controls read the string member `varTheme.themeJSON`:

```powerappsfl
// App.OnStart (CreatorKit reference app), verbatim shape:
Set(
    varTheme,
    {
        palette: {                       // Fluent palette as Power Fx Colors (ColorValue(...))
            themePrimary: ColorValue("#0078d4"),
            themeLighterAlt: ColorValue("#eff6fc"),
            // … all 21 keys …
            white: ColorValue("#ffffff")
        },
        paletteCSS: {                    // same 21 keys, as hex strings
            themePrimary: "#0078d4",
            // … all 21 keys …
            white: "#ffffff"
        },
        themeJSON: "{""palette"":{""themePrimary"": ""#0078d4"", … ""white"": ""#ffffff""}}",
        fontSizes: { xs:10, s:11, m:13, l:16, xl:20 },
        U: 4
    }
);
```

Members of `varTheme`:
- `palette` — the 21 Fluent colors as Power Fx `Color` values (`ColorValue(...)`). Use for canvas-native control props (`Fill`, `Color`, …).
- `paletteCSS` — the same 21 keys as hex strings. Use when you need a hex string (e.g. HTML/CSS).
- `themeJSON` — the **escaped Fluent theme JSON string** (the §1 structure). **This is what the PCF `Theme` property consumes.**
- `fontSizes` — `{ xs, s, m, l, xl }` font-size helper.
- `U` — a base spacing unit (`4`).

> If you prefer to build the theme record at runtime from a raw JSON string, `Set(varTheme, ParseJSON(yourThemeJsonText))` is a valid Power Fx alternative — but note that is **not** the literal pattern shipped in this kit. The kit defines the record inline and stores the JSON string in `varTheme.themeJSON`.

### Wiring a control to the theme

Every themeable PCF control in the reference app sets its `Theme` property to the JSON **string**:

```powerappsfl
// On any themeable PCF control:
Theme: =varTheme.themeJSON
```

For the **canvas components** (Dialog, Panel, Header, ExpandMenu), `Theme` is instead a **record** property (default value is the §1 palette as a Power Fx record, e.g. `{ palette: { themePrimary: "#0078d4", … white: "#ffffff" } }`), and the component reads members like `Theme.palette.themePrimary` and `Theme.palette.white` internally. Pass `varTheme` (the record) — not `varTheme.themeJSON` — to a canvas component's `Theme`.

---

## 3. Which controls accept a `Theme` property

Verified from each control's manifest (`<property name="Theme" of-type="Multiple" ...>`) and, for canvas components, from the custom `Theme` property in the `.fx.yaml`.

### Accept `Theme` (30)

PCF (24): Breadcrumb, Calendar, CommandBar, ContextMenu, DonutChart, Facepile, FluentDetailsList, GaugeChart, HorizontalBarChart, Icon, MaskedTextField, Nav, PeoplePicker, Persona, Picker, Pivot, ProgressIndicator, SearchBox, Shimmer, SpinButton, Spinner, StackedBarChart, SubwayNav, TagList.

Canvas components (4): Dialog, Panel, Header, ExpandMenu (each via a custom `Theme` **record** property).

### Do NOT accept `Theme` (5)

- **AutoWidthLabel** (PCF) — styled via explicit Font/Fill/Border properties.
- **KeyboardShortcuts** (PCF) — non-visual; only `KeyConfig` / `OnKey`.
- **Elevation** (PCF) — styled via `Depth`/`FillColor`/`DarkOverlay`.
- **Card** (PCF) — Fluent 9 control; no `Theme` property in its manifest.
- **ResizableTextarea** (PCF) — styled via explicit Font/Fill/Border properties.
- **Material** (canvas component) — no `Theme` property.
- **ThemeDesigner** (PCF) — it *produces* a theme rather than consuming one (see §4); its inputs are colors, not a `Theme`.

> (The task brief flagged AutoWidthLabel and KeyboardShortcuts as likely non-theme controls — confirmed — and the manifests show Elevation, Card, ResizableTextarea, ThemeDesigner and the Material canvas component also have no `Theme` property.)

---

## 4. Building a theme: ThemeDesigner control & Fluent Theme Designer app

**`ThemeDesigner` PCF control** (`cat_PowerCAT.ThemeDesigner`) is a helper that emits a Fluent theme JSON from a few base colors. Its properties (all bound):

| Property | Type | Default | Usage |
|---|---|---|---|
| `PrimaryColor` | SingleLine.Text | `#0078d4` | bound (required) |
| `TextColor` | SingleLine.Text | `#323130` | bound (required) |
| `BackgroundColor` | SingleLine.Text | `#ffffff` | bound (required) |
| `ThemeJSON` | Multiple | — | bound — the **generated** Fluent theme JSON string |

Bind `ThemeDesigner.ThemeJSON` into your `varTheme.themeJSON` (or directly into a control's `Theme`) to drive all components from three base colors.

**Fluent Theme Designer app** (`cat_fluentthemedesigner_00e67`): a standalone canvas app that takes a theme JSON, parses it into a `varParsedTheme` collection of `{ key, value }` records using `MatchAll(varThemeJSON, "…(?<key>…)…(?<value>…)…")` (a regex parse — **not** `ParseJSON`), and lets the maker preview/edit the palette. The `varParsedTheme` data source (`DataSources/varParsedTheme.json`) is therefore a writable collection of key/value pairs, not a fixed-shape record.

> Note: `cat_powercatcomponentlibrary_0be3a/Other/References/ModernThemes.json` and `Src/Themes.json` are a *separate, legacy* theming system (named color slots like `PrimaryColor1`, `ScreenBkgColor`) used by the reference app's own chrome and the component library — they are **not** the Fluent `palette` JSON that the `Theme` property consumes. Do not confuse the two: for code components, theme with the §1 `{ "palette": { … } }` JSON.
