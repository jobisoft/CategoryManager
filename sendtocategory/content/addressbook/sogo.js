// if this was/is a sogo book, it will have an url stored in preferences
jbCatMan.getSogoUrl=function(abURI) {

    let url = "";
  
    if (abURI && abURI.search("mab/MailList") == -1 && abURI.search("moz-abmdbdirectory://") == 0) {
      let abManager=Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
      let ab=abManager.getDirectory(abURI);
      let prefId=ab.dirPrefId;

      if (prefId != null && prefId != "") {
        let preferencesService=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        let prefURLPath="extensions.ca.inverse.addressbook.groupdav." + prefId + ".url";
        
        try {
          url=preferencesService.getCharPref(prefURLPath);
        } catch(e) { 
          return "";
        }
        
        if (url && url[url.length - 1] != '/') {
                url += '/';
        }
        
      }
    }

    return url;
}


jbCatMan.isSogoBook=function (abURI) {
  if (jbCatMan.sogoInstalled) {
    //use the original sogo function
    return isGroupdavDirectory(abURI);
  } else {
    //use own function
    return (jbCatMan.getSogoUrl(abURI) != "");
  }
}