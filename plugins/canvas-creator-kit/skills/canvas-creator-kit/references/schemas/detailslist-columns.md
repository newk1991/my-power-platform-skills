# Creator Kit — FluentDetailsList: Columns schema, Items, selection & sort

Purpose: Authoritative schema for the Creator Kit **FluentDetailsList** (`PowerCAT.FluentDetailsList`) — the `columns` dataset field names, the `records`/Items binding, selection output, and sort event — extracted verbatim from the PCF manifest and confirmed against real Power Fx in the reference app.

Source:
- `CreatorKitCore/SolutionPackage/src/Controls/cat_PowerCAT.FluentDetailsList/ControlManifest.xml`
- `CreatorKitReferencesCanvas/.../Src/Components/DetailsListBasic.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/Components/DetailsListCellTypes.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/Components/DetailsListLayout.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/scrSearchBox.fx.yaml` (DetailsList filtered by SearchBox)
- `CreatorKitReferencesCanvas/.../Src/CanvasApps/src/cat_fluentuicanvastemplate_51940/Src/PaneListScreen.fx.yaml` (selection → pane)

> In Studio the control is added as `'Fluent Details List'.pcfdataset`. The columns dataset is bound through the property named **`columns_Items`** in .pa/.fx.yaml (the studio authoring name for the `columns` data-set). The rows dataset is bound through **`Items`** (the `records` data-set).

---

## 1. Columns dataset (`columns`) — every field name

These are the EXACT `property-set` names from the manifest's `<data-set name="columns">`. Each is `usage="bound"`. Provide them as fields of records in the `columns_Items` `Table(...)`. Names are case-sensitive.

| Field (manifest) | Type (`of-type`) | Required | Meaning / valid values (from usage) |
|---|---|---|---|
| `ColName` | SingleLine.Text | **required** | Source field name in the `records` row this column reads (e.g. `"Name"`, `"name"`, `"cat_description"`). |
| `ColDisplayName` | SingleLine.Text | **required** | Column header text. `""` for no header. |
| `ColWidth` | Whole.None | **required** | Column width in px. Often computed, e.g. `ColWidth: Self.Width - 250`. |
| `ColCellType` | SingleLine.Text | optional | Cell renderer. Observed values: `"image"`, `"clickableimage"`, `"link"`, `"tag"`, `"indicatortag"`. Omit/blank = plain text. |
| `ColHorizontalAlign` | SingleLine.Text | required* | `"left"` / `"center"` / `"right"` (also seen capitalized `"Center"`). |
| `ColVerticalAlign` | SingleLine.Text | required* | `"top"` / `"center"` (also `"Center"`, `"top"`). |
| `ColMultiLine` | TwoOptions | required* | `true` = wrap text across lines. (manifest display key `ColIsMultiLine`). |
| `ColResizable` | TwoOptions | optional | `true` = user can drag-resize the column. |
| `ColSortable` | TwoOptions | optional | `true` = header is clickable to sort (raises Sort event). |
| `ColSortBy` | SingleLine.Text | optional | Alternate field name to sort by (defaults to `ColName`). |
| `ColIsBold` | TwoOptions | optional | `true` = bold cell text. |
| `ColTagColorColumn` | SingleLine.Text | optional | Name of a row field holding the tag fill color (used by `tag`/`indicatortag`/`clickableimage`). e.g. `ColTagColorColumn:"TagColor"`. |
| `ColTagBorderColorColumn` | SingleLine.Text | optional | Name of a row field holding the tag border color. e.g. `"TagBorderColor"`. |
| `ColHeaderPaddingLeft` | Whole.None | optional | Left padding (px) of the header label. |
| `ColShowAsSubTextOf` | SingleLine.Text | optional | Render this column as sub-text under another column. Value = the OTHER column's `ColName` (e.g. `ColShowAsSubTextOf:"Name"`). |
| `ColPaddingLeft` | Whole.None | optional | Left padding (px) of the cell. |
| `ColPaddingTop` | Whole.None | optional | Top padding (px) of the cell. |
| `ColLabelAbove` | TwoOptions | optional | When sub-text: `true` = label above value. |
| `ColMultiValueDelimiter` | SingleLine.Text | optional | Delimiter for an array/multi-value field, e.g. `", "`. **See spelling note below.** |
| `ColFirstMultiValueBold` | TwoOptions | optional | `true` = first value bold in a multi-value cell. |
| `ColInlineLabel` | SingleLine.Text | optional | Inline label prefix in the cell, e.g. `ColInlineLabel:"Status:"`. |
| `ColHideWhenBlank` | TwoOptions | optional | `true` = hide the cell/sub-text when the value is blank. |
| `ColSubTextRow` | TwoOptions | optional | Sub-text row index (seen `0` and `1`). Groups sub-text columns into rows under the header column. |
| `ColAriaTextColumn` | SingleLine.Text | optional | Row field name to use for the cell's ARIA label. |
| `ColCellActionDisabledColumn` | SingleLine.Text | optional | Row field name (bool) that disables the cell action per-row. |
| `ColImageWidth` | Whole.None | optional | Image width (px) for `image`/`clickableimage` cells, e.g. `ColImageWidth:16`. |
| `ColImagePadding` | Whole.None | optional | Image padding (px). |
| `ColRowHeader` | TwoOptions | optional | `true` = this column is the row's primary/header cell (larger, used as the row title). |

`*` "required" in the manifest but practically defaulted; many real examples omit `ColHorizontalAlign`/`ColVerticalAlign`/`ColMultiLine` with no issue.

### Spelling / accuracy notes (source is the contract)
- The manifest defines **`ColMultiValueDelimiter`** (…`Delimiter`). The reference app's `DetailsListCellTypes` Power Fx actually writes **`ColMultiValueDelimeter`** (…`Delimeter`, misspelled). Both appear in the shipped sample. Use the manifest spelling `ColMultiValueDelimiter`; the misspelled key is silently ignored by the control.
- `ColImageColor` appears in `DetailsListLayout` Power Fx (`ColImageColor:"blue"`) but is **NOT** a property-set in the manifest. Treat it as unsupported/no-op; do not rely on it.

### `records` dataset (rows / `Items`) bound property-sets
From `<data-set name="records">`:

| Field | Type | Usage | Meaning |
|---|---|---|---|
| `RecordKey` | SingleLine.Text | bound | Name of the row's unique-key field. Set as a control property, e.g. `RecordKey: ="id"`. Drives `EventRowKey` and selection identity. |
| `RecordCanSelect` | TwoOptions | bound | Name of a row bool field controlling per-row selectability, e.g. `RecordCanSelect: ="selectable"`. |
| `RecordSelected` | TwoOptions | bound | Name of a row bool field for pre-selected state. |

> `RecordKey`/`RecordCanSelect`/`RecordSelected` are set as **control properties whose value is the column NAME (a string)** — they are not per-column fields inside `columns_Items`.

---

## 2. Items, selection, and sort — control properties

Key input/output properties from the manifest:

| Property | Dir | Type | Notes |
|---|---|---|---|
| `Items` | (bound `records`) | table | The row source. Can be a collection, `Search(...)`, or `SortByColumns(...)`. |
| `SelectionType` | input | Enum | `'PowerCAT.FluentDetailsList.SelectionType'.None` (0) / `.Single` (1, default) / `.Multiple` (2). |
| `SelectRowsOnFocus` | input | TwoOptions | default `false`. |
| `SelectionAlwaysVisible` | input | TwoOptions | default `false`. |
| `RaiseOnRowSelectionChangeEvent` | input | TwoOptions | default `false`. Set `true` to fire `OnChange` with `EventName="OnRowSelectionChange"` on selection. |
| `Compact` | input | TwoOptions | default `true`. |
| `HeaderVisible` | input | TwoOptions | default `true`. |
| `AlternateRowColor` | input | SingleLine.Text | CSS color string. |
| `PageSize` | input | Whole.None | default `150`. |
| `CurrentSortColumn` | input | SingleLine.Text | Controlled-sort: the column name currently sorted. |
| `CurrentSortDirection` | input | Enum | `'PowerCAT.FluentDetailsList.CurrentSortDirection'.Ascending` (0) / `.Descending` (1). |
| `Theme` | input | Multiple (JSON) | `varTheme.themeJSON`. |
| **`EventName`** | output | SingleLine.Text | Which event fired. Observed values: `"Sort"`, `"CellAction"`, `"OnRowSelectionChange"`. Read inside `OnChange`. |
| **`EventColumn`** | output | SingleLine.Text | `ColName` of the cell that raised a `CellAction`. |
| **`EventRowKey`** | output | SingleLine.Text | `RecordKey` value of the row that raised the event. |
| **`SortEventColumn`** | output | SingleLine.Text | Column the user clicked to sort (read on `EventName="Sort"`). |
| **`SortEventDirection`** | output | Enum | `'PowerCAT.FluentDetailsList.SortEventDirection'.Ascending` / `.Descending`. |
| `PageNumber` / `HasNextPage` / `HasPreviousPage` / `TotalRecords` / `TotalPages` | output | — | Paging outputs. |
| `InputEvent` | input | SingleLine.Text | Send `"SetFocus"` (+ unique suffix) to focus, `"ClearSelection"` etc. |

### Selection output — the actual names
There is **no single "SelectedItem" scalar property** in the manifest. Selection is read two ways, both used in the reference app:
- **`Self.Selected`** — the (last) selected record. Real usage: `OnSelect: =Set(varRowSelectedBasic, Self.Selected)` then `varRowSelectedBasic.Name`.
- **`Self.SelectedItems`** — the table of selected records (for `Multiple`). Real usage: `CountRows(FluentDetailsListBasic.SelectedItems)`, `…SelectedItems.name`.

### Sort event — the actual names
Sorting is event-driven via **`OnChange`** + **`EventName="Sort"`**, reading **`SortEventColumn`** and **`SortEventDirection`**, and writing back to **`CurrentSortColumn`**/**`CurrentSortDirection`** (here mirrored into vars):

```powerfx
// OnChange (verbatim, DetailsListBasic.fx.yaml)
If(
    Self.EventName = "Sort",
    Set(varSortFiles, Self.SortEventColumn);
    Set(varSortFilesAsc, Self.SortEventDirection = 'PowerCAT.FluentDetailsList.SortEventDirection'.Ascending);
);

If(Self.EventName="CellAction", Notify("Cell Action " & Self.EventRowKey));
```

```powerfx
// CurrentSortColumn / CurrentSortDirection (verbatim)
CurrentSortColumn: =varSortFiles
CurrentSortDirection: =If(varSortFilesAsc,
    'PowerCAT.FluentDetailsList.CurrentSortDirection'.Ascending,
    'PowerCAT.FluentDetailsList.CurrentSortDirection'.Descending)
```

```powerfx
// Items: search + client sort (verbatim)
Items: =SortByColumns(
    Search(colFiles, txtSearchFiles.Value, "Name"),
    varSortFiles,
    If(varSortFilesAsc, SortOrder.Ascending, SortOrder.Descending)
)
```

---

## 3. Full Columns examples (copied/adapted from the reference app)

### Example A — Basic list: image + sortable text + computed-width + sub-text (from `DetailsListBasic.fx.yaml`)
Demonstrates `image` cell, `ColSortable`, `ColResizable`, `ColRowHeader`, `ColMultiLine`, `ColShowAsSubTextOf`, `ColInlineLabel`.

```powerfx
// columns_Items
With({
    // If there is a selection column, we remove the width and the padding
    availableWidth: Self.Width - If(ddSelectionMode.Selected.Name<>"None", 32+16),
    padding: 32,
    scrollWidth: 20,
    collapsedModifiedOn: chkCollapseCols.Checked,
    multiLineDescription: chkWrapDescription.Checked
    },
    Table(
        {
            ColName:"Icon", ColDisplayName:"", ColWidth:32, ColCellType:"image", ColImageWidth:16, ColVerticalAlign:"top", ColPaddingTop:4
        },
        {
            ColName:"Name", ColDisplayName:"Name", ColSortable:true, ColWidth:200, ColRowHeader:true,
            ColResizable:true
        },
        {
            ColName:"Description", ColDisplayName:"Description", ColSortable:true,
            ColWidth: availableWidth-scrollWidth-32-(200+padding)-If(collapsedModifiedOn,0,100+padding), ColResizable:true,
            ColMultiLine: multiLineDescription
        },
        {
            ColName:"DateModified", ColDisplayName:"Date modified", ColSortable:true,
            ColWidth: If(collapsedModifiedOn,200,100), ColResizable:true, ColShowAsSubTextOf: If(collapsedModifiedOn,"Name"),
            ColInlineLabel: If(collapsedModifiedOn,"Modified:")
        }
    )
)
```
Companion control props (verbatim): `SelectionType: =ddSelectionMode.Selected.Key`, `OnSelect: =Set(varRowSelectedBasic, Self.Selected)`, `PageSize: =2000`, `Items: =SortByColumns(Search(colFiles, txtSearchFiles.Value, "Name"), varSortFiles, If(varSortFilesAsc, SortOrder.Ascending, SortOrder.Descending))`.

### Example B — Cell types showcase: link / image / clickableimage / tag / indicatortag / multi-value (from `DetailsListCellTypes.fx.yaml`)
Demonstrates every `ColCellType`, plus `ColTagColorColumn`, `ColTagBorderColorColumn`, `ColFirstMultiValueBold`, `ColMultiValueDelimeter` (note misspelling as shipped).

```powerfx
// columns_Items
Table(
    {
        ColName: "name",
        ColDisplayName: "Account name",
        ColWidth: 100,
        ColIsBold: true,
        ColCellType: "link",
        ColVerticalAlign: "Center"
    },
    {
        ColName: "city",
        ColDisplayName: "City:",
        ColShowAsSubTextOf: "name",
        ColLabelAbove: false,
        ColIsBold: false,
        ColSubTextRow: 1,
        ColVerticalAlign: "Center"
    },
    {
        ColName: "externalimage",
        ColDisplayName: "External",
        ColCellType: "image",
        ColWidth: 60,
        ColImageWidth: 60,
        ColVerticalAlign: "Center",
        ColHorizontalAlign: "Center",
        ColResizable: true
    },
    {
        ColName: "iconimage",
        ColDisplayName: "Icon",
        ColCellType: "clickableimage",
        ColWidth: 40,
        ColTagColorColumn: "TagColor",
        ColVerticalAlign: "Center",
        ColHorizontalAlign: "Center",
        ColResizable: true
    },
    {
        ColName: "svg",
        ColDisplayName: "Svg",
        ColCellType: "clickableimage",
        ColWidth: 60,
        ColVerticalAlign: "Center",
        ColHorizontalAlign: "Center",
        ColResizable: true
    },
    {
        ColName: "country",
        ColDisplayName: "Tag",
        ColCellType: "tag",
        ColWidth: 70,
        ColTagColorColumn: "TagColor",
        ColTagBorderColorColumn: "TagBorderColor",
        ColVerticalAlign: "Center",
        ColHorizontalAlign: "Center",
        ColResizable: true
    },
    {
        ColName: "country",
        ColDisplayName: "Indicator",
        ColCellType: "indicatortag",
        ColWidth: 150,
        ColTagColorColumn: "TagColor",
        ColTagBorderColorColumn: "TagBorderColor",
        ColIsBold: true,
        ColVerticalAlign: "Center",
        ColHorizontalAlign: "Center",
        ColInlineLabel: "Status:",
        ColResizable: true
    },
    {
        ColName: "tags",
        ColDisplayName: "Tag list",
        ColWidth: 250,
        ColFirstMultiValueBold: true,
        ColMultiValueDelimeter: ", "   // NOTE: manifest name is ColMultiValueDelimiter
    }
)
```
Companion props (verbatim): `Items: =colAccounts`, `RecordKey: ="id"`, `SelectionType: ='PowerCAT.FluentDetailsList.SelectionType'.Multiple`, `OnChange: =If(Self.EventName="CellAction", Notify("CellAction " & Self.EventColumn & " " & Self.EventRowKey))`.

The matching row collection `colAccounts` includes (per record): `id`, `name`, `city`, `country`, `description`, `expand`, `TagColor`, `TagBorderColor`, `externalimage`, `iconimage:"icon:SkypeCircleCheck"`, `svg`, `tags:["#PowerApps","#PowerPlatform"]`. For `image`/`clickableimage` cells the source field is a URL or `"icon:<FluentIconName>"`.

### Example C — Layout with per-row selectability (from `DetailsListLayout.fx.yaml`)
Shows `RecordCanSelect`, `RecordKey`, sub-text grouping with `ColSubTextRow`, and `ColHideWhenBlank`:

```powerfx
RecordCanSelect: ="selectable"   // row field 'selectable' (bool) gates selection
RecordKey: ="id"
SelectionType: ='PowerCAT.FluentDetailsList.SelectionType'.None
OnSelect: =If(Self.Selected.selectable, Notify($"Review {Self.Selected.name}"))
```

---

## 4. Cell-type quick reference (observed in source)

| `ColCellType` | Renders | Needs |
|---|---|---|
| (omit) | Plain text | — |
| `"link"` | Clickable text link; click raises `OnChange` `EventName="CellAction"` | — |
| `"image"` | Image from the field value (URL or `"icon:Name"`) | `ColImageWidth` recommended |
| `"clickableimage"` | Image whose click raises `CellAction` | `ColImageWidth`; optional `ColTagColorColumn` |
| `"tag"` | Pill/tag colored by `ColTagColorColumn` (+ border) | `ColTagColorColumn`, optional `ColTagBorderColorColumn` |
| `"indicatortag"` | Status dot + label; `ColInlineLabel` prefix | `ColTagColorColumn` (+ border) |
| multi-value (array field) | Comma-joined values | `ColMultiValueDelimiter`, optional `ColFirstMultiValueBold` |
