var jbCatMan = window.opener.jbCatMan;
var jbCatManEditDialog = {}

jbCatManEditDialog.Init = function () {
  jbCatMan.dump("Begin with EditDialogInit()",1);

  //Hide SOGo Category Tab and deactivate all SOGo update/sync functions - if installed
  if (jbCatMan.sogoInstalled) {
    let categoriesTabButton = document.getElementById("categoriesTabButton");
    if (categoriesTabButton) categoriesTabButton.style.display = 'none';

  /* Bugfix "andre jutisz"
    //remove SOGo hook on OK Button (either NEW or EDIT dialog)
    if (typeof OldNewCardOKButton != 'undefined' && typeof NewCardOKButton != 'undefined') {
      NewCardOKButton = OldNewCardOKButton
    } else if (typeof OldEditCardOKButton != 'undefined' && typeof EditCardOKButton != 'undefined') {
      EditCardOKButton = OldEditCardOKButton
    } else {
      jbCatMan.dump("Could not remove SOGo listerner! This is bad!\n");
    } */
  }

  jbCatManEditDialog.AllCatsArray = jbCatMan.data.categoryList;
  jbCatManEditDialog.CatsArray = [];
  try {
    jbCatManEditDialog.CatsArray = gEditCard.card.getPropertyAsAString("Categories").split("\u001A");
  } catch (ex) {}  

  // add the combo boxes for each category
  for (let i = 0; i < jbCatManEditDialog.CatsArray.length; i++) {
    jbCatManEditDialog.AppendCategory(jbCatManEditDialog.CatsArray[i]);
  }

  // add focus event on empty field
  let emptyField = document.getElementById("abCatManEmptyCategory");
  emptyField.addEventListener("focus", jbCatManEditDialog.OnEmptyFieldFocus, false);  

  jbCatMan.dump("Done with EditDialogInit()",-1);
}





jbCatManEditDialog.OnEmptyFieldFocus = function (event) {
  let newCategory = jbCatManEditDialog.AppendCategory("");
  newCategory.focus();
  event.preventDefault = true;
}

jbCatManEditDialog.OnCategoryBlur = function () {
  let value = this.inputField.value.replace(/(^[ ]+|[ ]+$)/, "", "g");
  if (value.length == 0) {
    this.parentNode.removeChild(this);
  }
}

jbCatManEditDialog.OnCategoryChange = function () {
    if (this.selectedIndex == -1) { // text field was changed
        let value = this.inputField.value;
        if (value.length > 0) {
            if (jbCatManEditDialog.AllCatsArray.indexOf(value) < 0) {
                jbCatManEditDialog.AllCatsArray.push(value);
                let box = document.getElementById("abCatManCategories");
                let lists = box.getElementsByTagName("menulist");
                for (let i = 0; i < lists.length; i++) {
                    jbCatManEditDialog.ResetCategoriesMenu(lists[i]);
                }
            }
        }
    }
}



//triggered by OK Button
jbCatManEditDialog.Save = function () {
  jbCatMan.dump("Begin with EditDialogSave()",1);

  let vbox = document.getElementById("abCatManCategories");
  let menuLists = vbox.getElementsByTagName("menulist");
  let catsArray = [];
  for (var i = 0; i < menuLists.length; i++) {
    let value = menuLists[i].inputField.value.replace(/(^[ ]+|[ ]+$)/, "", "g");
    if (value.length > 0 && catsArray.indexOf(value) == -1) {
      catsArray.push(value);
    }
  }
  jbCatMan.dump("Setting categories to: " + catsArray.join(","));

  jbCatMan.setCategoriesforCard(gEditCard.card, catsArray);
  //BugFix "andre jutisz"
  //jbCatMan.modifyCard(gEditCard.card);
  jbCatMan.dump("Done with EditDialogSave()",-1);
}

jbCatManEditDialog.AppendCategory = function (catValue) {  
    let vbox = document.getElementById("abCatManCategories");
    let menuList = document.createElement("menulist");
    menuList.setAttribute("editable", true);
    menuList.addEventListener("blur", jbCatManEditDialog.OnCategoryBlur, false);
    menuList.addEventListener("change", jbCatManEditDialog.OnCategoryChange, false);
    menuList.addEventListener("command", jbCatManEditDialog.OnCategoryChange, false);
    jbCatManEditDialog.ResetCategoriesMenu(menuList);
    menuList.value = catValue;
    vbox.appendChild(menuList);
    return menuList;
}

jbCatManEditDialog.ResetCategoriesMenu = function (menu) {
    let popups = menu.getElementsByTagName("menupopup");
    for (let i = 0; i < popups.length; i++) {
        menu.removeChild(popups[i]);
    }

    let menuPopup = document.createElement("menupopup");
    for (let k = 0; k < jbCatManEditDialog.AllCatsArray.length; k++) {
        let item = document.createElement("menuitem");
        item.setAttribute("label", jbCatManEditDialog.AllCatsArray[k]);
        menuPopup.appendChild(item);
    }
    menu.appendChild(menuPopup);
}







//Init on load
window.addEventListener("load", function() { jbCatManEditDialog.Init(); }, false);

//Add eventlistener for OK Button to save changes
window.addEventListener("dialogaccept", function() { jbCatManEditDialog.Save(); }, false);

// Bugfix "andre jutisz": I fail to understand how SOGo catches the creation of a new card (new card
// dialog) and I am at the time unable to replace the SOGo code (mine was buggy) - using SOGo code 
// of OK-Button in NewCardDialog and EditCardDialog again. However this would always overwrite 
// my own category settings - as a quickfix I simply clear the SOGo function, which writes the categories 
// from the GUI into the card property. 
if (SCSaveCategories) SCSaveCategories = function() {
  dump("Doing nothing!\n");
}
