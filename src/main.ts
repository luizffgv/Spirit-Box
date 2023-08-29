import { throwIfNull } from "@luizffgv/ts-conversions";
import "dotenv/config";
import Bot from "./bot.js";

const ARGS = process.argv.slice(2);
const SHOULD_REFRESH = ARGS.includes("--refresh");

let TOKEN: string;
let APPLICATION_ID: string;

try {
  TOKEN = throwIfNull(process.env.DISCORD_TOKEN);
  APPLICATION_ID = throwIfNull(process.env.APPLICATION_ID);
} catch {
  throw new Error(".env is missing required variables. Run `npm run setup`.");
}

new Bot({
  applicationID: APPLICATION_ID,
  token: TOKEN,
  refreshCommands: SHOULD_REFRESH,
});
