# Fake Server Creation Year

A Vendetta-compatible external plugin intended for Endcord Mobile.

## What it does

- Lets you choose a fake year (2015 through the current year).
- Targets the currently selected server by default, or a server ID you enter in the plugin settings.
- Alters local date formatting for the matching server-creation day only.
- Does not modify the server, its Snowflake ID, Discord's API data, or what other people see.

## Install in Endcord

The in-app installer fetches `manifest.json` from the base URL you paste. It does not accept a Discord invite link or a normal GitHub repository-page URL.

1. Create a **public GitHub repository** and upload `manifest.json` and `index.js` to its root.
2. In Endcord, open **Settings → Endcord → Plugins → +**.
3. Paste the raw base URL in this form:

   `https://raw.githubusercontent.com/YOUR_GITHUB_NAME/YOUR_REPOSITORY/main/`

4. Install, enable the plugin, then reload Endcord.
5. Open the plugin's settings, choose a year, and open the server's About / Server Info screen again.

## Settings

- **Fake year**: the replacement year. Month and day are retained.
- **Server ID**: optional. Leave blank to use the currently selected server.

## Compatibility note

This uses the Vendetta-compatible `manifest.json` + JavaScript plugin format supported by Endcord. It has been syntax-checked and tested against a small JavaScript runtime mock, but has **not** been device-tested against your exact Discord/Endcord build. Discord may render its server creation date through a formatter this plugin does not intercept; if so, the date shown in that screen may remain unchanged. The plugin never sends modified dates to Discord.
