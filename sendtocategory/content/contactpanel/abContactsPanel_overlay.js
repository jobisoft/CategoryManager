// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

//###################################################
//adding additional functions to the local jbCatMan Object
//###################################################

/* 
  We might want some event listeners as in addressbook_overlay.js to 
  catch category modifications (via EditDialog) and update Categories 
  and members.
*/

jbCatMan.contactPanelCategoryMenuInit = function () {
  //contactPanelCategoryMenuInit is called onSelect, which is triggered once without a book selected
  let currentlySelectedAddressbook = document.getElementById('addressbookList').value;
  if (currentlySelectedAddressbook != "") {
    
    jbCatMan.scanCategories(GetSelectedDirectory());

    let menulist = document.getElementById("CatManCategoryFilterList");
    menulist.selectedItem = null;
    let itemCount = menulist.itemCount;
    for(let i = (itemCount-1); i >= 0; i-- ) menulist.getItemAtIndex(i).remove();
    
    let menupopup = document.getElementById("CatManCategoryFilterListPopup");
    let newItem = document.createXULElement("menuitem");
    newItem.setAttribute("label", jbCatMan.locale.placeholderText);
    newItem.setAttribute("value", "");
    menupopup.appendChild( newItem );
    
    for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
      let newItem = document.createXULElement("menuitem");
      newItem.setAttribute("label", "- " + jbCatMan.data.categoryList[i]);
      newItem.setAttribute("value", jbCatMan.data.categoryList[i]);
      menupopup.appendChild( newItem );
    }        
    menulist.selectedItem = menulist.getItemAtIndex(0);
    
    if (jbCatMan.data.categoryList.length == 0) {
      menulist.disabled = true;
    } else {
      menulist.disabled = false;
    }
  }
}


jbCatMan.contactPanelCategoryMenuChanged = function () {
  if (document.getElementById("CatManCategoryFilterList").value != "") {
    //get selected category
    let category = document.getElementById("CatManCategoryFilterList").value; 

    //revert selection to placeholdertext (topmost entry)
    let menulist = document.getElementById("CatManCategoryFilterList");
    menulist.selectedItem = menulist.getItemAtIndex(0);

    //apply filter
    jbCatMan.doCategorySearch([category]);

    //select all members of the selected category to save mouse clicks (if only
    //one member is to be selected, the user still has to click once as before)
    let abResultsTree = document.getElementById("abResultsTree");
    abResultsTree.view.selection.selectAll();
  }
}
