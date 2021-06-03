## Usage

### i18n.updateDocument([options]);

Calling this function, for example in a `DOMContentLoaded` event listener, will search the loaded document and replace all i18n locale strings (`__MSG_<message-name>__)` with their corresponding i18n message.

The optional `options` object can be used to override standard behavior:
* `keyPrefix` : Specifies the prefix for the i18n locale strings, defaults to `__MSG_`
* `extension`: Specifies an `extension` object (available to WebExtension Experiments). If provided, `extension.localeData.localizeMessage()` will be used to localize the strings, instead of `messenger.i18n.getMessage()`.

More details on using this script can be found in the [corresponding locale tutorial](https://github.com/thundernest/addon-developer-support/wiki/Tutorial:-Switch-to-the-WebExtension-i18n-locale-system).
