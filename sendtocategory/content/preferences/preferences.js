var jbCatManPref = {
  
  load: function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    let toAddr = prefs.getCharPref("to_address"); 
    document.getElementById("sendtocategory.to_address").value = toAddr;
  },

  save: function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    let toAddr = prefs.setCharPref("to_address", document.getElementById("sendtocategory.to_address").value);
  }
}

