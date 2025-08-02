# better-hasura-history

![GitHub release (latest by date)](https://img.shields.io/github/v/release/dagimg-dot/better-hasura-history) ![GitHub all releases](https://img.shields.io/github/downloads/dagimg-dot/better-hasura-history/total)

<div style="display: flex; justify-content: center;">
  <img src="./assets/better-hasura-history.png" alt="Better Hasura History" width="250" />
</div>

> A chrome extension to get a better hasura history experience

## Features

- [x] Better history view for the graphiql section
- [x] Unlimited history view
- [x] Show Full operation with variables on hover for each history item (ctrl + hover)
- [x] Search through your history easily with fuzzy search
- [x] Edit the name of the history item
- [x] Delete history item with confirmation
- [x] Enable/Disable the extension from the popup
- [x] Remove original History button from the graphiql section

## Installing

### CRX file

1. Download the latest release from the [releases page](https://github.com/dagimg-dot/better-hasura-history/releases)
2. Install the extension by dragging the CRX file into the Chrome extensions page

### Zip file

1. Download the latest release from the [releases page](https://github.com/dagimg-dot/better-hasura-history/releases)
2. Extract the ZIP file to an unpacked folder
3. Enable developer mode in Chrome
4. Open your chromium browser and go to the extensions page
5. Enable Developer mode (switch in the top right corner)
6. Use the "Load unpacked" button to select the extracted extension folder

## Developing

1. Clone the repository

```shell
git clone https://github.com/dagimg-dot/better-hasura-history.git
```

2. Install the dependencies

```shell
cd better-hasura-history
```

```shell
pnpm install
```

```shell
pnpm dev
```
