
function jsInclude(files, target) {
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("category_tools.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://sogo-connector/content/addressbook/categories.js", 
                "chrome://sogo-connector/content/general/vcards.utils.js",
                "chrome://sogo-connector/content/general/sync.addressbook.groupdav.js"])


function categoryObject() {
        this.action = "";
        this.action_val1 = "";
        this.action_val2 = "";        

        this.initialized = false;
    
        this.foundCategories = new Array();
        this.emptyCategories = new Array();
        this.categoryList = new Array();
        this.bcc = new Array();
        this.emails = new Array();
        this.abSize = 0;
    
        this.lastCategoryUpdate = 0;               
}


function updatePeopleSearchInput(name) {
    if (name == "") {
        document.getElementById("peopleSearchInput").value = "";
    } else {
        document.getElementById("peopleSearchInput").value = prefixForPeopleSearch + ": " + name
    }
}  


function getCardsFromEmail(email) {
        let abURI = CatMan.selectedDirectory;

        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

        if (!gQueryURIFormat) {
            gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
        }
        
        let EmailQuery = "(PrimaryEmail,bw,@V)(SecondEmail,bw,@V)";
        let searchQuery = EmailQuery.replace(/@V/g, encodeURIComponent(email));
    
	//special treatment for googlemail.com
	if (email.indexOf("gmail.com")>0) {
		searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("gmail.com","googlemail.com")));
	} else if (email.indexOf("googlemail.com")>0) {
		searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("googlemail.com","gmail.com")));
	}
	
	
        return abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
}

function getUIDFromCard(card) {
    let CardID = "";
    // if (!isGroupdavDirectory(uri)) from sync.addressbook.groupdav.js
    try {
        CardID = card.getPropertyAsAString("groupDavKey"); //CardUID
    } catch (ex) {}     
    if (CardID == "") {
        alert("We have a card without ID (groupDavKey): " + getUserNamefromCard(card,"NoName"));
    }
    return CardID;
}

function getCardFromUID(UID) {
        let abURI = CatMan.selectedDirectory;

        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

        if (!gQueryURIFormat) {
            gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
        }
        
        let UUIDQuery = "(groupDavKey,bw,@V)";
        let searchQuery = UUIDQuery.replace(/@V/g, encodeURIComponent(UID));
    
        let result = abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
        if (result.hasMoreElements()) {
                    return result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        } else {
            return null;
        }
}

function getCategoriesfromCard(card) {
    let catArray = [];
    try {
        //this line is derived from chrome://sogo-connector/content/addressbook/cardview-overlay.js
        catArray = card.getPropertyAsAString("Categories").split("\u001A");                    
    } catch (ex) {}  
    return catArray;
}

function getUserNamefromCard(card,fallback) {
    let userName = "";
    try {
        userName = card.getPropertyAsAString("DisplayName"); 
    } catch (ex) {}                
    if (userName == "") try {
        userName = card.getPropertyAsAString("FirstName") + " " + card.getPropertyAsAString("LastName");
    } catch (ex) {}                
    if (userName == "") userName = fallback;                       
    return userName;
}

function doCategorySearch() {
        let abURI = GetSelectedDirectory();

        if (!gQueryURIFormat) {
            gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
        }

        if (document.getElementById("CardViewBox") != null) {
            ClearCardViewPane();
        }
        
        let UUIDQuery = "(groupDavKey,bw,@V)";
        let searchQuery = "";
        
        if (CatMan.selectedCategory in CatMan.foundCategories) {
            //build searchQuery from UUID List of selected category
            for (let i=0; i<CatMan.foundCategories[CatMan.selectedCategory].length; i++) {
                searchQuery = searchQuery + UUIDQuery.replace(/@V/g, encodeURIComponent(CatMan.foundCategories[CatMan.selectedCategory][i]));
            }        
        }
    
//        SetAbView(GetSelectedDirectory() + "?" + "(or" + searchQuery + ")");
        SetAbView(abURI + "?" + "(or" + searchQuery + ")");
        if (document.getElementById("CardViewBox") != null && CatMan.selectedCategory in CatMan.foundCategories) {
            SelectFirstCard();  
        }
        updatePeopleSearchInput(CatMan.selectedCategory);
}
    

function updateCategories(mode,oldName,newName) {
    //get address book manager
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
    let addressBook = abManager.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself

    let cards = addressBook.childCards;
    let requireSync = false;
    
    while (cards.hasMoreElements()) {
        card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        let catArray = getCategoriesfromCard(card);
        let rebuildCatArray = [];
            
        if (catArray.length > 0) {  
            let writeCategoriesToCard = false;
            for (let i=0; i < catArray.length; i++) {
                //Before we process this card, we check for a category delete or category rename request and do the manipulation on the fly, writeback is done later
                if (mode == "rename" && catArray[i] == oldName) {
                    catArray[i] = newName;
                    writeCategoriesToCard = true;
                }
                if (mode == "remove" && catArray[i] == oldName) {
                    writeCategoriesToCard = true;
                    continue;
                }
                //It is easier to build a new array, instead of deleting an entry out of an array, which is being looped
                rebuildCatArray.push(catArray[i]);                 
            }
            
            //was there a manipulation of the card due to rename or delete request? If so, write that into the card
            if (writeCategoriesToCard) {
                card.setProperty("Categories", arrayToMultiValue(rebuildCatArray));	//arrayToMultiValue is part of chrome://sogo-connector/content/general/vcards.utils.js
                card.setProperty("groupDavVersion", "-1");
                addressBook.modifyCard(card);
                requireSync=true;
            }                    
        }                    
    }
    
    //trigger a sync request, if cards had been changed
    if (requireSync) {
        if (isGroupdavDirectory(addressBook.URI)) {
            SynchronizeGroupdavAddressbook(addressBook.URI);
        }
    }        
}


function scanCategories() {    
    //get address book manager
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
    let addressBook = abManager.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself

    //concept decision: we remove empty categories on addressbook switch (select) 
    //-> the sogo category array is constantly cleared and build from scan results
    CatMan.foundCategories = new Array();
    CatMan.categoryList = new Array();
    CatMan.bcc = new Array();
    CatMan.emails = new Array();
    CatMan.abSize = 0;

    let cards = addressBook.childCards;

    while (cards.hasMoreElements()) {
        CatMan.abSize++;
        card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        let catArray = getCategoriesfromCard(card);

        
        if (catArray.length > 0) {
            //this person belongs to at least one category, extract UUID
            let CardID = getUIDFromCard(card);
    
            //add card to all categories it belongs to
            for (let i=0; i < catArray.length; i++) {                
                //is this category known already?
                //-> foundCategories is using Strings as Keys
                if (catArray[i] in CatMan.foundCategories == false) {
                    CatMan.foundCategories[catArray[i]] = new Array();
                    CatMan.bcc[catArray[i]] = new Array();
                    CatMan.emails[catArray[i]] = new Array();
                    CatMan.categoryList.push(catArray[i]);
                }
                
                //add card to category
                CatMan.foundCategories[catArray[i]].push(CardID);
                CatMan.emails[catArray[i]].push(card.primaryEmail);
                var bccfield = "";
		if (card.displayName != "") {
		    bccfield = "\"" + card.displayName + "\"" + " <" + card.primaryEmail + ">";
                } else {
                    bccfield = card.primaryEmail;
                }
		CatMan.bcc[catArray[i]].push(bccfield);
		
            }
            
        }                    
    }
}
