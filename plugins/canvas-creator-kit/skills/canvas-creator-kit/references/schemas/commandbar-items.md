# Creator Kit — CommandBar: Items schema & OnSelect pattern

Purpose: Authoritative schema for the Creator Kit **CommandBar** (`PowerCAT.CommandBar`) `items` dataset — exact field names, dividers/headers/sections (sub-menus), the icon fields, and the `OnSelect` `Switch(Self.Selected.ItemKey, …)` pattern — from the PCF manifest, confirmed against real Power Fx.

Source:
- `CreatorKitCore/SolutionPackage/src/Controls/cat_PowerCAT.CommandBar/ControlManifest.xml`
- `CreatorKitReferencesCanvas/.../Src/Components/CommandBarOverflowItems.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/Components/CommandBarColors.fx.yaml`
- `CreatorKitReferencesCanvas/.../Src/Components/TagPickerBasic.fx.yaml` (`CommandBarTags` with enable-when-selected + OnSelect Switch-style If)
- Switch reference shape: `CreatorKitReferencesCanvas/.../cat_fluentuicanvastemplate_51940/Src/__components__.fx.yaml`

> In Studio added as `'Fluent Command Bar'.pcfdataset`; bind the items via the **`Items`** property.

---

## 1. Items dataset (`items`) — every field name

EXACT `property-set` names from `<data-set name="items">`. All `usage="bound"`. Case-sensitive.

| Field | Type | Required | Meaning / values |
|---|---|---|---|
| `ItemDisplayName` | SingleLine.Text | **required** | Button label. Use `""` with `ItemIconOnly:true` for icon-only. |
| `ItemKey` | SingleLine.Text | **required** | Unique key; surfaces as `Self.Selected.ItemKey`. Also the link target for sub-items via `ItemParentKey`. |
| `ItemEnabled` | TwoOptions | optional | `false` = disabled/grayed. |
| `ItemVisible` | TwoOptions | optional | `false` = hidden. |
| `ItemChecked` | TwoOptions | optional | `true` = checked state (toggle). |
| `ItemSplit` | TwoOptions | optional | `true` = split button (primary action + dropdown chevron). |
| `ItemIconName` | SingleLine.Text | optional | Fluent UI icon name, e.g. `"Add"`, `"Mail"`, `"MoveToFolder"`. |
| `ItemIconColor` | SingleLine.Text | optional | CSS color for the icon, e.g. `"rgb(232, 17, 35)"`. |
| `ItemIconOnly` | TwoOptions | optional | `true` = show icon only, hide label. |
| `ItemOverflow` | TwoOptions | optional | `true` = force this item into the `…` overflow menu. |
| `ItemFarItem` | TwoOptions | optional | `true` = right-align (far side of the bar). |
| `ItemHeader` | TwoOptions | optional | `true` = render as a (non-clickable) section header inside a menu. |
| `ItemTopDivider` | TwoOptions | optional | `true` = divider line above this item. |
| `ItemDivider` | TwoOptions | optional | `true` = this item IS a divider line. |
| `ItemParentKey` | SingleLine.Text | optional | `ItemKey` of the parent item → makes this a sub-menu / dropdown child. |

Control properties: `Items` (the dataset), `Theme` (Multiple/JSON), `AccessibilityLabel` (SingleLine.Text), `InputEvent` (SingleLine.Text — send `"SetFocus"` + unique suffix).

### Selection output
The selected item is read via **`Self.Selected`** → `Self.Selected.ItemKey` (and other item fields). Real usage: `Coalesce(commandBar.Selected.ItemKey, "(none)")`. There is **no** separate scalar "SelectedKey" output property on CommandBar (unlike Nav/Pivot).

---

## 2. Dividers, headers, and sections (sub-menus)

These are expressed entirely through item fields — there is no separate "sections" property:

- **Sub-menu / dropdown**: give children an `ItemParentKey` equal to the parent's `ItemKey`. The parent renders as a dropdown; children appear in its menu.
  ```powerfx
  {ItemKey:"newItem", ItemDisplayName:"New", ItemIconName:"Add"},
  {ItemKey:"emailMessage", ItemDisplayName:"Email message", ItemIconName:"Mail", ItemParentKey:"newItem"},
  {ItemKey:"calendarEvent", ItemDisplayName:"Calendar event", ItemIconName:"Calendar", ItemParentKey:"newItem"}
  ```
- **Divider** (inside a menu): a standalone record `{ItemDivider:true}` (verbatim, from `ContextMenuSimple` styled menu — same item schema family). Or `ItemTopDivider:true` on an item to draw a line above it.
- **Header** (section title inside a menu): `{ItemKey:"hdr", ItemDisplayName:"Section", ItemHeader:true}`.
- **Overflow section**: set `ItemOverflow:true` to push items into the `…` overflow menu.
- **Far (right-aligned) section**: set `ItemFarItem:true` (commonly combined with `ItemIconOnly:true`).

### Icon field
`ItemIconName` (Fluent icon name) + optional `ItemIconColor` (CSS color string). Icon-only buttons set `ItemIconOnly:true` (and usually `ItemDisplayName:""`).

---

## 3. OnSelect pattern — `Switch(Self.Selected.ItemKey, …)`

Canonical pattern: branch on `Self.Selected.ItemKey`. The Creator Kit FluentUI template uses this verbatim (on the Fluent v9 Toolbar, which shares the `Self.Selected.ItemKey` shape):

```powerfx
// OnSelect (verbatim, __components__.fx.yaml)
Switch(Self.Selected.ItemKey,
    /* Action for Key 'new' */    "new",    Notify("New clicked"),
    /* Action for 'edit'    */    "edit",   Notify("Edit clicked"),
    /* Action for 'delete'  */    "delete", Notify("Delete clicked"),
    /* Action for 'info'    */    "info",   Notify("Info clicked"),
    /* Default action       */              Notify("Unrecognized button clicked")
)
```

The PowerCAT CommandBar in the reference app reads the same property (label binding, verbatim): `Text: =Coalesce(commandBar.Selected.ItemKey,"(none)")`.

Sequential-`If` variant on a real PowerCAT `'Fluent Command Bar'.pcfdataset` (verbatim, `TagPickerBasic.fx.yaml` → `CommandBarTags`):

```powerfx
OnSelect: |-
    =If(Self.Selected.ItemKey="delete",
        RemoveIf(colSimpleTags, name in FluentDetailsListTagsSelected.SelectedItems.name);
    );

    If(Self.Selected.ItemKey="removeall",
        Clear(colSimpleTags);
    );
```

---

## 4. Real examples

### Example A — overflow, far items & sub-menus (verbatim, `CommandBarOverflowItems.fx.yaml`)

```powerfx
Items: |-
    =Table(
        {ItemKey:"newItem", ItemDisplayName:"New", ItemIconName:"Add"},
        {ItemKey:"emailMessage", ItemDisplayName:"Email message", ItemIconName:"Mail", ItemParentKey:"newItem"},
        {ItemKey:"calendarEvent", ItemDisplayName:"Calendar event", ItemIconName:"Calendar", ItemParentKey:"newItem"},

        {ItemKey:"upload", ItemDisplayName:"Upload", ItemIconName:"Upload"},
            {ItemKey:"uploadfile", ItemDisplayName:"File", ItemParentKey:"upload"},
            {ItemKey:"uploadfolder", ItemDisplayName:"Folder", ItemParentKey:"upload"},

        {ItemKey:"share", ItemDisplayName:"Share", ItemIconName:"Share"},
        {ItemKey:"download", ItemDisplayName:"Download", ItemIconName:"Download"},

        // Force these items to overflow
        {ItemKey:"move", ItemDisplayName:"Move to...", ItemIconName:"MoveToFolder", ItemOverflow:true},
        {ItemKey:"copy", ItemDisplayName:"Copy to...", ItemIconName:"Copy", ItemOverflow:true},
        {ItemKey:"rename", ItemDisplayName:"Rename...", ItemIconName:"Edit", ItemOverflow:true},

        // Far Items
        {ItemKey:"tile", ItemDisplayName:"Grid view", ItemIconName:"Tiles", ItemIconOnly:true, ItemFarItem:true},
        {ItemKey:"info", ItemDisplayName:"Info", ItemIconName:"Info", ItemIconOnly:true, ItemFarItem:true}
    )
```

### Example B — custom icon colors + enable-when-selected (verbatim, `CommandBarColors.fx.yaml` / `CommandBarTags`)

```powerfx
// Per-item icon color via ItemIconColor
Items: |-
    =Table(
        {ItemKey:"newItem", ItemDisplayName:"New", ItemIconName:"Add", ItemIconColor:"rgb(232, 17, 35)"},
        {ItemKey:"emailMessage", ItemDisplayName:"Email message", ItemIconName:"Mail", ItemIconColor:"rgb(0, 191, 255)", ItemParentKey:"newItem"},
        {ItemKey:"calendarEvent", ItemDisplayName:"Calendar event", ItemIconName:"Calendar", ItemIconColor:"rgb(0, 0, 0)", ItemParentKey:"newItem"},
        {ItemKey:"tile", ItemDisplayName:"Grid view", ItemIconName:"Tiles", ItemIconOnly:true, ItemIconColor:"rgb(232, 17, 35)", ItemFarItem:true}
    )
```

```powerfx
// ItemEnabled bound to a live condition (verbatim, CommandBarTags)
Items: |-
    =Table(
        {ItemKey:"delete", ItemIconName:"Delete", ItemDisplayName:"Remove selected", ItemEnabled:CountRows(FluentDetailsListTagsSelected.SelectedItems)>0},
        {ItemKey:"removeall", ItemIconName:"AlertSolid", ItemDisplayName:"Remove all"}
    )
```
