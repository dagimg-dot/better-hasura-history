<div align="center">
  <h1>Better Hasura Console</h1>
  <img src="./assets/better-hasura-console.png" alt="Better Hasura Console" width="250" />
  <p>
    <img src="https://img.shields.io/github/v/release/dagimg-dot/better-hasura-history" alt="GitHub release" />
    <img src="https://img.shields.io/github/downloads/dagimg-dot/better-hasura-history/total" alt="GitHub downloads" />
  </p>
</div>

A Chrome extension that enhances the Hasura Console with session-based auth, an improved history panel, and cross-table search.

## Features

### Session Management

- Manage multiple authentication sessions — each with its own GraphQL mutation and variables
- JWT-based authentication: runs your mutation, extracts the token, sets it as `Authorization: Bearer` in the request headers
- Switch between sessions without re-authenticating — one-click active/inactive toggle, no server round-trip
- Decodes the JWT and extracts a role name from the payload
- Auth status bar shows the active Bearer token and decoded role in real time
- Sessions persist in localStorage across page reloads

### History Panel

- Persistent operation history with unlimited storage
- Fuzzy search through past queries and mutations
- Edit operation names for easy identification
- Delete individual entries or clear all history
- View full operation text and variables on hover (Ctrl + hover)
- Works in both GraphiQL and Raw SQL pages

### Cross-Table Search

- Search for a value across all tables in your database schema
- Regex-based column discovery to target specific fields
- Progressive streaming results — data appears as each batch of tables resolves
- Column discovery caching for repeat searches
- Background pre-fetch of matching columns while you type

### Table Search

- Quick-filter tables in the Data Manager sidebar
- Instant filtering as you type

## Installing

### CRX File

1. Download the latest release from the [releases page](https://github.com/dagimg-dot/better-hasura-history/releases)
2. Install by dragging the CRX file into the Chrome extensions page

### Zip File

1. Download the latest release from the [releases page](https://github.com/dagimg-dot/better-hasura-history/releases)
2. Extract the ZIP file to an unpacked folder
3. Open `chrome://extensions`, enable Developer mode
4. Click "Load unpacked" and select the extracted folder

### Build from Source

```shell
git clone https://github.com/dagimg-dot/better-hasura-history.git
cd better-hasura-history
pnpm install
pnpm pack
```

The packed extension will be in the `dist/` folder.

## Developing

```shell
git clone https://github.com/dagimg-dot/better-hasura-history.git
cd better-hasura-history
pnpm install
pnpm dev
```
