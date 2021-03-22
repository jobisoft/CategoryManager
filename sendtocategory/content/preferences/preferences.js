document.addEventListener('DOMContentLoaded', async () => {
  var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
  let extension = ExtensionParent.GlobalManager.getExtension("sendtocategory@jobisoft.de");  
  i18n.updateDocument({extension});
  await preferences.load(window);
}, { once: true });
