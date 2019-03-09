
var jbCatManEditDialog = {};

if (window.opener.jbCatMan) {
  var jbCatMan = window.opener.jbCatMan;
} else {
  let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");
}







jbCatManEditDialog.Init = function () {
  //hide SOGo Category Tab
  if (window.document.getElementById("categoriesTabButton")) window.document.getElementById("categoriesTabButton").style.display = 'none';

  if (jbCatMan.isMFFABInstalled) {
    window.document.getElementById('abCatManCategoriesDescription').textContent = jbCatMan.getLocalizedMessage("category_description", "Category Manager")
    window.document.getElementById('abCatManCategoriesDescription').hidden = false;
  }
  
  /* Bugfix "andre jutisz"
  The original idea was to remove the SOGo code, which was run after the OK button of the
  new/edit dialog was pressed. Thinking about it, we do not need to manipulate the SOGo sync
  code here, just let it do its stuff. All I have to do is to prevent the SOGo code to push the values
  from the hidden SOGo-categories-tab (which would overwrite the categories property) */
  if (typeof SCSaveCategories != 'undefined') SCSaveCategories = function() {
  }

  if (window.document.getElementById("abPopup")) {
    window.document.getElementById("abPopup").addEventListener("command", jbCatManEditDialog.updateCategoriesDropDown, false);
  }
  
  jbCatManEditDialog.updateCategoriesDropDown();
}

jbCatManEditDialog.updateCategoriesDropDown = function () {
  //remove the list, if it exists
  let oldmenulist =  window.document.getElementById("abCatManCategoriesAddBox");
  if (oldmenulist) {
    oldmenulist.parentNode.removeChild(oldmenulist);
  }

  let aParentDirURI= "";
  if (window.location.href=="chrome://messenger/content/addressbook/abNewCardDialog.xul") {
    aParentDirURI = window.document.getElementById("abPopup").value;
  } else {
    aParentDirURI = jbCatManEditDialog.getSelectedAbFromArgument(window.arguments[0]);
  }  
  let allCatsArray = jbCatMan.scanCategories(aParentDirURI, "Categories", true);
  
  //append all cats to the select dropdown
  let menulist = window.document.createElement("menulist", { is : "menulist-editable"});
  menulist.setAttribute("id", "abCatManCategoriesAddBox");
  menulist.setAttribute("is", "menulist-editable");
  menulist.setAttribute("flex", "1");
  menulist.setAttribute("editable", "true");
  menulist.addEventListener("keydown",  function (e) { jbCatManEditDialog.keydown(e); }, false);
  
  let popup = window.document.createElement("menupopup");
  for (let i = 0; i < allCatsArray.length; i++) {    
      let menuitem = window.document.createElement("menuitem");
      menuitem.setAttribute("label", allCatsArray[i]);
      menuitem.setAttribute("value", allCatsArray[i]);
      popup.appendChild(menuitem);
  }
  menulist.appendChild(popup);
  
  //add menulist before add button
  let desc = window.document.getElementById("abCatManCategoriesAddButton");
  desc.parentNode.insertBefore(menulist, desc);	
}



jbCatManEditDialog.getSelectedAbFromArgument = function (arg) {
    let abURI = "";
    if (arg.hasOwnProperty("abURI")) {
        abURI = arg.abURI;
    } else if (arg.hasOwnProperty("selectedAB")) {
        abURI = arg.selectedAB;
    }
    
    if (abURI) {
        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
        jbCatManEditDialog.addressbook = abManager.getDirectory(abURI);
        if (jbCatManEditDialog.addressbook.isMailList) {
            let parts = abURI.split("/");
            parts.pop();
            return parts.join("/");
        }
    }
    return abURI;
}


jbCatManEditDialog.keydown = function (e) {
  if (e.type == "keydown" && e.key == "Enter") {
    jbCatManEditDialog.addCategoryEntry(e.target.value);
    
    //prevent closing of dialog
    if (e.type == "keydown") {
      e.stopPropagation(); 
      e.preventDefault();
    }
  }
}


jbCatManEditDialog.addCategoryEntry = function (value) {
  if (value.trim() == "") {
    return;
  }
  let list = window.document.getElementById("abCatManCategoriesList");
  //first check, if we have an entry of that name and just update the checkbox value
  for (let i=0; i < list.children.length; i++) {
    if (list.children[i].children[0].children[1].value == value) {
      list.children[i].children[0].children[0].setAttribute("checked", "true");
      return;
    }
  }
  //if we reach this, value is new and must be added
  list.appendChild(jbCatManEditDialog.addItemToList(value));
}


jbCatManEditDialog.addItemToList = function (label) {
  let hbox = window.document.createElement("hbox");

  let checkbox = window.document.createElement("checkbox");
  checkbox.setAttribute("checked", "true");
  hbox.appendChild(checkbox);

  let categoryName = window.document.createElement("label");
  categoryName.setAttribute("flex", "1");
  categoryName.setAttribute("value", label);
  hbox.appendChild(categoryName);

  let newListItem = window.document.createElement("richlistitem");
  newListItem.appendChild(hbox);
  return newListItem
}


jbCatManEditDialog.onLoadCard = function (aCard, aDocument) {
  let catsArray = jbCatMan.getCategoriesfromCard(aCard, "Categories"); 	
  //append member cats to the listbox
  let list = aDocument.getElementById("abCatManCategoriesList");
  for (let i = 0; i < catsArray.length; i++) {    
    list.appendChild(jbCatManEditDialog.addItemToList(catsArray[i]));
  }
}


jbCatManEditDialog.onSaveCard = function (aCard, aDocument) {
  let list = aDocument.getElementById("abCatManCategoriesList");
  let catsArray = [];
  for (let i=0; i < list.children.length; i++) {
    let value = list.children[i].children[0].children[1].value.replace(/(^[ ]+|[ ]+$)/, "", "g");
    if (list.children[i].children[0].children[0].getAttribute("checked") == "true" && value.length > 0 && catsArray.indexOf(value) == -1) {
      catsArray.push(value);
    }
  }
  jbCatMan.setCategoriesforCard(aCard, catsArray, "Categories");	
}





//Init on load
window.addEventListener("load", function() { 
  jbCatManEditDialog.Init(); 
}, false);


//register load and save listeners
  if (window.location.href=="chrome://messenger/content/addressbook/abNewCardDialog.xul") {
      window.RegisterSaveListener(jbCatManEditDialog.onSaveCard);        
  } else {            
      window.RegisterLoadListener(jbCatManEditDialog.onLoadCard);
      window.RegisterSaveListener(jbCatManEditDialog.onSaveCard);	
  }
