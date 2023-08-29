import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as journal from "./commands/journal.js";

/** Function to handle a command interaction. */
type CommandHandler = (interaction: ChatInputCommandInteraction) => void;

/** All commands of the bot. */
const commands: {
  /** Command metadata. */
  data: Pick<SlashCommandBuilder, "name" | "toJSON">;

  /** Function that will be called when a user uses the command. */
  handler: CommandHandler;
}[] = [journal];
export default commands;
