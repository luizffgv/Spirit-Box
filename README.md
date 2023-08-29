<h1 align="center">Spirit Box</h1>

<p align="center">
  This is the source code for a Discord app that can create shareable journals
  to help you and your friends play Phasmophobia.
  </p>

![Example interaction](image.png)

## Setting up

- [Create](https://discord.com/developers/applications/) a Discord application
  and its respective bot.
- Run `npm run setup` and fill in the required information.
- Run `npm run build` to compile the TypeScript source.

## Running

When running for the first time, use `npm start -- --refresh` to start the bot
and update command metadata. Subsequent runs should be fine with just
`npm start`, unless you modify command metadata.

After modifying the source you must run `npm run build`.

## Using

- Generate a URL with `applications.commands` and `bot` scopes. You don't need
  to check any `bot` permissions.
- Add the application to your server, or share the invite URL.
- Make sure the bot can see the channel then use it with `/journal`.

<p align="center">
  <a href="https://ko-fi.com/U6U7OON7I">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg">
  </a>
</p>
