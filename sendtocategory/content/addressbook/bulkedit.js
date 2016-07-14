let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://messenger/content/mailCore.js");
loader.loadSubScript("chrome://messenger/content/addressbook/addressbook.js");
loader.loadSubScript("chrome://messenger/content/addressbook/abCommon.js");
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

//###################################################
//adding additional functions to the jbCatMan Object
//###################################################

jbCatMan.loadBulkList = function () {
  //the local data object contains no data (in this session scanCategories has not been called), replace data object by passed data
  jbCatMan.data = window.arguments[2];
  document.title = window.arguments[1];

  //Update Label
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+jbCatMan.data.selectedCategory+"]");

  let bulkbox = document.getElementById("CatManBulkTextBox");
  let value = "";
  if (jbCatMan.data.selectedCategory in jbCatMan.data.emails) {
    for (let i=0; i<jbCatMan.data.emails[jbCatMan.data.selectedCategory].length; i++) {
      value = value + jbCatMan.data.emails[jbCatMan.data.selectedCategory][i] + "\n";
    }
  }
  bulkbox.value=value;
  
  //give feedback to users about possible category members without primaryEmails, 
  //which will not be altered
  if (jbCatMan.data.selectedCategory in jbCatMan.data.membersWithoutPrimaryEmail && jbCatMan.data.membersWithoutPrimaryEmail[jbCatMan.data.selectedCategory].length != 0) {
    document.getElementById("CatManDescriptionNoPrimaryEmail").textContent = jbCatMan.locale.descriptionNoPrimaryEmail.replace("##counts##",jbCatMan.data.membersWithoutPrimaryEmail[jbCatMan.data.selectedCategory].length);
  } else {
    document.getElementById("CatManInfoBox").style.display = "none";
  }

}



jbCatMan.checkInput = function () {
  let status = true;
  for (let j=0; j<jbCatMan.data.validatorFields.length; j++) {
    let checkField = document.getElementById(jbCatMan.data.validatorFields[j]);

    if (checkField.tagName == "menulist" && checkField.selectedIndex == 0) {
      status = false;
    }

    if (checkField.tagName == "textbox" && checkField.value == "") {
      status = false;
    }
  }

  document.documentElement.getButton("accept").disabled = !status;
  return status;
}



jbCatMan.stopme = function (e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}



jbCatMan.loadValidateList = function() {
  //the local data object contains no data (in this session scanCategories has not been called), replace data object by passed data
  jbCatMan.data = window.arguments[2];
  document.title = window.arguments[1];

  jbCatMan.data.validatorFields = new Array();
  jbCatMan.data.toBeValidated = new Array();

  let testToBeValidated = jbCatMan.data.bulkList.toLowerCase().replace(",","\n").replace(";","\n").split(/\r\n|\r|\n/g);

  //run through the list, trim and check for double
  for (let i=0; i < testToBeValidated.length; i++) {
    let email = testToBeValidated[i].trim();
    if (jbCatMan.data.toBeValidated.indexOf(email)<0) {
      jbCatMan.data.toBeValidated.push(email);
    }
  }

  let validatorList = document.getElementById("CatManValidatorList");
  validatorList.clearSelection();
  validatorList.style.visibility = 'hidden'; 

  document.documentElement.getButton("accept").disabled = true;
  window.setTimeout(function() { jbCatMan.validateEmailList(0); }, 20);
}



jbCatMan.validateEmailList = function (i) {
  if (i < jbCatMan.data.toBeValidated.length) {
    let validatorList = document.getElementById("CatManValidatorList");
    let email = jbCatMan.data.toBeValidated[i];

    document.getElementById("CatManValidatorProgressBar").value = (i+1)*100/jbCatMan.data.toBeValidated.length;

    if (email != "") {

      let CatMan_popup_name = "";
      let CatMan_popup_select = 0;
      let memberIdx = -1;

      let cardsIterator = jbCatMan.getCardsFromEmail(email);
      let cards = [];
      while (cardsIterator.hasMoreElements()) {
              cards.push(cardsIterator.getNext().QueryInterface(Components.interfaces.nsIAbCard));
      }

      let newtemplate = null;

      switch(cards.length)
      {
        case 0: //NOTOK
          //copy from template
          newtemplate = document.getElementById("CatManListTemplate_NOTOK").cloneNode(true);
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");

          //we have two input fields, add both to the checklist
          newtemplate.childNodes[1].childNodes[0].addEventListener("change", function(){ jbCatMan.checkInput(); this.setAttribute('value',this.value); }, false);
          newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_FirstName_"+i);
          jbCatMan.data.validatorFields.push("CatManValidator_FirstName_"+i);
          newtemplate.childNodes[1].childNodes[1].addEventListener("change",function(){ jbCatMan.checkInput(); this.setAttribute('value',this.value); }, false);
          newtemplate.childNodes[1].childNodes[1].setAttribute("id","CatManValidator_LastName_"+i);
          jbCatMan.data.validatorFields.push("CatManValidator_LastName_"+i);
        break;

        case 1://OK
          //get name
          let userName = jbCatMan.getUserNamefromCard(cards[0], jbCatMan.locale.bulkEditNoName + " ("+email+")");
          let cardID = jbCatMan.getUIDFromCard(cards[0]);
          
          //copy from template
          newtemplate = document.getElementById("CatManListTemplate_OK").cloneNode(true);
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");
          //add username via DOM manipulation
          newtemplate.setAttribute("UID",cardID);
          newtemplate.childNodes[1].childNodes[0].setAttribute("value",userName);
        break;

        default: //DOUBLE
          //is one of the doubles already in this category?? We grab the first one!
          for (let j=0;j<cards.length && memberIdx == -1 ;j++) {
            let cats = jbCatMan.getCategoriesfromCard(cards[j]);
            if (cats.indexOf(jbCatMan.data.selectedCategory) != -1) {
              memberIdx = j;
            }
          }

          if (memberIdx != -1) {
            newtemplate = document.getElementById("CatManListTemplate_DOUBLEOK").cloneNode(true);
          } else {
            newtemplate = document.getElementById("CatManListTemplate_DOUBLE").cloneNode(true);
          }
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");

          //add category menu items via DOM manipulation
          let menuItem = document.createElement("menuitem");
          menuItem.setAttribute("label", jbCatMan.locale.bulkEditChoose);
          newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);

          for (let j=0;j<cards.length;j++) {
            let menuItem = document.createElement("menuitem");

            if (memberIdx == j) {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j], jbCatMan.locale.bulkEditNoName + " ("+email+")") + " (*)");
            } else {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j], jbCatMan.locale.bulkEditNoName + " ("+email+")"));
            }
            menuItem.setAttribute("value", jbCatMan.getUIDFromCard(cards[j]));
            newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);
          }

          newtemplate.childNodes[1].childNodes[0].addEventListener("load", function(){ this.selectedIndex=(memberIdx+1); this.parentNode.parentNode.setAttribute('UID',this.value); }, false);
          newtemplate.childNodes[1].childNodes[0].addEventListener("command", function(){ this.parentNode.parentNode.setAttribute('UID',this.value); jbCatMan.checkInput(); }, false);
          newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_Menu_"+i);
          jbCatMan.data.validatorFields.push("CatManValidator_Menu_"+i);
        break;

      }

      //common content manipulation via DOM
      newtemplate.childNodes[0].childNodes[0].setAttribute("value",email);
      //append to list
      validatorList.appendChild(newtemplate);

    }

    //recursive loop, to be able to draw progressbar
    window.setTimeout(function() { jbCatMan.validateEmailList(i+1); }, 20);

  } else {

    //we are done, hide progressbar
    document.getElementById("CatManValidatorProgressBar").style.display = 'none';
    document.getElementById("CatManValidatorList").style.visibility = 'visible'; 

    //activate OK button, if possible
    jbCatMan.checkInput();

  }
}



jbCatMan.saveList = function (){
  //the local data object contains no data (in this session scanCategories has not been called), replace data object by passed data
  jbCatMan.data = window.arguments[2];
  document.title = window.arguments[1];

  //Update Label
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+jbCatMan.data.selectedCategory+"]");

  //walk recursively through the saveList (DOM richlist) and process item by item
  jbCatMan.data.cardsToBeRemovedFromCategory = new Array();
  jbCatMan.data.processedUIDs = new Array();
  if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
    //copy the array of members of the selectedCategory, every member found in the validatorList will be removed from this copy
    //so in the end, the copy will contain those members, which are no longer part of this category
    jbCatMan.data.cardsToBeRemovedFromCategory = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].slice();
  }
  window.setTimeout(function() { jbCatMan.saveList_AddCards(0); }, 20);
}



jbCatMan.saveList_AddCards = function (i) {
  let CatManSaverList = document.getElementById("CatManSaverList");
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
  let addressBook = abManager.getDirectory(jbCatMan.data.selectedDirectory);

  if (i < jbCatMan.data.saveList.childNodes.length) {

    document.getElementById("CatManSaverProgressBar").value = 80*(i/jbCatMan.data.saveList.childNodes.length); //will not reach 80%

    if (jbCatMan.data.saveList.childNodes[i].getAttribute("hidden") == false && jbCatMan.data.saveList.childNodes[i].tagName == "richlistitem") {
      let UID = jbCatMan.data.saveList.childNodes[i].getAttribute("UID");

      if (UID != "") {

        //OK, DOUBLE, or DOUBLEOK
        let name = UID;
        let card = jbCatMan.getCardFromUID(UID);
        let idx = jbCatMan.data.cardsToBeRemovedFromCategory.indexOf(UID);

        //Has this UID been processed already? Do not add the same contact twice
        if (jbCatMan.data.processedUIDs.indexOf(UID)!=-1)  {
          //Ignore double contact
          name  = jbCatMan.getUserNamefromCard(card, jbCatMan.locale.bulkEditNoName + " (UID: "+UID+")");
          let row = document.createElement('listitem');
          let cell = document.createElement('listcell');
          cell.setAttribute('label',  "skipping contact [" + name + "], because he is already part of ["+jbCatMan.data.selectedCategory+"]" );
          row.appendChild(cell);
          CatManSaverList.appendChild(row);
        } else {
          if (card==null) {
              //ERROR
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "Error: ValidatorList contains unknown UID [" + UID+ "], something is wrong." );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
          } else {
            name  = jbCatMan.getUserNamefromCard(card, jbCatMan.locale.bulkEditNoName + " (UID: "+UID+")");
            jbCatMan.data.processedUIDs.push(UID);
            if(idx < 0) {
              //Selected card is not part of this category, ADD IT
              let cats = jbCatMan.getCategoriesfromCard(card);
              cats.push(jbCatMan.data.selectedCategory);
              jbCatMan.setCategoriesforCard(card, cats);
              jbCatMan.modifyCard(card);
              //Log
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "add contact [" + name+ "] to ["+jbCatMan.data.selectedCategory+"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            } else {
              //Selected card is already part of this category, KEEP IT (remove it from the removelist)
              jbCatMan.data.cardsToBeRemovedFromCategory.splice(idx, 1);
              //Log
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "keep contact [" + name + "] in ["+jbCatMan.data.selectedCategory+"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            }
          }
        }
        
      } else { 

        //NOTOK - add new contact to addressbook, also add him to category jbCatMan.selectedCategory
        let card = jbCatMan.newCard(addressBook.URI);
        card.setProperty("FirstName", jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value")); 
        card.setProperty("LastName", jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value"));
        card.setProperty("DisplayName", jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value")); 

        card.primaryEmail = jbCatMan.data.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value");
        let cats = new Array();
        cats.push(jbCatMan.data.selectedCategory);
        jbCatMan.setCategoriesforCard(card, cats);
        addressBook.addCard(card);
        //Log
        let row = document.createElement('listitem');
        let cell = document.createElement('listcell');
        cell.setAttribute('label',  "create new contact [" + jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.data.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value") + " <" + jbCatMan.data.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value") +">] and add it to ["+jbCatMan.data.selectedCategory+"]" );
        row.appendChild(cell);
        CatManSaverList.appendChild(row);

      }
    }
    window.setTimeout(function() { jbCatMan.saveList_AddCards(i+1); }, 20);

  } else {

    //we are done adding cards, now remove cards, which no longer belongto the category
    window.setTimeout(function() { jbCatMan.saveList_RemoveCards(0); }, 20);

  }
}



jbCatMan.saveList_RemoveCards = function (i) {    
  let CatManSaverList = document.getElementById("CatManSaverList");
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
  let addressBook = abManager.getDirectory(jbCatMan.data.selectedDirectory);
  
  if (i <  jbCatMan.data.cardsToBeRemovedFromCategory.length) {
    document.getElementById("CatManSaverProgressBar").value = 80 + 20*(i+1/jbCatMan.data.cardsToBeRemovedFromCategory.length); // will reach 100%

    let UID = jbCatMan.data.cardsToBeRemovedFromCategory[i];
    let name = UID;
    let card = jbCatMan.getCardFromUID(UID);
    if (card==null) {
      //ERROR
      let row = document.createElement('listitem');
      let cell = document.createElement('listcell');
      cell.setAttribute('label',  "Error: RemoveList contains unknown UID [" + UID + "], something is wrong." );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else if (card.primaryEmail == "") {
      //This card has no primary email and must not be removed.
      name  = jbCatMan.getUserNamefromCard(card, jbCatMan.locale.bulkEditNoName + " (UID: "+UID+")");
      let row = document.createElement('listitem');
      let cell = document.createElement('listcell');
      cell.setAttribute('label',  "keep contact [" + name  + "] in [" + jbCatMan.data.selectedCategory + "]" );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else {
      name  = jbCatMan.getUserNamefromCard(card, jbCatMan.locale.bulkEditNoName + " (UID: "+UID+")");
      //Contact is no longer part of this category - REMOVE IT
      let cats = jbCatMan.getCategoriesfromCard(card);
      let idx = cats.indexOf(jbCatMan.data.selectedCategory);
      if (idx<0) {
        //It looks like, this contact is not part of this category
      } else {
        cats.splice(idx, 1);
        jbCatMan.setCategoriesforCard(card, cats);
        jbCatMan.modifyCard(card);
        //Log
        let row = document.createElement('listitem');
        let cell = document.createElement('listcell');
        cell.setAttribute('label',  "remove contact [" + name  + "] from [" + jbCatMan.data.selectedCategory + "]" );
        row.appendChild(cell);
        CatManSaverList.appendChild(row);
      }
    }
    window.setTimeout(function() { jbCatMan.saveList_RemoveCards(i+1); }, 20);

  } else {

    //we are done
    document.getElementById("CatManSaverProgressBar").style.display = 'none';

  }
}