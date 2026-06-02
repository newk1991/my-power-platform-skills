# Creator Kit Control Index

Master index of all 35 in-scope Creator Kit controls (30 PCF code components + 5 canvas components). The 4 AI controls (AITeachingPopover, FluentAIAssistant, FluentAIOutputCard, Mermaid) are intentionally excluded.

`Source:` PCF manifests under `CreatorKitCore/SolutionPackage/src/Controls/cat_PowerCAT.<Name>/ControlManifest.xml`; canvas components under `CreatorKitCore/SolutionPackage/src/CanvasApps/src/cat_powercatcomponentlibrary_0be3a/Src/Components/*.fx.yaml`.

Property names below are taken verbatim from the manifests / component YAML. "Key input properties" lists a representative subset — see the per-category reference file for the full list, and `references/schemas/` for deep Items/Columns table schemas.

| Control | Type | One-line purpose | Key input properties | Reference file |
|---|---|---|---|---|
| AutoWidthLabel | PCF | Label that expands its width dynamically to fit its text. | `Text`, `FontName`, `FontSize`, `FillColor`, `BorderThickness` (+ `AutoWidth` output) | [feedback-controls.md](feedback-controls.md) |
| Breadcrumb | PCF | Trail of links showing the user's location in an app hierarchy. | `MaxDisplayedItems`, `OverflowIndex`, `Theme`, `items` dataset | [navigation-controls.md](navigation-controls.md) |
| Calendar | PCF | Inline date picker for selecting a single date. | `SelectedDateValue`, `MinDate`, `MaxDate`, `FirstDayOfWeek`, `ShowWeekNumbers`, `Theme` | [input-controls.md](input-controls.md) |
| Card | PCF | Container surface presenting a title, image, content and a toolbar of commands. | `Title`, `Subtitle`, `Description`, `Image`, `Size`, `Alignment`, `Items` dataset | [data-controls.md](data-controls.md) |
| CommandBar | PCF | Toolbar surface housing commands (and overflow) above a content region. | `Theme`, `AccessibilityLabel`, `InputEvent`, `items` dataset | [command-controls.md](command-controls.md) |
| ContextMenu | PCF | Context/contextual menu of commands triggered from a button or hover. | `Chevron`, `IconColor`, `TextAlignment`, `Theme`, `items` dataset | [command-controls.md](command-controls.md) |
| DonutChart | PCF | Circular chart showing parts of a whole as proportional slices. | `Title`, `InnerRadius`, `ShowLabelsInPercentage`, `CustomColors`, `Theme`, `items` dataset | [chart-controls.md](chart-controls.md) |
| Elevation | PCF | Drop-shadow / depth container to add material elevation to content. | `Depth`, `HoverDepth`, `FillColor`, `DarkOverlay`, `Padding*` (+ `IsHovered` output) | [data-controls.md](data-controls.md) |
| Facepile | PCF | Row of persona circles (faces) representing a list of people. | `MaxDisplayablePersonas`, `PersonaSize`, `OverflowButtonType`, `Theme`, `items` dataset | [data-controls.md](data-controls.md) |
| FluentDetailsList | PCF | Information-dense, sortable, selectable grid of records and columns. | `SelectionType`, `PageSize`, `Compact`, `Theme`, `records` + `columns` datasets | [data-controls.md](data-controls.md) |
| GaugeChart | PCF | Radial gauge showing a single value's progress toward a goal/KPI. | `ChartValue`, `MinValue`, `MaxValue`, `ChartValueFormat`, `Theme`, `items` dataset | [chart-controls.md](chart-controls.md) |
| HorizontalBarChart | PCF | Horizontal bars comparing categorical values (absolute or part-to-whole). | `Title`, `BarHeight`, `Variant`, `ChartDataMode`, `Theme`, `items` dataset | [chart-controls.md](chart-controls.md) |
| Icon | PCF | Fluent icon rendered as an icon button, action button, or plain icon. | `IconName`, `IconType`, `IconColor`, `IconSize`, `Theme` (+ `OutputEvent` output) | [control-index.md](control-index.md) (see note) |
| KeyboardShortcuts | PCF | Registers key-press handlers so keyboard shortcuts fire app logic. | `KeyConfig` (+ `OnKey` bound output) | [command-controls.md](command-controls.md) |
| MaskedTextField | PCF | Text input that enforces an input mask/format. | `Value`, `Mask`, `MaskFormat`, `Prefix`, `Suffix`, `Theme` (+ `OnChange`) | [input-controls.md](input-controls.md) |
| Nav | PCF | Vertical navigation pane with nested, collapsible links. | `SelectedKey`, `CollapseByDefault`, `Theme`, `items` dataset | [navigation-controls.md](navigation-controls.md) |
| PeoplePicker | PCF | Type-ahead picker for selecting one or more people/groups. | `PeoplePickerType`, `MaxPeople`, `MinimumSearchTermLength`, `Theme`, `Personas` + `Suggestions` datasets (+ `SelectedPeople` output) | [input-controls.md](input-controls.md) |
| Persona | PCF | Single persona showing avatar/initials, presence and detail text. | `Text`, `SecondaryText`, `ImageUrl`, `PersonaSize`, `Presence`, `Theme` | [data-controls.md](data-controls.md) |
| Picker | PCF | Tag/TagPicker base: type-ahead selection of tags from a large list. | `MaxTags`, `AllowFreeText`, `MinimumSearchTermLength`, `Theme`, `Tags` + `Suggestions` datasets (+ `TagKey`/`SearchTerm` outputs) | [input-controls.md](input-controls.md) |
| Pivot | PCF | Tab/pivot bar for switching between content views. | `SelectedKey`, `RenderType`, `RenderSize`, `Theme`, `items` dataset | [navigation-controls.md](navigation-controls.md) |
| ProgressIndicator | PCF | Linear bar showing completion of an operation (determinate or not). | `PercentComplete`, `TypeofIndicator`, `BarHeight`, `Label`, `Theme` | [feedback-controls.md](feedback-controls.md) |
| ResizableTextarea | PCF | Multi-line text input the user can resize. | `Text`, `MaxLength`, `AllowResize`, `MinHeight`/`MaxHeight`, `HintText` (+ `ResizedHeight`/`ResizedWidth` outputs) | [input-controls.md](input-controls.md) |
| SearchBox | PCF | Fluent search input with delayed change output. | `SearchText`, `PlaceHolderText`, `IconName`, `Underlined`, `DelayOutput`, `Theme` (+ `OnChange`) | [input-controls.md](input-controls.md) |
| Shimmer | PCF | Placeholder shimmer shown while content loads. | `RowCount`, `SpacebetweenShimmer`, `Theme`, `items` dataset | [feedback-controls.md](feedback-controls.md) |
| SpinButton | PCF | Numeric stepper to increment/decrement a value. | `Min`, `Max`, `Step`, `DefaultValue`, `Suffix`, `Theme` (+ `Value` bound) | [input-controls.md](input-controls.md) |
| Spinner | PCF | Indeterminate loading spinner with optional label. | `Label`, `SpinnerSize`, `SpinnerAlignment`, `LabelPosition`, `Theme` | [feedback-controls.md](feedback-controls.md) |
| StackedBarChart | PCF | Single 100%-width bar split into stacked category segments. | `Title`, `BarHeight`, `HideLegend`, `CustomColors`, `Theme`, `items` dataset | [chart-controls.md](chart-controls.md) |
| SubwayNav | PCF | Wizard/stepper visualizing the steps of a multi-step flow. | `WizardCompleteorError`, `ShowAnimation`, `ApplyDarkTheme`, `Theme`, `items` dataset (+ `Steps` output) | [navigation-controls.md](navigation-controls.md) |
| TagList | PCF | Read-only list of styled, wrapping tag labels. | `SelectedKey`, `BorderRadius`, `FontSize`, `MaxHeight`, `Theme`, `items` dataset (+ `AutoHeight` output) | [input-controls.md](input-controls.md) |
| ThemeDesigner | PCF | Helper component that emits a Fluent theme JSON from base colors. | `ThemeJSON`, `PrimaryColor`, `TextColor`, `BackgroundColor` (all bound) | [../theming/themejson-reference.md](../theming/themejson-reference.md) |
| Dialog | Canvas Component | Modal dialog overlay with title, body and a button bar. | `Title`, `SubTitle`, `Buttons`, `DialogWidth`, `DialogHeight`, `Theme` (+ `OnButtonSelect`/`OnCloseSelect`) | [overlay-controls.md](overlay-controls.md) |
| Panel | Canvas Component | Side panel overlay (left/right) for detail or edit experiences. | `Title`, `Subtitle`, `Buttons`, `PanelPosition`, `DialogWidth`, `Theme` (+ `OnButtonSelect`/`OnCloseSelect`) | [overlay-controls.md](overlay-controls.md) |
| ExpandMenu | Canvas Component | Collapsible navigation menu (like Nav) that expands/collapses width. | `Items`, `IsExpanded`, `DefaultExpandValue`, `IsNavigationEnabled`, `Theme` (+ `OnButtonSelect`/`OnExpandSelect`, `SelectedItem`) | [navigation-controls.md](navigation-controls.md) |
| Header | Canvas Component | App header bar with title, back button and left/right buttons. | `Text`, `BackButtonVisible`, `LeftButtonImage`, `RightButtonImage`, `HeaderFill`, `Theme` (+ `OnBackSelect`/`OnLeftButtonSelect`/`OnRightButtonSelect`) | [navigation-controls.md](navigation-controls.md) |
| Material | Canvas Component | Frosted-glass / acrylic material surface (blur + shadow). | `Blur`, `FillColor`, `BorderRadius`, `ShadowBlur`, `ShadowOpacity` | [data-controls.md](data-controls.md) |

> Note: **Icon** is a general-purpose PCF control and does not belong to a single category file; its full property list is in this index row above. Its manifest is `cat_PowerCAT.Icon`. Key properties: `IconName` (text, required), `IconType` (Enum: IconButon/ActionButton/Icon), `IconColor`, `HoverIconColor`, `IconSize`, `FontSize`, `Text`, `TextAlignment`, `BorderRadius`, `Theme`; outputs `OutputEvent`; input `InputEvent`. Accepts a `Theme` property.

## Theme property summary

See [../theming/themejson-reference.md](../theming/themejson-reference.md) for the full list and the `Theme: =varTheme.themeJSON` wiring pattern. Controls that do **not** accept a theme: AutoWidthLabel, Card, Elevation, KeyboardShortcuts, ResizableTextarea, ThemeDesigner (PCF) and Material (canvas).
