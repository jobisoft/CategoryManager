//create CatManPref namespace
var jbCatManPref = {};
	
jbCatManPref.setSettingValue = function (setting, value) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    prefs.setCharPref(setting, value);
}
 
jbCatManPref.getSettingValue = function (setting) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    return prefs.getCharPref(setting);
}