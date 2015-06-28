//###################################################
//adding additional functions to the jbCatMan Object
//###################################################

jbCatMan.contactPanelCategoryMenuInit = function () {

  if (!jbCatMan.sogoInstalled) {
    document.getElementById("CatManCategoryFilterList").style.display = 'none';
    if (jbCatMan.sogoAlert) alert("It looks like the SOGo-Connector Add-On is not installed, which is required for the CategoryManager to work! The following errors have been found:\n\n" + jbCatMan.sogoError);
    jbCatMan.sogoAlert = false;
    return false;
  }
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  let currentlySelectedAddressbook = document.getElementById('addressbookList').value;
  
  //contactPanelCategoryMenuInit is called onSelect, which is triggered once without a book selected
  if (currentlySelectedAddressbook == "") return;
  jbCatMan.scanCategories(abManager.getDirectory(currentlySelectedAddressbook));

  let menulist = document.getElementById("CatManCategoryFilterList");
  menulist.selectedItem = null;
  let itemCount = menulist.itemCount;
  for(let i = (itemCount-1); i >= 0; i-- ) menulist.removeItemAt(i);
  
  let menupopup = document.getElementById("CatManCategoryFilterListPopup");
  let newItem = document.createElement("menuitem");
  newItem.setAttribute("label", jbCatMan.locale.placeholderText);
  newItem.setAttribute("value", "");
  menupopup.appendChild( newItem );
  
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    let newItem = document.createElement("menuitem");
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
  jbCatMan.updatePeopleSearchInput("");
}


jbCatMan.contactPanelCategoryMenuChanged = function () {
  jbCatMan.data.selectedCategory = document.getElementById("CatManCategoryFilterList").value; 

  let menulist = document.getElementById("CatManCategoryFilterList");
  menulist.selectedItem = menulist.getItemAtIndex(0);

  jbCatMan.doCategorySearch(document.getElementById('addressbookList').value);

  //select all members of the selected category to save mouse clicks (if only
  //one member is to be selected, the user still has to click once as before)
  let abResultsTree = document.getElementById("abResultsTree");
  abResultsTree.treeBoxObject.view.selection.selectAll();
	
}
