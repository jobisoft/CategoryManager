// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/addressbook/common-card-overlay.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://messenger/content/customElements.js", window, "UTF-8");

// Called on window load or on add-on activation while window is already open.
async function onLoad(wasAlreadyOpen) {
  WL.injectCSS("chrome://messenger/skin/menulist.css");
  WL.injectCSS("chrome://sendtocategory/content/skin/richlist-cardedit.css");
  WL.injectElements(`   
  <tabs id="abTabs">
    <tab insertbefore="homeTabButton" id="abCatManCategoriesTabButton" label="&sendtocategory.categoriescontext.label;"/>
  </tabs>
  
  <tabpanels id="abTabPanels">
    <tabpanel id="abCatManCategoriesTab" flex="0" insertbefore="abHomeTab">
      <vbox flex="1">
        <vbox style="height: 230px" flex="0">
          <richlistbox
          flex="1"
          id="abCatManCategoriesList"
          seltype="single">
          </richlistbox>
        </vbox>
        <hbox pack="end">
            <html:input type="text" id="abCatManAddCategoryBox" style="width:100%" />
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
  </tabpanels>`,
  ["chrome://sendtocategory/locale/catman.dtd"]);
  
  // Init on load
  await window.jbCatManEditDialog.Init(); 

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
}
