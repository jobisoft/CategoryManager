# How to start working on this project

To contribute to the code, we assume you already know how to use git and GitHub and you understand HTML, JavaScript and CSS.

## Quick Guide

1. Clone the repository.

```bash
git clone https://github.com/jobisoft/CategoryManager
```

2. Open it in your favorite editor. (We will use vscode in this example)

```bash
code CategoryManager
```

3. Install the dev dependencies. (Optional)

This step is optional but it could improve your development experience.

```bash
yarn install
```

Now you can run `yarn lint` to see if the code has any linting errors.

You can also install [the ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for vscode to get live linting.

4. Open Thunderbird and load the extension in debug mode.

It is recommended to use a new profile for this so that you don't mess up your existing profile.

5. Open the inspector for this extension. And make your changes in your IDE. Reload the extension in the inspector to apply your changes.

6. Debug your changes using whatever method you want.

Some helpful resources:

- [Thunderbird WebExtension API Documentation](https://webextension-api.thunderbird.net/en/stable/#thunderbird-webextension-api-documentation)
- [Debugging Guide](https://extensionworkshop.com/documentation/develop/debugging/#developer-tools-toolbox)
- https://developer.thunderbird.net/

7. When you are done, create a pull request if you want to contribute.

## Fake Data

You can generate some fake data for your debugging purpose. You need to install python3 and a recent version of node.js.

First, install dependencies.

```bash
pip3 install names random-word
```

Then, generate the fake data (`data.json`):

```bash
python scripts/generate-fake-data.py 
```

And convert it to vCard format:

```bash
node scripts/fake-data-to-vcf.js
```

Now you can import `output.vcf` into ThunderBird.

## Caveats

Sometimes the errors from background page won't be logged to the console. You can see them in your terminal if you launched the Thunderbird instance in a shell.

## VSCode Debugger

**Not Recommended.** It has many bugs but I listed it here because it is cool. I only tested it on Linux.

Install the [Command Variable](https://marketplace.visualstudio.com/items?itemName=rioj7.command-variable) extension in vscode and create `dev.config.json` in the root directory of this repo.

Fill in the path to thunderbird executable and your profile directory like the following example:

```json
{
  "thunderbird": {
    "path": "/mnt/data/thunderbird/thunderbird-bin",
    "profile": "/home/kxxt/.thunderbird/test-profile"
  }
}
```

Hit <kbd>F5</kbd> in vscode to start debugging and the extension will hot reload if your code changes. 

Some bugs:

- Sometimes messages from `console.log/info/...` get lost.
- Sometimes the breakpoint won't hit.
- You might get other weird bugs sometimes.
