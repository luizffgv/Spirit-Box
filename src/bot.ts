import commands from "./commands.js";
import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  ActivityType,
} from "discord.js";
import { throwIfNull } from "@luizffgv/ts-conversions";
import Logger from "./logging.js";

type BotParameters = {
  applicationID: string;
  token: string;
  refreshCommands?: boolean;
};

/** Bot instance */
export default class Bot {
  /** Handler functions for the commands */
  static #COMMAND_HANDLERS = commands
    .map(({ data, handler }) => ({
      [data.name]: handler,
    }))
    .reduce((lhs, rhs) => Object.assign(lhs, rhs), {});

  /** Whether an instance was already created. */
  static #created: boolean = false;

  /** ID of the application */
  #applicationID: string;

  /** Discord Client */
  #client: Client;

  /** Discord REST API */
  #rest: REST;

  /** Main logger used by the bot */
  #logger: Logger = new Logger("Bot");

  /**
   * Creates an instance of the bot. Only a single instance is allowed to exist.
   *
   * @param parameters - Creation parameters.
   */
  constructor(parameters: BotParameters) {
    if (Bot.#created) throw new Error("You can only construct Bot once");
    Bot.#created = true;

    this.#applicationID = parameters.applicationID;

    this.#rest = new REST({ version: "10" }).setToken(parameters.token);

    this.#client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    void (async (client: Client) => {
      if (parameters.refreshCommands) await this.#syncCommands();

      client.on("ready", () => {
        throwIfNull(client.user).setActivity({
          name: "Listening for footsteps",
          type: ActivityType.Custom,
        });

        this.#logger.log("Bot is ready");
      });

      // Forwards commands to handlers
      client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName in Bot.#COMMAND_HANDLERS)
          await Bot.#COMMAND_HANDLERS[interaction.commandName](interaction);
      });

      await client.login(parameters.token);
    })(this.#client);
  }

  /** Syncs command metadata with Discord */
  async #syncCommands() {
    this.#logger.log("Started synchronizing commands.");

    await this.#rest.put(Routes.applicationCommands(this.#applicationID), {
      body: commands.map(({ data }) => data.toJSON()),
    });

    this.#logger.log("Successfully synchronized commands.");
  }
}
