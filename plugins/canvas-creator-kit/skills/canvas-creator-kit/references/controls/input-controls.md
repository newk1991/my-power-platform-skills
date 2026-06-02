# Input Controls

Covers: **SearchBox, PeoplePicker, Picker (TagPicker), TagList, Calendar, ResizableTextarea, SpinButton, MaskedTextField**.

`Source:` PCF manifests `cat_PowerCAT.{SearchBox,PeoplePicker,Picker,TagList,Calendar,ResizableTextarea,SpinButton,MaskedTextField}/ControlManifest.xml`. Deep dataset schemas (PeoplePicker / Picker / TagList items): [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## SearchBox
**Type:** PCF (virtual)

A Fluent search input with an icon, placeholder, optional underline style and a delayed change output. Use as a filter/search field. The current text is the bound `SearchText`; changes raise the common `OnChange`.

| Property | Type | Usage |
|---|---|---|
| `SearchText` | SingleLine.Text | bound |
| `PlaceHolderText` | SingleLine.Text (default `Search`) | input |
| `IconName` | SingleLine.Text (default `Search`) | input |
| `Underlined` | TwoOptions | input |
| `DisableAnimation` | TwoOptions | input |
| `DelayOutput` | TwoOptions | input |
| `BorderColor` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

Events: `OnChange` (common event). **Theme:** yes.

---

## PeoplePicker
**Type:** PCF (virtual)

A type-ahead picker for selecting one or more people/groups. You supply candidate `Suggestions` and the currently selected `Personas` (both datasets); the control raises `OnSearch` as the user types so you can query a source, and emits the chosen set via the `SelectedPeople` object output. Three layout variants via `PeoplePickerType`.

| Property | Type | Usage |
|---|---|---|
| `PeoplePickerType` | Enum (`NormalPeoplePicker`/`CompactPeoplePicker`/`ListPeoplePicker`) | input (required) |
| `MaxPeople` | Whole.None (default 10) | input |
| `MinimumSearchTermLength` | Whole.None (default 3) | input |
| `ShowSecondaryText` | TwoOptions | input |
| `Error` | TwoOptions | input |
| `HintText` | SingleLine.Text (default `Search`) | input |
| `SuggestionsHeaderText` / `NoResultFoundMessage` / `SearchTermToShortMessage` | SingleLine.Text | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

Datasets: `Personas` (`PersonaKey`, `PersonaName`, `PersonaImgUrl`, `PersonaImageAlt`, `PersonaPresence`, `PersonaOOF`, `PersonaRole`) and `Suggestions` (`Suggestion*` equivalents). Outputs: `SelectedPeople` (Object, required), `SearchText`, `AutoHeight`. Events: `OnSearch`, `OnBlur`, `OnFocus`. **Theme:** yes. Schemas → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Picker (TagPicker)
**Type:** PCF (virtual) — manifest constructor `Picker`, resx `TagPicker.1033.resx`. This is the TagPicker base.

A type-ahead picker for selecting one or more tags/items from a large list, with optional free-text entry. You supply `Suggestions` and the bound `Tags` (selected), and read back the last tag interaction via output properties. Heavily stylable per-tag and per-suggestion.

| Property | Type | Usage |
|---|---|---|
| `MaxTags` | Whole.None (default 10) | input (required) |
| `AllowFreeText` | TwoOptions | input |
| `MinimumSearchTermLength` | Whole.None (default 3) | input |
| `TagMaxWidth` | Decimal (default 200) | input |
| `HintText` | SingleLine.Text (default `Search`) | input |
| `NoSuggestionFoundMessage` / `SearchTermToShortMessage` | SingleLine.Text | input |
| `Error` | TwoOptions | input |
| `FontSize` / `BorderRadius` / `ItemHeight` | Whole.None | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

Datasets: `Tags` (`TagsKey`, `TagsDisplayName`, `TagsError`, plus `Tags*` color fields) and `Suggestions` (`SuggestionsKey`, `SuggestionsDisplayName`, `SuggestionsSubDisplayName`, plus color fields). Outputs: `TagEvent`, `TagKey`, `TagDisplayName`, `SearchTerm`, `AutoHeight`. **Theme:** yes. Schemas → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## TagList
**Type:** PCF (virtual)

A read-only, wrapping list of styled tag labels (auto-width labels shown one after another), emitting an `AutoHeight` output so content below can reflow. Use to display a set of tags/chips where horizontal space is limited.

| Property | Type | Usage |
|---|---|---|
| `SelectedKey` | SingleLine.Text | bound |
| `BorderRadius` | Whole.None | input |
| `TextAlignment` | Enum (`Center`=0, `Left`=1, `Right`=2) | input |
| `FontSize` | Whole.None | input |
| `ItemHeight` | Whole.None | input |
| `MaxHeight` | Whole.None | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `Theme` | Multiple | input |
| `items` (dataset) | — | bound (`ItemDisplayName`, `ItemKey`, `ItemEnabled`, `ItemVisible`, `ItemIconName`, `ItemIconColor`, `ItemTextColor`, `ItemBackgroundColor`, `ItemBorderColor`, `ItemIconOnly`) |

Outputs: `AutoHeight`. **Theme:** yes. Items schema → [../schemas/other-items-schemas.md](../schemas/other-items-schemas.md).

---

## Calendar
**Type:** PCF (virtual)

An inline calendar for picking a single date, with month/day pickers, min/max bounds, week numbers, "go to today", and configurable first day of week. The selected date is the bound `SelectedDateValue`.

| Property | Type | Usage |
|---|---|---|
| `SelectedDateValue` | DateAndTime.DateOnly | bound (required) |
| `MinDate` / `MaxDate` | DateAndTime.DateOnly | input |
| `FirstDayOfWeek` | Enum (`Sunday`..`Saturday`) | input (required) |
| `ShowGoToToday` | TwoOptions (default true) | input |
| `MonthPickerVisible` / `DayPickerVisible` | TwoOptions (default true) | input |
| `HighlightSelectedMonth` | TwoOptions (default true) | input |
| `HighlightCurrentMonth` | TwoOptions (default false) | input |
| `ShowSixWeeksByDefault` | TwoOptions (default false) | input |
| `ShowWeekNumbers` | TwoOptions (default false) | input |
| `BackgroundColor` | SingleLine.Text (default `#ffffff`) | input |
| `Language` | SingleLine.Text | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

**Theme:** yes. (No reference-app demo screen exists for Calendar; details above are from the manifest.)

---

## ResizableTextarea
**Type:** PCF (standard)

A multi-line text input that the user can resize (both/vertical/horizontal/none), reporting back the resized dimensions. Use for free-form content the user may want more room to read or edit. Extensive font/border/fill styling, including focus/hover/disabled states.

| Property | Type | Usage |
|---|---|---|
| `Text` | strings type-group (Text/TextArea/Multiple) | bound (required) |
| `Default` | strings type-group | bound |
| `MaxLength` | Whole.None | input |
| `AllowResize` | Enum (`None`=0, `Both`=1, `Vertical`=2, `Horizontal`=3) | input |
| `EnableSpellCheck` | Enum (`No`=0, `Yes`=1) | input |
| `HintText` / `EmptyPlaceholderText` | SingleLine.Text | input |
| `DefaultHeight` / `DefaultWidth` | Whole.None | input |
| `MinHeight` / `MaxHeight` / `MinWidth` / `MaxWidth` | Whole.None | input |
| `RenderBorderStyle` | Enum (`Normal`=0, `Centered`=1) | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | bound |

Outputs: `ResizedHeight`, `ResizedWidth` (bound). **Theme:** NO — ResizableTextarea has no `Theme` property; it is styled via its many explicit color/font properties instead.

---

## SpinButton
**Type:** PCF (virtual)

A numeric stepper that lets the user nudge a value up/down by a step within min/max bounds, with an optional label, icon and suffix. The current value is the bound (hidden) `Value`.

| Property | Type | Usage |
|---|---|---|
| `Min` | Whole.None (default 0) | input |
| `Max` | Whole.None (default 100) | input |
| `Step` | Whole.None (default 1) | input |
| `DefaultValue` | SingleLine.Text (default `0`) | input |
| `Label` | SingleLine.Text | input |
| `Suffix` | SingleLine.Text | input |
| `IconName` | SingleLine.Text | input |
| `Error` | TwoOptions | input |
| `DelayOutput` | TwoOptions | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Value` | SingleLine.Text | bound (hidden) — current value |
| `Theme` | Multiple | input |

**Theme:** yes.

---

## MaskedTextField
**Type:** PCF (virtual)

A text input that enforces an input mask/format (e.g. phone numbers, codes), with optional prefix/suffix and an error message. The masked value is the bound `Value`; changes raise the common `OnChange`.

| Property | Type | Usage |
|---|---|---|
| `Value` | SingleLine.Text | bound (required) |
| `Mask` | SingleLine.Text (default 35 `*`) | input |
| `MaskFormat` | SingleLine.Text (default a regex char class) | input |
| `Prefix` / `Suffix` | SingleLine.Text | input |
| `ErrorMessage` | SingleLine.Text | input |
| `DelayOutput` | TwoOptions | input |
| `AccessibilityLabel` | SingleLine.Text | input |
| `InputEvent` | SingleLine.Text | input |
| `Theme` | Multiple | input |

Events: `OnChange` (common event). **Theme:** yes. (No reference-app demo screen exists for MaskedTextField; details above are from the manifest.)
