// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/addressbook/common-card-overlay.js", window, "UTF-8");

// Called on window load or on add-on activation while window is already open.
function onLoad(wasAlreadyOpen) {
  // make extension object available
  window.jbCatMan.extension = WL.extension;
  
  WL.injectCSS("chrome://messenger/skin/menulist.css");
  WL.injectCSS("chrome://sendtocategory/content/skin/richlist-cardedit.css");
  WL.injectElements(`   
  <tabs id="abTabs">
    <tab insertbefore="homeTabButton" id="abCatManCategoriesTabButton" label="__MSG_sendtocategory.categoriescontext.label__"/>
  </tabs>
  
  <tabpanels id="abTabPanels">
    <tabpanel id="abCatManCategoriesTab" flex="0" insertbefore="abHomeTab">
      <vbox flex="1" style="max-height: 230px;">
        <vbox>
          <richlistbox
          id="abCatManCategoriesList"
          seltype="single">
          </richlistbox>
        </vbox>
        <hbox style="display:flex;">
            <html:input type="text" id="abCatManAddCategoryBox" style="flex-grow: 1;" />
            <button disabled="true" flex="0" id="abCatManAddCategoryButton" type="menu" label="+">
                <menupopup id="abCatManAddCategoryButtonPopup">
                    <menuitem id="abCatManAddMainCategoryButton"
                            label="AddMainCat"/>
                    <menuitem id="abCatManAddSubCategoryButton"
                            label="AddSubCat"/>
                </menupopup>
            </button>
        </hbox>
        <description id="abCatManCategoriesDescription" hidden="true" style="margin-top:1em; width: 400px"></description>
      </vbox>
    </tabpanel>
  </tabpanels>`);
  
  // Init on load
  window.jbCatManEditDialog.Init(); 

  // Register load and save listeners.
  if (window.location.href=="chrome://messenger/content/addressbook/abNewCardDialog.xul") {
    window.RegisterSaveListener(window.jbCatManEditDialog.onSaveCard);        
  } else {            
      window.RegisterLoadListener(window.jbCatManEditDialog.onLoadCard);
      window.RegisterSaveListener(window.jbCatManEditDialog.onSaveCard);	
  }
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(isAddOnShutDown) {
  delete window.jbCatMan;
}
