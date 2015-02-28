
let CatMan = null;
let CatManValidatorFields = null;

function loadBulkList() {
    //make it globaly
    CatMan = window.arguments[2];
    document.title = window.arguments[1];
    
    //Update Label
    document.getElementById("CatManBulkTextBoxLabel").value = CatManBulkTextBoxLabel.replace("##name##","["+CatMan.selectedCategory+"]");

    var bulkbox = document.getElementById("CatManBulkTextBox");        
    var value = "";
    for (var i=0; i<CatMan.emails[CatMan.selectedCategory].length; i++) {
        value = value + CatMan.emails[CatMan.selectedCategory][i] + "\n";
    }     
    bulkbox.value=value;
}

function checkInput() {
    let status = true;
    for (let j=0; j<CatManValidatorFields.length; j++) {
        checkField = document.getElementById(CatManValidatorFields[j]);

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

function stopme(e) {
    e.stopPropagation();
    e.preventDefault();
    return fasle;
}


function loadValidateList() {
    //make it globaly
    CatMan = window.arguments[2];
    document.title = window.arguments[1];
    CatManValidatorFields = new Array();
    
    toBeValidatedPre = CatMan.bulkList.toLowerCase().replace(",","\n").replace(";","\n").split(/\r\n|\r|\n/g);
    CatMan.toBeValidated = new Array();

    //run through the list, trim and check for double
    for (let i=0; i < toBeValidatedPre.length; i++) {
        let email = toBeValidatedPre[i].trim();
        if (CatMan.toBeValidated.indexOf(email)<0) {
            CatMan.toBeValidated.push(email);
        }
    }
    
    let validatorList = document.getElementById("CatManValidatorList");
    validatorList.clearSelection();

    document.documentElement.getButton("accept").disabled = true;
    validatorList.style.visibility = 'hidden'; 
    window.setTimeout(function() { validateEmailList(0); }, 20);
}


function validateEmailList(i) {

    if (i < CatMan.toBeValidated.length) {
        let validatorList = document.getElementById("CatManValidatorList");
        email = CatMan.toBeValidated[i];

        document.getElementById("CatManValidatorProgressBar").value = (i+1)*100/CatMan.toBeValidated.length;
        
        if (email != "") {

            let CatMan_popup_name = "";
            let CatMan_popup_select = 0;
            let memberIdx = -1;
            
            let cardsIterator = getCardsFromEmail(email);
            let cards = [];
            while (cardsIterator.hasMoreElements()) {
                    cards.push(cardsIterator.getNext().QueryInterface(Components.interfaces.nsIAbCard));
            }

            var newtemplate = null;
            
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
                    newtemplate.childNodes[1].childNodes[0].addEventListener("change", function(){ checkInput(); this.setAttribute('value',this.value); }, false);
                    newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_FirstName_"+i);
                    CatManValidatorFields.push("CatManValidator_FirstName_"+i);
                    newtemplate.childNodes[1].childNodes[1].addEventListener("change",function(){ checkInput(); this.setAttribute('value',this.value); }, false);
                    newtemplate.childNodes[1].childNodes[1].setAttribute("id","CatManValidator_LastName_"+i);
                    CatManValidatorFields.push("CatManValidator_LastName_"+i);                                
                break;
                
                case 1://OK    
                    //get name
                    let userName = getUserNamefromCard(cards[0],email);
                    let cardID = getUIDFromCard(cards[0]);
                    
                    //copy from template
                    var newtemplate = document.getElementById("CatManListTemplate_OK").cloneNode(true);
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
                        cats = getCategoriesfromCard(cards[j]);
                        if (cats.indexOf(CatMan.selectedCategory) != -1) {
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
                    menuItem.setAttribute("label", bulkEditChoose);
                    newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);                    

                    for (let j=0;j<cards.length;j++) {
                        let menuItem = document.createElement("menuitem");

                        if (memberIdx == j) {
                            menuItem.setAttribute("label", getUserNamefromCard(cards[j],bulkEditNoName) + " (*)");
                        } else {
                            menuItem.setAttribute("label", getUserNamefromCard(cards[j],bulkEditNoName));
                        }
                        menuItem.setAttribute("value", getUIDFromCard(cards[j]));
                        newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);                    
                    }

                    newtemplate.childNodes[1].childNodes[0].addEventListener("load", function(){ this.selectedIndex=(memberIdx+1); this.parentNode.parentNode.setAttribute('UID',this.value); }, false);
                    newtemplate.childNodes[1].childNodes[0].addEventListener("command", function(){ this.parentNode.parentNode.setAttribute('UID',this.value); checkInput(); }, false);
                    newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_Menu_"+i);
                    CatManValidatorFields.push("CatManValidator_Menu_"+i);
                break;

            }

            //common content manipulation via DOM
            newtemplate.childNodes[0].childNodes[0].setAttribute("value",email);
            //append to list
            validatorList.appendChild(newtemplate);                


        }
        //recursive loop, to be able to draw progressbar        
        window.setTimeout(function() { validateEmailList(i+1); }, 20);
    

    } else {
        //we are done, hide progressbar
        document.getElementById("CatManValidatorProgressBar").style.display = 'none';
        document.getElementById("CatManValidatorList").style.visibility = 'visible'; 
        
        //activate OK button, if possible
        checkInput();
    }
    
}


function saveList(){
    //make it globaly
    CatMan = window.arguments[2];
    document.title = window.arguments[1];
   
    //Update Label
    document.getElementById("CatManBulkTextBoxLabel").value = CatManBulkTextBoxLabel.replace("##name##","["+CatMan.selectedCategory+"]");
    
    //walk recursively through the saveList (DOM richlist) and process item by item
    CatMan.CardsToBeRemovedFromCategory = new Array();
    CatMan.processedUIDs = new Array();
    if (CatMan.selectedCategory in CatMan.foundCategories) {
        //aopy the array of members of the selectedCategory, every member found in the validatorList will be removed from this copy
        //so in the end, the copy will contain those members, which are no longer part of this category
        CatMan.CardsToBeRemovedFromCategory = CatMan.foundCategories[CatMan.selectedCategory].slice();
    }
    window.setTimeout(function() { saveList_AddCards(0); }, 20);	
}

function saveList_AddCards(i) {
    let CatManSaverList = document.getElementById("CatManSaverList");
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
    let addressBook = abManager.getDirectory(CatMan.selectedDirectory); 
    
    if (i < CatMan.saveList.childNodes.length) {

        document.getElementById("CatManSaverProgressBar").value = 80*(i/CatMan.saveList.childNodes.length); //will not reach 80%

        if (CatMan.saveList.childNodes[i].getAttribute("hidden") == false && CatMan.saveList.childNodes[i].tagName == "richlistitem") {
            let UID = CatMan.saveList.childNodes[i].getAttribute("UID");
            
            if (UID != "") {  //OK, DOUBLE, or DOUBLEOK
                            let name = UID;
                            let card = getCardFromUID(UID);
                            let idx = CatMan.CardsToBeRemovedFromCategory.indexOf(UID);

                            //Has this UID been processed already? Do not add the same contact twice
                            if (CatMan.processedUIDs.indexOf(UID)!=-1)  {
                                //Ignore double contact
                                name  = getUserNamefromCard(card,UID);
                                let row = document.createElement('listitem');
                                let cell = document.createElement('listcell');
                                cell.setAttribute('label',  "skipping contact [" + name + "], because he is already part of ["+CatMan.selectedCategory+"]" );
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
                                    name  = getUserNamefromCard(card,UID);
                                    CatMan.processedUIDs.push(UID);
                                    if(idx < 0) {
                                        //Selected card is not part of this category, ADD IT
                                        let cats = getCategoriesfromCard(card);
                                        cats.push(CatMan.selectedCategory);
                                        card.setProperty("Categories", arrayToMultiValue(cats));
                                        card.setProperty("groupDavVersion", "-1");
                                        addressBook.modifyCard(card);                          
                                        //Log
                                        let row = document.createElement('listitem');
                                        let cell = document.createElement('listcell');
                                        cell.setAttribute('label',  "add contact [" + name+ "] to ["+CatMan.selectedCategory+"]" );
                                        row.appendChild(cell);
                                        CatManSaverList.appendChild(row);                    
                                    } else {
                                        //Selected card is already part of this category, KEEP IT (remove it from the removelist)
                                        CatMan.CardsToBeRemovedFromCategory.splice(idx, 1);
                                        //Log
                                        let row = document.createElement('listitem');
                                        let cell = document.createElement('listcell');
                                        cell.setAttribute('label',  "keep contact [" + name + "] in ["+CatMan.selectedCategory+"]" );
                                        row.appendChild(cell);
                                        CatManSaverList.appendChild(row);                                        
                                    }
                                }
                            }
                            
            } else { //NOTOK - add new contact to addressbook, also add him to category CatMan.selectedCategory                
                let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
                card.setProperty("FirstName", CatMan.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value")); 
                card.setProperty("LastName", CatMan.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value"));
                card.setProperty("DisplayName", CatMan.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + CatMan.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value")); 
		uuid = new UUID();
		card.setProperty("groupDavKey",uuid); 

		card.primaryEmail = CatMan.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value");
                let cats = new Array();
                cats.push(CatMan.selectedCategory);
                card.setProperty("Categories", arrayToMultiValue(cats));
                let newCard = addressBook.addCard(card);                
                //Log
                let row = document.createElement('listitem');
                let cell = document.createElement('listcell');
                cell.setAttribute('label',  "create new contact [" + CatMan.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + CatMan.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value") + " <" + CatMan.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value") +">] and add it to ["+CatMan.selectedCategory+"]" );
                row.appendChild(cell);
                CatManSaverList.appendChild(row);                    
            }
        }
        window.setTimeout(function() { saveList_AddCards(i+1); }, 20);

        
    } else {

        //we are done adding cards, now remove cards, which no longer belongto the category
        window.setTimeout(function() { saveList_RemoveCards(0); }, 20);
        
    }
}

function saveList_RemoveCards(i) {    
    let CatManSaverList = document.getElementById("CatManSaverList");
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
    let addressBook = abManager.getDirectory(CatMan.selectedDirectory); 
    
    if (i <  CatMan.CardsToBeRemovedFromCategory.length) {
        document.getElementById("CatManSaverProgressBar").value = 80 + 20*(i+1/CatMan.CardsToBeRemovedFromCategory.length); // will reach 100%

        let UID = CatMan.CardsToBeRemovedFromCategory[i];
        let name = UID;
        let card = getCardFromUID(UID);
        if (card==null) {
            //ERROR
            let row = document.createElement('listitem');
            let cell = document.createElement('listcell');
            cell.setAttribute('label',  "Error: RemoveList contains unknown UID [" + UID+ "], something is wrong." );
            row.appendChild(cell);
            CatManSaverList.appendChild(row);                    
        } else {
            name  = getUserNamefromCard(card,UID);
            //Contact is no longer part of this category - REMOVE IT
            let cats = getCategoriesfromCard(card);
            let idx = cats.indexOf(CatMan.selectedCategory);
            if (idx<0) {
                //It looks like, this contact is not part of this category
            } else {
                cats.splice(idx, 1);
                card.setProperty("Categories", arrayToMultiValue(cats));
                card.setProperty("groupDavVersion", "-1");
                addressBook.modifyCard(card);                          
                //Log
                let row = document.createElement('listitem');
                let cell = document.createElement('listcell');
                cell.setAttribute('label',  "remove contact [" + name  + "] from ["+CatMan.selectedCategory+"]" );
                row.appendChild(cell);
                CatManSaverList.appendChild(row);                    
            }
        }       
        window.setTimeout(function() { saveList_RemoveCards(i+1); }, 20);

    } else {        
        //we are done
        if (isGroupdavDirectory(addressBook.URI)) {
            SynchronizeGroupdavAddressbook(addressBook.URI);
        }
        document.getElementById("CatManSaverProgressBar").style.display = 'none';
    }
}
