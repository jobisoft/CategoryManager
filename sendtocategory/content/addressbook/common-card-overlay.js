
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

  window.document.getElementById('abCatManCategoriesAddBox').addEventListener("keydown",  function (e) { jbCatManEditDialog.keydown(e); }, false);
  if (window.location.href=="chrome://messenger/content/addressbook/abNewCardDialog.xul") {
    if (window.document.getElementById("abPopup")) {
      window.document.getElementById("abPopup").addEventListener("command", function() { jbCatManEditDialog.onLoadCard(null, window.document); }, false);
    }
  }
}


jbCatManEditDialog.getSelectedAbFromArgument = function (arg) {
    let abURI = "";
    if (arg.hasOwnProperty("abURI")) {
        abURI = arg.abURI;
    } else if (arg.hasOwnProperty("selectedAB")) {
        abURI = arg.selectedAB;
    }
    
    if (abURI) {
        jbCatManEditDialog.addressbook = MailServices.ab.getDirectory(abURI);
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
    let comp = value.localeCompare(list.children[i].children[0].children[1].value);
    switch (comp) {
      case -1: 
        //insert here
        list.insertBefore(jbCatManEditDialog.addItemToList(value), list.children[i]);    
        return;
      
      case 0: 
        // this is it
        list.children[i].children[0].children[0].setAttribute("checked", "true");
        return;
      
      case 1:
      default:
        // check next entry
        break;
    } 
  }

  // If we reach this, value is new larger then all existing entries and must be added last.
  list.appendChild(jbCatManEditDialog.addItemToList(value));
}
    
jbCatManEditDialog.addItemToList = function (label, checked = true) {
  let levels = label.split(" / ");
  let level = levels.length-1;
  let color = (255 - (level * 16)).toString(16);
  
  let hbox = window.document.createElement("hbox");
  
  let checkbox = window.document.createElement("checkbox");
  checkbox.setAttribute("checked", checked ? "true" : "false");
  hbox.appendChild(checkbox);

  let categoryName = window.document.createElement("label");
  categoryName.setAttribute("flex", "1");
  categoryName.setAttribute("value", label);
  hbox.appendChild(categoryName);

  let newListItem = window.document.createElement("richlistitem");
  newListItem.style["background-color"] = "#" + color + color + color;
  newListItem.style["color"] = "#000000";
  newListItem.appendChild(hbox);
  return newListItem
}


jbCatManEditDialog.onLoadCard = function (aCard, aDocument) {
  let aParentDirURI= "";
  if (aDocument.defaultView.location.href=="chrome://messenger/content/addressbook/abNewCardDialog.xul") {
    aParentDirURI = aDocument.getElementById("abPopup").value;
  } else {
    aParentDirURI = jbCatManEditDialog.getSelectedAbFromArgument(aDocument.defaultView.arguments[0]);
  }  
  let allCatsArray = jbCatMan.scanCategories(aParentDirURI, "Categories", true);
  
  // Clear current list.
  let list = aDocument.getElementById("abCatManCategoriesList");
  list.clearSelection();
  for (let i=list.getRowCount(); i>0; i--) {
    list.getItemAtIndex(i-1).remove();
  }
  
  // Add all cats to the list.
  let catsArray = aCard ? jbCatMan.getCategoriesfromCard(aCard, "Categories") : []; 	
  //for (let c = allCatsArray.length-1; c >= 0; c--) {
  for (let c = 0; c < allCatsArray.length; c++) {
    let cat = allCatsArray[c];
    list.appendChild(jbCatManEditDialog.addItemToList(cat, catsArray.includes(cat)));
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
