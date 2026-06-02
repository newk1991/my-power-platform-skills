# Creator Kit — event-handler patterns (real formulas)

Purpose: Copy-paste event handlers from the reference app — CommandBar `OnSelect` Switch, SearchBox `OnChange`→search→DetailsList filter, DetailsList selection→record var, DetailsList sort, and Panel/Dialog open & close. Each notes the EXACT property/output names used (not guessed).

Source (Power Fx, all real):
- CommandBar Switch: `…/cat_fluentuicanvastemplate_51940/Src/__components__.fx.yaml`; PowerCAT CommandBar If-style: `…/Src/Components/TagPickerBasic.fx.yaml` (`CommandBarTags`)
- SearchBox + filtered list: `…/Src/scrSearchBox.fx.yaml`; DetailsList search+sort: `…/Src/Components/DetailsListBasic.fx.yaml`
- DetailsList selection/sort/cell events: `DetailsListBasic.fx.yaml`, `DetailsListLayout.fx.yaml`, `DetailsListPaging.fx.yaml`; selection→pane: `…/cat_fluentuicanvastemplate_51940/Src/PaneListScreen.fx.yaml`
- Panel: `…/Src/scrPanel.fx.yaml` + `CreatorKitCore/.../cat_powercatcomponentlibrary_0be3a/Src/Components/Panel.fx.yaml`
- Dialog: `…/Src/scrDialog.fx.yaml` + `CreatorKitCore/.../cat_powercatcomponentlibrary_0be3a/Src/Components/Dialog.fx.yaml`

---

## 1. CommandBar `OnSelect` — Switch on `Self.Selected.ItemKey`
The selected item is read via **`Self.Selected.ItemKey`** (CommandBar has no scalar "SelectedKey" output).

```powerfx
// OnSelect — Switch (verbatim, __components__.fx.yaml)
Switch(Self.Selected.ItemKey,
    /* Action for Key 'new' */    "new",    Notify("New clicked"),
    /* Action for 'edit'    */    "edit",   Notify("Edit clicked"),
    /* Action for 'delete'  */    "delete", Notify("Delete clicked"),
    /* Action for 'info'    */    "info",   Notify("Info clicked"),
    /* Default action       */              Notify("Unrecognized button clicked")
)
```

```powerfx
// OnSelect — sequential If on a real PowerCAT CommandBar (verbatim, CommandBarTags)
If(Self.Selected.ItemKey="delete",
    RemoveIf(colSimpleTags, name in FluentDetailsListTagsSelected.SelectedItems.name);
);

If(Self.Selected.ItemKey="removeall",
    Clear(colSimpleTags);
);
```

```powerfx
// Reading the selection into a label (verbatim, CommandBarOverflowItems)
Text: =Coalesce(commandBar.Selected.ItemKey, "(none)")
```

---

## 2. SearchBox `OnChange` → search var → DetailsList `Items`
SearchBox output is **`SearchText`**. The reference app reads it directly on the list's `Items` (no intermediate var needed), via `Search(...)`:

```powerfx
// DetailsList.Items filtered live by the SearchBox output (verbatim, scrSearchBox.fx.yaml)
Items: =Search(colColors, SearchBox1.SearchText, color, value)
```

If you prefer the explicit OnChange→variable→Filter flow, set a var in `OnChange` and consume it (composed from the SearchBox `SearchText` output + the list's `Search`/`Filter` usage shown above):

```powerfx
// SearchBox.OnChange
Set(varSearch, Self.SearchText)
```
```powerfx
// DetailsList.Items — Filter on the captured text
Filter(colColors, varSearch in color || varSearch in value)
```
The shipped DetailsList also combines search with a text box and client sort (verbatim, `DetailsListBasic.fx.yaml`):
```powerfx
Items: =SortByColumns(
    Search(colFiles, txtSearchFiles.Value, "Name"),
    varSortFiles,
    If(varSortFilesAsc, SortOrder.Ascending, SortOrder.Descending)
)
```

---

## 3. DetailsList selection → record variable
The selected row is read via **`Self.Selected`** (single) and **`Self.SelectedItems`** (table). There is no "SelectedItem" scalar property.

```powerfx
// OnSelect → capture the selected record (verbatim, DetailsListBasic.fx.yaml)
Set(varRowSelectedBasic, Self.Selected)
```
```powerfx
// Use it (verbatim)
Text: =$"Last row selected (double-click or Enter when focused): {Coalesce(varRowSelectedBasic.Name, "(none)")}"
Text: =$"{FluentDetailsListBasic.TotalRecords} record{If(FluentDetailsListBasic.TotalRecords>1,"s")} ({0+CountRows(FluentDetailsListBasic.SelectedItems)} selected)"
```
```powerfx
// Gate an action on a per-row 'selectable' field (verbatim, DetailsListLayout.fx.yaml)
OnSelect: =If(Self.Selected.selectable, Notify($"Review {Self.Selected.name}"))
```

### Selection-change event (when you need a fired event, not just `.Selected`)
Set `RaiseOnRowSelectionChangeEvent: =true`, then handle in `OnChange` keyed on **`Self.EventName="OnRowSelectionChange"`** reading **`Self.EventRowKey`**:

```powerfx
// (verbatim, DetailsListPaging.fx.yaml)
If(Self.EventName="OnRowSelectionChange", Notify("Row Select " & Self.EventRowKey));

If(Self.EventName="CellAction", Notify("Open Link " & Self.EventColumn & " " & Self.EventRowKey));
```
Selection-driven pane open (verbatim, `PaneListScreen.fx.yaml`):
```powerfx
RaiseOnRowSelectionChangeEvent: =true
SelectionType: ='PowerCAT.FluentDetailsList.SelectionType'.Single
OnChange: =UpdateContext({ showPane: true })
OnSelect: =UpdateContext({ showPane: true })
```

---

## 4. DetailsList sort event
Sort fires via `OnChange` with **`Self.EventName="Sort"`**, reading **`Self.SortEventColumn`** and **`Self.SortEventDirection`**; write back to `CurrentSortColumn`/`CurrentSortDirection` (mirrored to vars here).

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
// Controlled-sort inputs (verbatim)
CurrentSortColumn: =varSortFiles
CurrentSortDirection: =If(varSortFilesAsc,
    'PowerCAT.FluentDetailsList.CurrentSortDirection'.Ascending,
    'PowerCAT.FluentDetailsList.CurrentSortDirection'.Descending)
```

---

## 5. TagPicker `OnChange` — add / remove via `Self.TagEvent`
Picker outputs: **`TagEvent`** (`"Add"`/`"Remove"`), **`TagDisplayName`**, **`TagKey`**, **`SearchTerm`**.

```powerfx
// OnChange (verbatim, TagPickerBasic.fx.yaml)
If(Self.TagEvent = "Add",
    With({
        selectedItem: LookUp(colComponentTypes, Self.TagDisplayName = name),
        alreadyAdded: !IsBlank(LookUp(colSimpleTags, Lower(Self.TagDisplayName) = Lower(name)))
        },
        If(!alreadyAdded,
            If(chkAllowFreeText.Checked,
                If(IsBlank(selectedItem),
                    Collect(colSimpleTags, {name: Self.TagDisplayName}),  // free-text
                    Collect(colSimpleTags, selectedItem)                   // picked suggestion
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
```

---

## 6. Panel — open & close (Creator Kit `Panel` canvas component)
The `Panel` component (from the component library) is shown/hidden via its **`Visible`** property bound to a context var, and exposes events **`OnButtonSelect()`** and **`OnCloseSelect()`** plus the output **`SelectedButton`** (a record with `.Label`). The close button (X) inside the component calls `Panel.OnCloseSelect()`.

```powerfx
// Open the panel — on a button (verbatim, scrPanel.fx.yaml)
btnOpenPanel.OnSelect: =UpdateContext({showHidePanel:true})
```
```powerfx
// The Panel instance (verbatim, scrPanel.fx.yaml)
Panel_1:
    Visible: =showHidePanel
    OnCloseSelect: =UpdateContext({showHidePanel:false})
    OnButtonSelect: =If(Self.SelectedButton.Label = "Ok", Notify("Panel"));UpdateContext({showHidePanel:false})
```
Footer buttons come from the `Buttons` property, e.g. `Table({Label:"Cancel", ButtonType:'Button.ButtonType'.Standard, Visible:true, Enabled:true},{Label:"Ok", ButtonType:'Button.ButtonType'.Primary, Visible:true, Enabled:true})`. Other props: `Title`, `Subtitle`, `PanelPosition` (`"Right"`/`"Left"`), `DialogWidth`.

Switch-style close (verbatim, Theme Designer screen):
```powerfx
OnButtonSelect: =Switch(Self.SelectedButton.Label, "Copy", Copy(varAppThemeJSON);Notify("Copied to clipboard");, UpdateContext({showHidePanel:false}))
OnCloseSelect:  =UpdateContext({showHidePanel:false})
```

---

## 7. Dialog — open & close (Creator Kit `Dialog` canvas component)
Same shape as Panel: bind **`Visible`** to a context var; handle **`OnButtonSelect()`** / **`OnCloseSelect()`**; read **`SelectedButton.Label`**.

```powerfx
// Open the dialog — on a button (verbatim, scrDialog.fx.yaml)
btnOpenDialog.OnSelect: =UpdateContext({showHideDialog:true})
```
```powerfx
// The Dialog instance (verbatim, scrDialog.fx.yaml)
Dialog_1:
    Buttons: =Table({Label:"Send", ButtonType:'Button.ButtonType'.Primary},{Label:"Don't send", ButtonType:'Button.ButtonType'.Standard})
    Title: ="Missing Subject"
    SubTitle: ="Do you want to send this message without a subject"
    DialogHeight: =220
    DialogWidth: =500
    Visible: =showHideDialog
    OnCloseSelect: =UpdateContext({showHideDialog:false})
    OnButtonSelect: =If(Self.SelectedButton.Label = "Send", Notify("Email Sent"));UpdateContext({showHideDialog:false})
```

> Property names verified in the component sources: Dialog/Panel use `Title`, `SubTitle` (Dialog) / `Subtitle` (Panel), `Buttons` (Table of `{Label, ButtonType, …}`), output `SelectedButton` (`.Label`), behavior props `OnButtonSelect()` and `OnCloseSelect()`, and `Visible` for open/close. The in-app code-snippet labels them `OnButtonClose`/`OnButtonSelect`, but the actual instance + component-definition property is **`OnCloseSelect`**.
