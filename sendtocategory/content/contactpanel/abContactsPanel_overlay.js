let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

//###################################################
// overriding a core thunderbird function
//###################################################

// The function 'GenerateAddressFromCard' is defined at: https://dxr.mozilla.org/comm-central/source/mail/components/addrbook/content/abCommon.js#596 
// Overiding this function to fix bugs:
// 1: Also check for secondary email, if primary not present.
// 2: Do not return anything (not even the name), if no email present, so that addSelectedAddresses (https://dxr.mozilla.org/comm-central/source/mail/components/addrbook/content/abContactsPanel.js#56) does not add contacts without email.
function GenerateAddressFromCard(card)
{
  if (!card)
    return "";

  var email;

  if (card.isMailList)
  {
    var directory = GetDirectoryFromURI(card.mailListURI);
    email = directory.description || card.displayName;
  } else {
    email = card.primaryEmail 
    if (email == "") try {email = card.getPropertyAsAString("SecondEmail");} catch (ex) {}
  }

  if (email) {
    return MailServices.headerParser.makeMimeAddress(card.displayName, email);
  } else {
    return ""
  }
}




//###################################################
//adding additional functions to the local jbCatMan Object
//###################################################

/* 
  We might want some event listeners as in addressbook_overlay.js to 
  catch category modifications (via EditDialog) and update Categories 
  and members.
*/

jbCatMan.contactPanelCategoryMenuInit = function () {
  jbCatMan.dump("Begin with contactPanelCategoryMenuInit()",1);

  //contactPanelCategoryMenuInit is called onSelect, which is triggered once without a book selected
  let currentlySelectedAddressbook = document.getElementById('addressbookList').value;
  if (currentlySelectedAddressbook != "") {
    
    jbCatMan.scanCategories(GetSelectedDirectory());

    let menulist = document.getElementById("CatManCategoryFilterList");
    menulist.selectedItem = null;
    let itemCount = menulist.itemCount;
    for(let i = (itemCount-1); i >= 0; i-- ) menulist.getItemAtIndex(i).remove();
    
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
  }
  jbCatMan.dump("Done with contactPanelCategoryMenuInit()",-1);
}


jbCatMan.contactPanelCategoryMenuChanged = function () {
  jbCatMan.dump("Begin with contactPanelCategoryMenuChanged()",1);
  if (document.getElementById("CatManCategoryFilterList").value != "") {
    //get selected category
    jbCatMan.data.selectedCategory = document.getElementById("CatManCategoryFilterList").value; 

    //revert selection to placeholdertext (topmost entry)
    let menulist = document.getElementById("CatManCategoryFilterList");
    menulist.selectedItem = menulist.getItemAtIndex(0);

    //apply filter
    jbCatMan.doCategorySearch();

    //select all members of the selected category to save mouse clicks (if only
    //one member is to be selected, the user still has to click once as before)
    let abResultsTree = document.getElementById("abResultsTree");
    abResultsTree.view.selection.selectAll();
  }
  jbCatMan.dump("Done with contactPanelCategoryMenuChanged()",-1);
}
