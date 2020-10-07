// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/addressbook/addressbook_overlay.js", window, "UTF-8");
window.jbCatMan.locale.categories = "&sendtocategory.categoriescontext.label;";
window.jbCatMan.locale.addTitle = "&sendtocategory.add.title;";
window.jbCatMan.locale.editTitle = "&sendtocategory.edit.title;";
window.jbCatMan.locale.bulkTitle = "&sendtocategory.bulkedit.title;";

window.jbCatMan.locale.errorRename = "&sendtocategory.error.rename;";
window.jbCatMan.locale.errorAdd = "&sendtocategory.error.add;";
window.jbCatMan.locale.infoAdd = "&sendtocategory.info.add;";
window.jbCatMan.locale.confirmRename = "&sendtocategory.confirm.rename;";
window.jbCatMan.locale.confirmDelete = "&sendtocategory.confirm.delete;";

window.jbCatMan.locale.menuExport = "&sendtocategory.export.title;";
window.jbCatMan.locale.menuAllExport = "&sendtocategory.exportAll.title;";

window.jbCatMan.locale.prefixForPeopleSearch = "&sendtocategory.category.label;";
window.jbCatMan.locale.viewAllCategories = "&sendtocategory.category.all;";

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
  WL.injectCSS("chrome://sendtocategory/content/skin/richlist.css");
  WL.injectElements(`<popupset>
        <menupopup id="CatManContextMenu">
            <menuitem id="CatManContextMenuSend" disabled="true" label="&sendtocategory.send.title;" oncommand="jbCatMan.writeToCategory();"/>
            <menuseparator/>
            <menuitem id="CatManContextMenuRename" disabled="true" label="&sendtocategory.edit.title;" oncommand="jbCatMan.onRenameCategory()"/>
            <menuitem id="CatManContextMenuRemove" disabled="true" label="&sendtocategory.remove.title;" oncommand="jbCatMan.onDeleteCategory()"/>
            <menuitem id="CatManContextMenuBulk" disabled="true" label="&sendtocategory.bulkedit.title;" oncommand="jbCatMan.onBulkEdit()"/>
            <menuseparator />
            <menuitem id="CatManContextMenuImportExport" disabled="true" label="&sendtocategory.export.title;" oncommand="jbCatMan.onImportExport()" />
        </menupopup>
    </popupset>
    
    <vbox id="dirTreeBox">

        <splitter id="CatManSplitter" collapse="after" resizebefore="closest" resizeafter="closest" state="open" orient="vertical"></splitter>
	
        <vbox id="CatManBox" persist="height top">
                    <hbox align="center" style="padding:1ex 5px 1ex 0"><label id ="CatManBoxLabel" value="" flex="1" /></hbox>
                    <richlistbox 
                    id="CatManCategoriesList"
                    flex="1"
                    seltype="single"
                    context="CatManContextMenu">
                        <!-- listheader class="CatManHeader">
                            <label class="CatManHeaderCell1 header" flex="1" value="&sendtocategory.catbox.header.catname;" />
                            <label class="CatManHeaderCell2 header" flex="0" value="&sendtocategory.catbox.header.catsize;" />
                        </listheader -->
                    </richlistbox>
                    <hbox pack="end">
                        <button 
                        class="ghostbutton"
                        disabled="false"
                        label="&sendtocategory.helpButton.label;"
                        oncommand="jbCatMan.onHelpButton()"/>
                        <button
                        class="ghostbutton"
                        id="CatManHideCategoryPaneButton"
                        disabled="false"
                        label="&sendtocategory.hideCategoryPaneButton.label;"
                        oncommand="jbCatMan.onToggleDisplay(false)"/>                        
                    </hbox>
        </vbox>
        <vbox id="CatManShowBox" hidden="true" pack="end" >
                <hbox pack="end" style="border-top: 1px solid grey; padding-top:2px;">
                    <button 
                    class="ghostbutton"
                    disabled="false"
                    label="&sendtocategory.helpButton.label;"
                    oncommand="jbCatMan.onHelpButton()"/>
                    <button
                    class="ghostbutton"
                    id="CatManShowCategoryPaneButton"
                    disabled="false"
                    label="&sendtocategory.showCategoryPaneButton.label;"
                    oncommand="jbCatMan.onToggleDisplay(true)"/>                        
                </hbox>
        </vbox>
    </vbox>

        
  <menupopup id="abResultsTreeContext">
    <menu id="CatManCategoriesContextMenu" label="&sendtocategory.categoriescontext.label;" insertafter="abResultsTreeContext-properties">
      <menupopup>
      </menupopup>
    </menu>
  </menupopup>`,
  ["chrome://sendtocategory/locale/catman.dtd"]);

  // run init function after window has been loaded
  window.jbCatMan.initAddressbook();
  if (wasAlreadyOpen) window.jbCatMan.onSelectAddressbook();
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(isAddOnShutDown) {
  let elements = Array.from(window.document.querySelectorAll('[CatManUI]'));
  for (let element of elements) {
    element.remove();
  }
delete window.jbCatMan;
}
