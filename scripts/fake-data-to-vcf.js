#!/usr/bin/env node

// convert fake data to vcf
// data path: /src/modules/fake-data-provider.mjs
// output path: ./output.vcf
// change abOfInterest to the address book you want to convert

const { writeFile } = require("node:fs/promises");
const path = require("path");
const url = require("url");

const providerPath = url.pathToFileURL(
  path.join(__dirname, "../data.json")
).href;

async function main() {
  const data = (await import(providerPath, { assert: { type: "json" } })).default;
  const abOfInterest = data;
  const vcards = abOfInterest.map(
    ({ name, email, categories }) => `BEGIN:VCARD
VERSION:4.0
EMAIL;PREF=1:${email}
FN:${name}
${categories.map((cat) => `CATEGORIES:${cat.join(" / ")}`).join("\n")}
END:VCARD`
  );
  await writeFile("output.vcf", vcards.join("\n"), (err) => {
    console.log(err);
  });
}

main();
