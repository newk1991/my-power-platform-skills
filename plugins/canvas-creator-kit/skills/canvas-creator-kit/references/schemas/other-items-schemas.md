# Creator Kit — Other dataset schemas: Breadcrumb, Pivot, PeoplePicker, Picker (TagPicker), ContextMenu

Purpose: Item/dataset schemas (exact bound field names) for the remaining Creator Kit list-style controls, with one real example each. From PCF manifests, confirmed against reference-app Power Fx.

Source (manifests, all under `CreatorKitCore/SolutionPackage/src/Controls/`):
- `cat_PowerCAT.Breadcrumb/ControlManifest.xml`
- `cat_PowerCAT.Pivot/ControlManifest.xml`
- `cat_PowerCAT.PeoplePicker/ControlManifest.xml`
- `cat_PowerCAT.Picker/ControlManifest.xml`
- `cat_PowerCAT.ContextMenu/ControlManifest.xml`

Source (Power Fx):
- `CreatorKitReferencesCanvas/.../Src/Components/{BreadcrumbBasic,PivotItemStyles,PeoplePickerO365,TagPickerBasic,ContextMenuSimple}.fx.yaml`

---

## Breadcrumb (`PowerCAT.Breadcrumb`)
Studio: `'Fluent Breadcrumb'.pcfdataset`. Bind via **`Items`**.

`<data-set name="items">` fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `ItemDisplayName` | SingleLine.Text | **required** | Crumb label. |
| `ItemKey` | SingleLine.Text | **required** | Unique key (surfaced via `Self.Selected.ItemKey`). |
| `ItemClickable` | TwoOptions | optional | `false` = non-clickable crumb (e.g. current page). |

Control props: `MaxDisplayedItems` (Whole.None), `OverflowIndex` (Whole.None), `Theme`, `AccessibilityLabel`, `InputEvent`. Selection read via `Breadcrumb1.Selected.ItemDisplayName`. No `ItemKey` is shown in the basic sample (it relies on `ItemDisplayName` only) — `ItemKey` is still the manifest-required identity field.

Example (verbatim, `BreadcrumbBasic.fx.yaml`):
```powerfx
Items: |-
    =Table(
        { ItemDisplayName: "1. Home", ItemClickable: true },
        { ItemDisplayName: "2. Sports", ItemClickable: true },
        { ItemDisplayName: "3. Running (Non-clickable)", ItemClickable: false },
        { ItemDisplayName: "4. Shoes", ItemClickable: true },
        { ItemDisplayName: "5. All Brands", ItemClickable: true }
    )
MaxDisplayedItems: =sdlMaxItems.Value
OverflowIndex: =sldOverflowIndex.Value
```

---

## Pivot (`PowerCAT.Pivot`)
Studio: `'Fluent Pivot'.pcfdataset`. Bind via **`Items`**.

`<data-set name="items">` fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `ItemDisplayName` | SingleLine.Text | **required** | Tab label. |
| `ItemKey` | SingleLine.Text | **required** | Unique key; matched against `SelectedKey`; read via `Self.Selected.ItemKey`. |
| `ItemEnabled` | TwoOptions | optional | `false` = disabled tab. |
| `ItemVisible` | TwoOptions | optional | `false` = hidden tab. |
| `ItemChecked` | TwoOptions | optional | checked state. |
| `ItemIconName` | SingleLine.Text | optional | Fluent icon name. |
| `ItemCount` | Whole.None | optional | Badge number shown in brackets, e.g. `ItemCount:23`. |

Control props: `SelectedKey` (bound), `RenderType` Enum `'PowerCAT.Pivot.RenderType'.PivotLinks`(0)/`.PivotTabs`(1), `RenderSize` Enum `'PowerCAT.Pivot.RenderSize'.Normal`(0)/`.Large`(2), `Theme`, `AccessibilityLabel`, `InputEvent`.

Example (verbatim, `PivotItemStyles.fx.yaml`):
```powerfx
Items: |-
    =Table(
        {ItemKey:"myfiles", ItemDisplayName:"My Files", ItemIconName:"Emoji2"},
        {ItemKey:"recent", ItemCount:23, ItemIconName:"Recent"},
        {ItemKey:"placeholder", ItemDisplayName:"Placeholder", ItemIconName:"Globe"},
        {ItemKey:"sharedwithme", ItemDisplayName:"Shared with me", ItemCount:1, ItemIconName:"Ringer"},
        {ItemKey:"customcolor", ItemDisplayName:"Custom Icon Color", ItemCount:10, ItemIconName:"Globe"}
    )
RenderSize: =If(chkRenderLarge.Checked,'PowerCAT.Pivot.RenderSize'.Large,'PowerCAT.Pivot.RenderSize'.Normal)
RenderType: ='PowerCAT.Pivot.RenderType'.PivotLinks
SelectedKey: ="bas"
```
(Common app-tab pattern, used on every reference screen: `Table({ItemKey:"app",ItemDisplayName:"App",ItemIconName:"PowerApps2Logo"},{ItemKey:"code",ItemDisplayName:"Code",ItemIconName:"Code"})`.)

---

## PeoplePicker (`PowerCAT.PeoplePicker`)
Studio: `'Fluent PeoplePicker'`. **Two datasets**: `Personas` (pre-selected/displayed people) and `Suggestions` (search results). Bound via authoring props `Personas_Items` and **`Suggestions_Items`**.

`<data-set name="Suggestions">` fields (mirror set exists on `Personas` with `Persona…` prefix):

| Suggestions field | Personas field | Type | Required |
|---|---|---|---|
| `SuggestionKey` | `PersonaKey` | SingleLine.Text | **required** |
| `SuggestionName` | `PersonaName` | SingleLine.Text | **required** |
| `SuggestionImgUrl` | `PersonaImgUrl` | SingleLine.Text | optional |
| `SuggestionImageAlt` | `PersonaImageAlt` | SingleLine.Text | optional |
| `SuggestionPresence` | `PersonaPresence` | SingleLine.Text | optional |
| `SuggestionOOF` | `PersonaOOF` | TwoOptions | optional |
| `SuggestionRole` | `PersonaRole` | SingleLine.Text | optional |

> These property-set names are bound to **column NAMES (strings)** in usage — e.g. `SuggestionKey: ="Mail"` maps the picker's key to the `Mail` field of each `Suggestions_Items` record. Same for `SuggestionName: ="DisplayName"`, `SuggestionRole: ="JobTitle"`, `SuggestionImgUrl: ="ImageURL"`.

Key control props/outputs: `PeoplePickerType` Enum (`'PowerCAT.PeoplePicker.PeoplePickerType'.NormalPeoplepicker` / `.CompactPeoplepicker` / `.ListPeoplepicker`), `ShowSecondaryText`, `Error`, `MaxPeople`, `MinimumSearchTermLength`; **output `SelectedPeople`** (Object — the chosen personas), output `SearchText`, output `AutoHeight`; events `OnSearch`, `OnBlur`, `OnFocus`; `InputEvent`.

Example (verbatim, `PeoplePickerO365.fx.yaml` — Office365Users connector):
```powerfx
OnSearch: |-
    =ClearCollect(
        UserCollection,
        AddColumns(
            Office365Users.SearchUser({ searchTerm: Self.SearchText, top: 500 }),
            ImageURL, Substitute(JSON(Office365Users.UserPhotoV2(Id), JSONFormat.IncludeBinaryData), """", "")
        )
    )
PeoplePickerType: =ddPickerType.Selected.Key
ShowSecondaryText: =chkShowSectxt.Checked
SuggestionImgUrl: ="ImageURL"
SuggestionKey: ="Mail"
SuggestionName: ="DisplayName"
SuggestionRole: ="JobTitle"
Suggestions_Items: =UserCollection
```
`SelectedPeople` is consumed downstream, e.g. by Facepile: `Items: =PeoplePicker1.SelectedPeople`, `ItemPersonaKey: ="PersonaKey"`, `ItemPersonaName: ="PersonaName"`, `ItemPersonaImageInfo: ="PersonaImgUrl"`.

---

## Picker / TagPicker (`PowerCAT.Picker`)
Studio: `'Fluent Picker'.pcfdataset`. **Two datasets**: `Tags` (current/selected tags) and `Suggestions` (search results). Bound via `Tags_Items` / **`Suggestions_Items`**.

`<data-set name="Tags">` fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `TagsKey` | SingleLine.Text | **required** | Tag key (string column-name mapping). |
| `TagsDisplayName` | SingleLine.Text | **required** | Tag label. |
| `TagsError` | TwoOptions | optional | per-tag error state. |
| `TagsIconName` | SingleLine.Text | optional | icon column name. |
| `TagsIconColor` / `TagsTextColor` / `TagsBackgroundColor` / `TagsHoverBackgroundColor` / `TagsBorderColor` / `TagsHoverBorderColor` | SingleLine.Text | optional | per-tag style column names. |

`<data-set name="Suggestions">` fields: `SuggestionsKey` (req), `SuggestionsDisplayName` (req), `SuggestionsSubDisplayName` (req), `SuggestionsIconName`, `SuggestionsIconColor`, `SuggestionsTextColor`, `SuggestionsBackgroundColor`, `SuggestionsHoverBackgroundColor`, `SuggestionsBorderColor`, `SuggestionsHoverBorderColor`.

> Like PeoplePicker, the `Tags…`/`Suggestions…` props take **column NAME strings**: `TagsKey:="name"`, `TagsDisplayName:="name"`, `TagsIconName:="icon"`, `SuggestionsKey:="name"`, `SuggestionsDisplayName:="name"`, `SuggestionsIconName:="icon"`.

Key props/outputs: `AllowFreeText`, `MaxTags` (default 10), `MinimumSearchTermLength`, `HintText`, `Error`, `TagMaxWidth`; **outputs** `TagEvent` (SingleLine.Text — `"Add"` / `"Remove"`), `TagKey`, `TagDisplayName`, `SearchTerm`, `AutoHeight`; `InputEvent`.

Example (verbatim, `TagPickerBasic.fx.yaml`):
```powerfx
AllowFreeText: =chkAllowFreeText.Checked
Error: =CountRows(colSimpleTags)>=5
HintText: =If(chkAllowFreeText.Checked,"Search for tags or enter a new one","Search for tags")
Items: =colSimpleTags
MinimumSearchTermLength: =0
OnChange: |-
    =If(Self.TagEvent = "Add",
        With({
            selectedItem: LookUp(colComponentTypes, Self.TagDisplayName = name),
            alreadyAdded: !IsBlank(LookUp(colSimpleTags, Lower(Self.TagDisplayName) = Lower(name)))
            },
            If(!alreadyAdded,
                If(chkAllowFreeText.Checked,
                    If(IsBlank(selectedItem),
                        Collect(colSimpleTags, {name: Self.TagDisplayName}),   // free-text tag
                        Collect(colSimpleTags, selectedItem)                    // picked suggestion
                    );
                ,
                    Collect(colSimpleTags, LookUp(colComponentTypes, Self.TagDisplayName = name))
                );
            );
        );
    );

    If(Self.TagEvent = "Remove",
        RemoveIf(colSimpleTags, name = Text(Self.TagDisplayName))
    );
Suggestions_Items: =colComponentTypes
SuggestionsDisplayName: ="name"
SuggestionsIconName: ="icon"
SuggestionsKey: ="name"
TagsDisplayName: ="name"
TagsIconName: ="icon"
TagsKey: ="name"
```
> `Items:` here is the studio binding for the `Tags` dataset (current tags); `Suggestions_Items:` is the search list. `LayoutMinHeight`/`LayoutMinWidth` seen in the sample are standard PCF layout props, not Picker-specific.

---

## ContextMenu (`PowerCAT.ContextMenu`)
Studio: `'Fluent Context Menu'.pcfdataset`. Bind via **`Items`**. The first record (root) is the trigger button; the rest are menu entries.

`<data-set name="items">` fields:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `ItemDisplayName` | SingleLine.Text | **required** | Menu entry / root label. |
| `ItemKey` | SingleLine.Text | **required** | Unique key; read via `Self.Selected.ItemKey`. |
| `ItemEnabled` | TwoOptions | optional | `false` = disabled entry. |
| `ItemVisible` | TwoOptions | optional | hide entry. |
| `ItemChecked` | TwoOptions | optional | checkmark toggle. |
| `ItemIconName` | SingleLine.Text | optional | Fluent icon name. |
| `ItemIconColor` | SingleLine.Text | optional | icon CSS color, e.g. `"salmon"`. |
| `ItemIconOnly` | TwoOptions | optional | icon-only entry. |
| `ItemHeader` | TwoOptions | optional | section header. |
| `ItemTopDivider` | TwoOptions | optional | divider above the entry. |
| `ItemDivider` | TwoOptions | optional | the record IS a divider (`{ItemDivider:true}`). |
| `ItemParentKey` | SingleLine.Text | optional | sub-menu child → parent's `ItemKey`. |

Control props: `Chevron` (TwoOptions, default true), `TextAlignment` Enum `'PowerCAT.ContextMenu.TextAlignment'.Center`(0)/`.Left`(1)/`.Right`(2), plus styling (`FillColor`, `FontColor`, `BorderColor`, `Hover*`…), `Theme`, `InputEvent`.

Example (verbatim, `ContextMenuSimple.fx.yaml` — styled menu with divider, sub-menu, checked toggle):
```powerfx
Items: |-
    =Table(
        {ItemKey:"root", ItemDisplayName:"Click for ContextualMenu"},
        {ItemKey:"newItem", ItemDisplayName:"New", ItemIconName:"Add"},
        {ItemKey:"upload", ItemDisplayName:"Upload", ItemIconName:"Add", ItemIconColor:"salmon"},
        {ItemKey:"share", ItemDisplayName:"Share", ItemIconName:"Share"},
        {ItemDivider:true},
        {ItemKey:"print", ItemDisplayName:"Print", ItemIconName:"Print"},
        {ItemKey:"printall", ItemDisplayName:"Print all", ItemIconName:"Print", ItemParentKey:"print"},
        {ItemKey:"printpages", ItemDisplayName:"Print specific pages", ItemIconName:"Page", ItemParentKey:"print"},
        {ItemKey:"print-autosize", ItemDisplayName:"Auto Size", ItemIconName:"PictureStretch", ItemParentKey:"print", ItemChecked:!!varAutoPlayChecked},
        {ItemKey:"music", ItemDisplayName:"Music", ItemIconName:"MusicInCollectionFill", ItemEnabled:false}
    )
OnSelect: =If(Self.Selected.ItemKey="print-autosize", Set(varAutoPlayChecked,!varAutoPlayChecked))
TextAlignment: =ddAlignmentMenu.Selected.Key
```
