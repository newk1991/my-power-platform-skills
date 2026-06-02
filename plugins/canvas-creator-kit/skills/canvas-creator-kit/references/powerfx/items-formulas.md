# Creator Kit — copy-paste Items / Columns formulas (8 controls)

Purpose: Ready-to-paste `Items` / `columns_Items` formulas for CommandBar, Nav, FluentDetailsList, Breadcrumb, Pivot, SearchBox, PeoplePicker, TagPicker — using the REAL field names from the reference app. No pseudocode.

Source (Power Fx, all real):
- CommandBar: `…/Src/Components/CommandBarOverflowItems.fx.yaml`, `CommandBarColors.fx.yaml`
- Nav: `…/Src/Components/NavBasic.fx.yaml`, `LeftNav.fx.yaml`
- FluentDetailsList: `…/Src/Components/DetailsListBasic.fx.yaml`, `DetailsListCellTypes.fx.yaml`
- Breadcrumb: `…/Src/Components/BreadcrumbBasic.fx.yaml`
- Pivot: `…/Src/Components/PivotItemStyles.fx.yaml`
- SearchBox: `…/Src/scrSearchBox.fx.yaml`
- PeoplePicker: `…/Src/Components/PeoplePickerO365.fx.yaml`
- TagPicker (Picker): `…/Src/Components/TagPickerBasic.fx.yaml`

> Studio control names (drag-drop): `'Fluent Command Bar'`, `'Fluent Nav'`, `'Fluent Details List'`, `'Fluent Breadcrumb'`, `'Fluent Pivot'`, `'Fluent SearchBox'`, `'Fluent PeoplePicker'`, `'Fluent Picker'` — all `.pcfdataset` except SearchBox.

---

## 1. CommandBar — `Items`
Field names: `ItemKey`, `ItemDisplayName`, `ItemIconName`, `ItemIconColor`, `ItemParentKey`, `ItemOverflow`, `ItemFarItem`, `ItemIconOnly`.

```powerfx
Table(
    {ItemKey:"newItem", ItemDisplayName:"New", ItemIconName:"Add"},
    {ItemKey:"emailMessage", ItemDisplayName:"Email message", ItemIconName:"Mail", ItemParentKey:"newItem"},
    {ItemKey:"calendarEvent", ItemDisplayName:"Calendar event", ItemIconName:"Calendar", ItemParentKey:"newItem"},

    {ItemKey:"upload", ItemDisplayName:"Upload", ItemIconName:"Upload"},
        {ItemKey:"uploadfile", ItemDisplayName:"File", ItemParentKey:"upload"},
        {ItemKey:"uploadfolder", ItemDisplayName:"Folder", ItemParentKey:"upload"},

    {ItemKey:"share", ItemDisplayName:"Share", ItemIconName:"Share"},
    {ItemKey:"download", ItemDisplayName:"Download", ItemIconName:"Download"},

    // Force these items into the overflow (…) menu
    {ItemKey:"move", ItemDisplayName:"Move to...", ItemIconName:"MoveToFolder", ItemOverflow:true},
    {ItemKey:"copy", ItemDisplayName:"Copy to...", ItemIconName:"Copy", ItemOverflow:true},
    {ItemKey:"rename", ItemDisplayName:"Rename...", ItemIconName:"Edit", ItemOverflow:true},

    // Far (right-aligned) icon-only items
    {ItemKey:"tile", ItemDisplayName:"Grid view", ItemIconName:"Tiles", ItemIconOnly:true, ItemFarItem:true},
    {ItemKey:"info", ItemDisplayName:"Info", ItemIconName:"Info", ItemIconOnly:true, ItemFarItem:true}
)
```

---

## 2. Nav — `Items` (+ `SelectedKey`, `OnSelect`)
Field names: `ItemKey`, `ItemDisplayName`, `ItemParentKey`, `ItemVisible`, `ItemEnabled`, `ItemIconName`, `ItemIconColor`.

```powerfx
// Items
Table(
    {ItemKey:"page", ItemDisplayName:"Pages"},
    {ItemKey:"activity", ItemDisplayName:"Activity", ItemParentKey:"page"},
    {ItemKey:"news", ItemDisplayName:"News", ItemParentKey:"page", ItemVisible:chkVisibleNav.Checked},
    {ItemKey:"morepages", ItemDisplayName:"More pages"},
    {ItemKey:"settings", ItemDisplayName:"Settings", ItemParentKey:"morepages", ItemIconName:"News", ItemIconColor:If(chkCustomIconColor.Checked,"red")},
    {ItemKey:"notes", ItemDisplayName:"Notes", ItemParentKey:"morepages", ItemEnabled:chkEnableNav.Checked}
)
```
```powerfx
OnSelect: =Set(varNavSelected, Self.Selected.ItemKey)
SelectedKey: =varNavSelected
```

---

## 3. FluentDetailsList — `columns_Items` (+ `Items`)
Column field names: `ColName`, `ColDisplayName`, `ColWidth`, `ColCellType`, `ColImageWidth`, `ColSortable`, `ColResizable`, `ColRowHeader`, `ColMultiLine`, `ColShowAsSubTextOf`, `ColInlineLabel`, `ColIsBold`, `ColTagColorColumn`, `ColTagBorderColorColumn`, `ColVerticalAlign`, `ColHorizontalAlign`, `ColSubTextRow`, `ColLabelAbove`, `ColPaddingTop`, `ColFirstMultiValueBold`, `ColMultiValueDelimiter`.

### 3a. Basic (image + sortable text + sub-text)
```powerfx
// columns_Items
Table(
    {ColName:"Icon", ColDisplayName:"", ColWidth:32, ColCellType:"image", ColImageWidth:16, ColVerticalAlign:"top", ColPaddingTop:4},
    {ColName:"Name", ColDisplayName:"Name", ColSortable:true, ColWidth:200, ColRowHeader:true, ColResizable:true},
    {ColName:"Description", ColDisplayName:"Description", ColSortable:true, ColWidth:300, ColResizable:true, ColMultiLine:false},
    {ColName:"DateModified", ColDisplayName:"Date modified", ColSortable:true, ColWidth:100, ColResizable:true}
)
```
```powerfx
// Items (search + client-side sort)
SortByColumns(
    Search(colFiles, txtSearchFiles.Value, "Name"),
    varSortFiles,
    If(varSortFilesAsc, SortOrder.Ascending, SortOrder.Descending)
)
```

### 3b. Cell types (link / image / clickableimage / tag / indicatortag / multi-value)
```powerfx
// columns_Items
Table(
    {ColName:"name", ColDisplayName:"Account name", ColWidth:100, ColIsBold:true, ColCellType:"link", ColVerticalAlign:"Center"},
    {ColName:"city", ColDisplayName:"City:", ColShowAsSubTextOf:"name", ColLabelAbove:false, ColIsBold:false, ColSubTextRow:1, ColVerticalAlign:"Center"},
    {ColName:"externalimage", ColDisplayName:"External", ColCellType:"image", ColWidth:60, ColImageWidth:60, ColVerticalAlign:"Center", ColHorizontalAlign:"Center", ColResizable:true},
    {ColName:"iconimage", ColDisplayName:"Icon", ColCellType:"clickableimage", ColWidth:40, ColTagColorColumn:"TagColor", ColVerticalAlign:"Center", ColHorizontalAlign:"Center", ColResizable:true},
    {ColName:"country", ColDisplayName:"Tag", ColCellType:"tag", ColWidth:70, ColTagColorColumn:"TagColor", ColTagBorderColorColumn:"TagBorderColor", ColVerticalAlign:"Center", ColHorizontalAlign:"Center", ColResizable:true},
    {ColName:"country", ColDisplayName:"Indicator", ColCellType:"indicatortag", ColWidth:150, ColTagColorColumn:"TagColor", ColTagBorderColorColumn:"TagBorderColor", ColIsBold:true, ColInlineLabel:"Status:", ColVerticalAlign:"Center", ColHorizontalAlign:"Center", ColResizable:true},
    {ColName:"tags", ColDisplayName:"Tag list", ColWidth:250, ColFirstMultiValueBold:true, ColMultiValueDelimiter:", "}
)
```
```powerfx
// Items + identity
Items: =colAccounts
RecordKey: ="id"
SelectionType: ='PowerCAT.FluentDetailsList.SelectionType'.Multiple
```
Each `colAccounts` row supplies: `id`, `name`, `city`, `country`, `TagColor`, `TagBorderColor`, `externalimage` (URL), `iconimage` (`"icon:SkypeCircleCheck"`), `svg`, `tags` (`["#PowerApps","#PowerPlatform"]`).

---

## 4. Breadcrumb — `Items`
Field names: `ItemDisplayName`, `ItemClickable` (+ optional `ItemKey`).

```powerfx
Table(
    { ItemDisplayName: "1. Home", ItemClickable: true },
    { ItemDisplayName: "2. Sports", ItemClickable: true },
    { ItemDisplayName: "3. Running (Non-clickable)", ItemClickable: false },
    { ItemDisplayName: "4. Shoes", ItemClickable: true },
    { ItemDisplayName: "5. All Brands", ItemClickable: true }
)
```

---

## 5. Pivot — `Items` (+ `SelectedKey`)
Field names: `ItemKey`, `ItemDisplayName`, `ItemIconName`, `ItemCount`.

```powerfx
Table(
    {ItemKey:"myfiles", ItemDisplayName:"My Files", ItemIconName:"Emoji2"},
    {ItemKey:"recent", ItemCount:23, ItemIconName:"Recent"},
    {ItemKey:"placeholder", ItemDisplayName:"Placeholder", ItemIconName:"Globe"},
    {ItemKey:"sharedwithme", ItemDisplayName:"Shared with me", ItemCount:1, ItemIconName:"Ringer"},
    {ItemKey:"customcolor", ItemDisplayName:"Custom Icon Color", ItemCount:10, ItemIconName:"Globe"}
)
```
```powerfx
RenderType: ='PowerCAT.Pivot.RenderType'.PivotLinks   // or .PivotTabs
SelectedKey: ="myfiles"
```

---

## 6. SearchBox — there is NO Items/dataset
SearchBox is a single text input. It has **no** dataset; it exposes the bound/output **`SearchText`**. You wire it to a list's `Items` via `Search(...)`. Key props: `IconName`, `PlaceHolderText`, `Underlined`, `DisableAnimation`, event `OnChange`.

```powerfx
// SearchBox control props (verbatim, scrSearchBox.fx.yaml)
IconName: =ddIconName.Selected.Value
PlaceHolderText: =txtPlateholderTextValue.Value
Underlined: =chkUnderlined.Checked
DisableAnimation: =chkDisableAnimation.Checked
```
```powerfx
// A DetailsList filtered by the SearchBox output (verbatim)
Items: =Search(colColors, SearchBox1.SearchText, color, value)
```
(See `event-patterns.md` for the `OnChange`→variable→`Filter`/`Search` flow.)

---

## 7. PeoplePicker — `Suggestions_Items` (+ column-name mappings)
The picker has **two** datasets. Search results bind to `Suggestions_Items`; selected people come back via the `SelectedPeople` output. The `Suggestion*` props are **column-name strings** that map fields of each suggestion record.

```powerfx
// Search results collection (Office365Users connector)
OnSearch: |-
    =ClearCollect(
        UserCollection,
        AddColumns(
            Office365Users.SearchUser({ searchTerm: Self.SearchText, top: 500 }),
            ImageURL, Substitute(JSON(Office365Users.UserPhotoV2(Id), JSONFormat.IncludeBinaryData), """", "")
        )
    )
```
```powerfx
Suggestions_Items: =UserCollection
SuggestionKey: ="Mail"            // map key   -> Mail field
SuggestionName: ="DisplayName"    // map name  -> DisplayName field
SuggestionRole: ="JobTitle"       // map role  -> JobTitle field
SuggestionImgUrl: ="ImageURL"     // map image -> ImageURL field
PeoplePickerType: ='PowerCAT.PeoplePicker.PeoplePickerType'.NormalPeoplepicker
ShowSecondaryText: =true
```
Read the result elsewhere: `PeoplePicker1.SelectedPeople` (e.g. Facepile `Items: =PeoplePicker1.SelectedPeople`).

---

## 8. TagPicker (Picker) — `Items` (Tags) + `Suggestions_Items`
Two datasets. `Items` binds current/selected tags; `Suggestions_Items` binds the search list. `Tags*`/`Suggestions*` props are **column-name strings**.

```powerfx
Items: =colSimpleTags                 // current tags (the Tags dataset)
Suggestions_Items: =colComponentTypes // search suggestions

TagsKey: ="name"
TagsDisplayName: ="name"
TagsIconName: ="icon"

SuggestionsKey: ="name"
SuggestionsDisplayName: ="name"
SuggestionsIconName: ="icon"

AllowFreeText: =false
MinimumSearchTermLength: =0
HintText: ="Search for tags"
Error: =CountRows(colSimpleTags)>=5
```
(`OnChange` add/remove logic using `Self.TagEvent`/`Self.TagDisplayName` is in `event-patterns.md`.)
