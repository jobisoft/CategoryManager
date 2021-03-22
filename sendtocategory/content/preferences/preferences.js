Preferences.addAll([
	{ id: "extensions.sendtocategory.to_address", type: "unichar" },
]);
	
document.addEventListener('DOMContentLoaded', async () => {
  var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
  let extension = ExtensionParent.GlobalManager.getExtension("sendtocategory@jobisoft.de");  
  i18n.updateDocument({extension});
}, { once: true });
