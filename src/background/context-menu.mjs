// In the html file, we override the contextmenu with the "tab" context and show
// the entries defined here.
// When viewTypes is present, the document's URL is matched instead.

import { createNormalMenu } from "../modules/context-menu.mjs";

createNormalMenu({
  id: "add_to",
  title: "Add to TO",
});
createNormalMenu({
  id: "add_cc",
  title: "Add to CC",
});

createNormalMenu({
  id: "add_bcc",
  title: "Add to BCC",
});
