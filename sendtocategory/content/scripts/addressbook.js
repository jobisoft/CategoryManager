// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/addressbook/addressbook_overlay.js", window, "UTF-8");

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
  // make extension object available
  window.jbCatMan.extension = WL.extension;

  // historically, some locales have been mapped into variables
  window.jbCatMan.locale.categories = window.jbCatMan.getLocalizedMessage("sendtocategory.categoriescontext.label");
  window.jbCatMan.locale.addTitle = window.jbCatMan.getLocalizedMessage("sendtocategory.add.title");
  window.jbCatMan.locale.editTitle = window.jbCatMan.getLocalizedMessage("sendtocategory.edit.title");
  window.jbCatMan.locale.bulkTitle = window.jbCatMan.getLocalizedMessage("sendtocategory.bulkedit.title");
  window.jbCatMan.locale.errorRename = window.jbCatMan.getLocalizedMessage("sendtocategory.error.rename");
  window.jbCatMan.locale.errorAdd = window.jbCatMan.getLocalizedMessage("sendtocategory.error.add");
  window.jbCatMan.locale.infoAdd = window.jbCatMan.getLocalizedMessage("sendtocategory.info.add");
  window.jbCatMan.locale.confirmRename = window.jbCatMan.getLocalizedMessage("sendtocategory.confirm.rename");
  window.jbCatMan.locale.confirmDelete = window.jbCatMan.getLocalizedMessage("sendtocategory.confirm.delete");
  window.jbCatMan.locale.menuExport = window.jbCatMan.getLocalizedMessage("sendtocategory.export.title");
  window.jbCatMan.locale.menuAllExport = window.jbCatMan.getLocalizedMessage("sendtocategory.exportAll.title");
  window.jbCatMan.locale.prefixForPeopleSearch = window.jbCatMan.getLocalizedMessage("sendtocategory.category.label");
  window.jbCatMan.locale.viewAllCategories = window.jbCatMan.getLocalizedMessage("sendtocategory.category.all");
  
  WL.injectCSS("chrome://sendtocategory/content/skin/richlist.css");
  WL.injectElements(`<popupset>
        <menupopup id="CatManContextMenu">
            <menuitem id="CatManContextMenuSend" disabled="true" label="__MSG_sendtocategory.send.title__" oncommand="jbCatMan.writeToCategory()"/>
            <menuseparator/>
            <menuitem id="CatManContextMenuRename" disabled="true" label="__MSG_sendtocategory.edit.title__" oncommand="jbCatMan.onRenameCategory()"/>
            <menuitem id="CatManContextMenuRemove" disabled="true" label="__MSG_sendtocategory.remove.title__" oncommand="jbCatMan.onDeleteCategory()"/>
            <menuitem id="CatManContextMenuBulk" disabled="true" label="__MSG_sendtocategory.bulkedit.title__" oncommand="jbCatMan.onBulkEdit()"/>
            <menuseparator />
            <menuitem id="CatManContextMenuImportExport" disabled="true" label="__MSG_sendtocategory.export.title__" oncommand="jbCatMan.onImportExport()" />
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
                            <label class="CatManHeaderCell1 header" flex="1" value="__MSG_sendtocategory.catbox.header.catname__" />
                            <label class="CatManHeaderCell2 header" flex="0" value="__MSG_sendtocategory.catbox.header.catsize__" />
                        </listheader -->
                    </richlistbox>
                    <hbox pack="end">
                        <button 
                        class="ghostbutton"
                        disabled="false"
                        label="__MSG_sendtocategory.helpButton.label__"
                        oncommand="jbCatMan.onHelpButton()"/>
                        <button
                        class="ghostbutton"
                        id="CatManHideCategoryPaneButton"
                        disabled="false"
                        label="__MSG_sendtocategory.hideCategoryPaneButton.label__"
                        oncommand="jbCatMan.onToggleDisplay(false)"/>                        
                    </hbox>
        </vbox>
        <vbox id="CatManShowBox" hidden="true" pack="end" >
                <hbox pack="end" style="border-top: 1px solid grey; padding-top:2px;">
                    <button 
                    class="ghostbutton"
                    disabled="false"
                    label="__MSG_sendtocategory.helpButton.label__"
                    oncommand="jbCatMan.onHelpButton()"/>
                    <button
                    class="ghostbutton"
                    id="CatManShowCategoryPaneButton"
                    disabled="false"
                    label="__MSG_sendtocategory.showCategoryPaneButton.label__"
                    oncommand="jbCatMan.onToggleDisplay(true)"/>                        
                </hbox>
        </vbox>
    </vbox>

        
  <menupopup id="abResultsTreeContext">
    <menu id="CatManCategoriesContextMenu" label="__MSG_sendtocategory.categoriescontext.label__" insertafter="abResultsTreeContext-properties">
      <menupopup>
      </menupopup>
    </menu>
  </menupopup>`);

  // run init function after window has been loaded
  window.jbCatMan.paintAddressbook();
  if (wasAlreadyOpen) window.jbCatMan.onSelectAddressbook();
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(isAddOnShutDown) {
  window.jbCatMan.unpaintAddressbook();
  let elements = Array.from(window.document.querySelectorAll('[CatManUI]'));
  for (let element of elements) {
    element.remove();
  }
  delete window.jbCatMan;
}
