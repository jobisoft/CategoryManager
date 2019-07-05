
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

  window.document.getElementById('abCatManCategoriesList').addEventListener("select",  jbCatManEditDialog.onItemSelected, false);
  window.document.getElementById('abCatManAddCategoryBox').addEventListener("input", jbCatManEditDialog.onInput, false);
  window.document.getElementById('abCatManAddCategoryBox').addEventListener("keydown", jbCatManEditDialog.onKeydown, false);
  window.document.getElementById('abCatManAddCategoryButtonPopup').addEventListener("popupshowing", jbCatManEditDialog.onPopupShowing, false);
  window.document.getElementById('abCatManAddMainCategoryButton').addEventListener("command", jbCatManEditDialog.insertNewCategoryEntry, false);
  window.document.getElementById('abCatManAddSubCategoryButton').addEventListener("command", jbCatManEditDialog.insertNewCategoryEntry, false);

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




// Insert a new single category entry into the category tree.
jbCatManEditDialog.insertNewCategoryEntry = function (event) {
  let categoryName = window.document.getElementById("abCatManAddCategoryBox").value;
  if (categoryName.trim() == "") {
    return;
  }
  
  let list = window.document.getElementById("abCatManCategoriesList");  
  if (event.target.id == "abCatManAddSubCategoryButton") {
    if (list.selectedItem) {
      categoryName = list.selectedItem.categoryName + " / " + categoryName;
      // toggle to open (if needed)
      let checkbox = list.selectedItem.getElementsByTagName("checkbox")[0];
      if (!checkbox.checked) {
        checkbox.setAttribute("checked", "true");
        jbCatManEditDialog.toggleBoxes(list.selectedItem, true);
      }
    } else {
      return;
    }
  }

  //first check, if we have an entry of that name and just update the checkbox value
  for (let i=0; i < list.children.length; i++) {
    let comp = (categoryName < list.children[i].categoryName) ? -1 : ((categoryName == list.children[i].categoryName) ? 0 : 1);
    switch (comp) {
      case -1: 
        //insert here
        list.insertBefore(jbCatManEditDialog.addItemToList(categoryName, true), list.children[i]);    
        return;
      
      case 0: 
        // this is it
        let checkbox = list.children[i].getElementsByTagName("checkbox")[0];
        if (!checkbox.checked) {
          checkbox.setAttribute("checked", "true");
          jbCatManEditDialog.toggleBoxes(list.children[i], true);
        }
        return;
      
      case 1:
      default:
        // check next entry
        break;
    } 
  }

  // If we reach this, categoryName is larger then all existing entries and must be added last.
  list.appendChild(jbCatManEditDialog.addItemToList(categoryName, true));
}


// Append category and its sub categories (if checked).
jbCatManEditDialog.appendCategoryEntries = function (categoryName, checked = true) {
  if (categoryName.trim() == "") {
    return;
  }
  
  let list = window.document.getElementById("abCatManCategoriesList");
  list.appendChild(jbCatManEditDialog.addItemToList(categoryName, checked));

  // If this cat is checked, also append its sub categories
  if (checked) {
    let reducedCategories = jbCatMan.getReducedCategoriesForHierarchyMode(categoryName);    
    for (let subCat of reducedCategories) {
      jbCatManEditDialog.appendCategoryEntries(subCat, jbCatManEditDialog.catsArray.filter(cat => (cat == subCat || cat.startsWith(subCat + " / "))).length > 0);
    }
  }
}


jbCatManEditDialog.toggleBoxes = function(element, checked) {
  let list = window.document.getElementById("abCatManCategoriesList");
  
  if (checked) {
  // We just toggled to open
    let hook = element.nextSibling;
    let reducedCategories = jbCatMan.getReducedCategoriesForHierarchyMode(element.categoryName);    
    for (let subCat of reducedCategories) {
      list.insertBefore(jbCatManEditDialog.addItemToList(subCat, false), hook);    
    }
  } else {
    // We just toggled to close - remove all entries up to the next element with the same level.
    while (
      element.nextSibling && 
      element.nextSibling.categoryName && 
      element.nextSibling.categoryName.split(" / ").length > element.categoryName.split(" / ").length) {
        element.nextSibling.remove();
    }
  }
}


jbCatManEditDialog.addItemToList = function (categoryName, checked = true) {
  let levels = categoryName.split(" / ");
  let level = levels.length-1;
  let color = (255 - (level * 16)).toString(16);
  
  let hbox = window.document.createElement("hbox");
  
  let checkbox = window.document.createElement("checkbox");
  checkbox.setAttribute("checked", checked ? "true" : "false");
  checkbox.style["margin-left"] = (level*16) + "px";
  checkbox.addEventListener("command", jbCatManEditDialog.onCheckBoxes); 
  hbox.appendChild(checkbox);

  let categoryLabel = window.document.createElement("label");
  categoryLabel.setAttribute("flex", "1");
  categoryLabel.setAttribute("value", levels[level]);
  hbox.appendChild(categoryLabel);

  let newListItem = window.document.createElement("richlistitem");
  newListItem.setAttribute("custom-color", "true");
  newListItem.style.setProperty("--custom-color", "#" + color + color + color);
  newListItem.categoryName = categoryName;
  newListItem.appendChild(hbox);
  return newListItem
}




jbCatManEditDialog.onLoadCard = function (aCard, aDocument) { 
  jbCatManEditDialog.catsArray = aCard ? jbCatMan.getCategoriesfromCard(aCard, "Categories") : []; 	

  // Clear current list.
  let list = aDocument.getElementById("abCatManCategoriesList");
  list.clearSelection();
  for (let i=list.getRowCount(); i>0; i--) {
    list.getItemAtIndex(i-1).remove();
  }
  
  // Add all first level categories.
  let reducedCategories = jbCatMan.getReducedCategoriesForHierarchyMode();    
  for (let subCat of reducedCategories) {
    jbCatManEditDialog.appendCategoryEntries(subCat, jbCatManEditDialog.catsArray.filter(cat => (cat == subCat || cat.startsWith(subCat + " / "))).length > 0);
  }
}


jbCatManEditDialog.onSaveCard = function (aCard, aDocument) {
  let list = aDocument.getElementById("abCatManCategoriesList");
  let catsArray = [];
  for (let i=0; i < list.children.length; i++) {
    let value = list.children[i].categoryName.replace(/(^[ ]+|[ ]+$)/, "", "g");
    if (list.children[i].children[0].children[0].getAttribute("checked") == "true" && value.length > 0 && catsArray.indexOf(value) == -1) {
      catsArray.push(value);
    }
  }
  jbCatMan.setCategoriesforCard(aCard, catsArray, "Categories");	
}


jbCatManEditDialog.onCheckBoxes = function(event) {
  // get the state AFTER selection
  let checked = event.target.checked;
  let element = event.target.parentNode.parentNode;
  jbCatManEditDialog.toggleBoxes(element, checked);
}


jbCatManEditDialog.onKeydown = function (e) {
  if (e.type == "keydown" && e.key == "Enter") {    
    //prevent closing of dialog
    e.stopPropagation(); 
    e.preventDefault();
  }
}


jbCatManEditDialog.onInput = function (e) {
  window.document.getElementById('abCatManAddCategoryButton').disabled = (e.srcElement.value == "");
}


jbCatManEditDialog.onPopupShowing = function (event) {
  let list = window.document.getElementById('abCatManCategoriesList');
  let mainCatBtn = window.document.getElementById('abCatManAddMainCategoryButton');
  let subCatBtn = window.document.getElementById('abCatManAddSubCategoryButton');
  mainCatBtn.label = jbCatMan.getLocalizedMessage("button_addMainCat");
  subCatBtn.label = jbCatMan.getLocalizedMessage("button_addSubCat").replace("##CAT##", list.selectedItem.categoryName);
}


jbCatManEditDialog.onItemSelected = function (event) {
  let list = window.document.getElementById('abCatManCategoriesList');
  let elements = list.getElementsByClassName("isSelected");
  for (element of elements) {
    element.setAttribute("class", "");
  }
  list.selectedItem.setAttribute("class","isSelected");
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
