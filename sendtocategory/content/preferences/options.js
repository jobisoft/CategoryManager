document.addEventListener('DOMContentLoaded', async () => {
  i18n.updateDocument();
  await preferences.load(window);
}, { once: true });
