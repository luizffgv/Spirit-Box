import _ from "lodash";
import { uncheckedCast } from "@luizffgv/ts-conversions";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  InteractionCollector,
  Message,
  MessageComponentInteraction,
  SlashCommandBuilder,
  SlashCommandUserOption,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  User,
} from "discord.js";
import {
  MAX_ACTION_ROWS_PER_MESSAGE,
  MAX_BUTTONS_PER_ACTION_ROW,
} from "#src/discord-constants.js";

/** IDs for all evidence types. */
const EVIDENCE_IDS = [
  "dots",
  "emf",
  "freezing",
  "orb",
  "writing",
  "box",
  "uv",
] as const;

/** One of the evidence IDs. */
type EvidenceID = (typeof EVIDENCE_IDS)[number];

/**
 * Maximum number of possible evidences, not considering difficulty or fake
 * evidences.
 */
const MAX_EVIDENCES = 3;

/** All ghosts in the game and their evidences. */
const GHOSTS: {
  /** Name of the ghost */
  name: string;
  /** Evidences the ghost has */
  evidences: EvidenceID[];
  /** Evidence that is always present */
  guaranteed?: EvidenceID;
  /**
   * Evidence that is guaranteed and isn't affected by the difficulty evidence
   * count, nor is it counted for difficulty purposes.
   */
  fake?: EvidenceID;
}[] = [
  { name: "Spirit", evidences: ["emf", "box", "writing"] },
  { name: "Wraith", evidences: ["emf", "box", "dots"] },
  { name: "Phantom", evidences: ["box", "uv", "dots"] },
  { name: "Poltergeist", evidences: ["box", "uv", "writing"] },
  { name: "Banshee", evidences: ["uv", "orb", "dots"] },
  { name: "Jinn", evidences: ["emf", "uv", "freezing"] },
  { name: "Mare", evidences: ["box", "orb", "writing"] },
  { name: "Revenant", evidences: ["orb", "writing", "freezing"] },
  { name: "Shade", evidences: ["emf", "writing", "freezing"] },
  { name: "Demon", evidences: ["uv", "writing", "freezing"] },
  { name: "Yurei", evidences: ["orb", "freezing", "dots"] },
  { name: "Oni", evidences: ["emf", "freezing", "dots"] },
  { name: "Yokai", evidences: ["box", "orb", "dots"] },
  {
    name: "Hantu",
    evidences: ["uv", "orb", "freezing"],
    guaranteed: "freezing",
  },
  { name: "Goryo", evidences: ["emf", "uv", "dots"], guaranteed: "dots" },
  { name: "Myling", evidences: ["emf", "uv", "writing"] },
  { name: "Onryo", evidences: ["box", "orb", "freezing"] },
  { name: "The Twins", evidences: ["emf", "box", "freezing"] },
  { name: "Raiju", evidences: ["emf", "orb", "dots"] },
  { name: "Obake", evidences: ["emf", "uv", "orb"], guaranteed: "uv" },
  { name: "The Mimic", evidences: ["box", "uv", "freezing"], fake: "orb" },
  {
    name: "Moroi",
    evidences: ["box", "writing", "freezing"],
    guaranteed: "box",
  },
  { name: "Deogen", evidences: ["box", "writing", "dots"], guaranteed: "box" },
  { name: "Thaye", evidences: ["orb", "writing", "dots"] },
];

/** States an evidence can be in. */
enum EvidenceState {
  /** Evidence is definitely present. */
  PRESENT,
  /** Evidence may or may not be present. */
  INDEFINITE,
  /** Evidence is definitely absent. */
  ABSENT,
}

/** Represents a Phasmophobia journal for evidence tracking. */
class Journal {
  /** Labels for each {@link EvidenceID}. */
  static readonly #LABELS: { [id in EvidenceID]: string } = {
    dots: "D.O.T.S Projector",
    emf: "EMF Level 5",
    uv: "Ultraviolet",
    freezing: "Freezing Temperatures",
    orb: "Ghost Orb",
    writing: "Ghost Writing",
    box: "Spirit Box",
  };

  /** Maps a {@link EvidenceID} to its found status. */
  evidences: { [id in EvidenceID]: EvidenceState } = {
    dots: EvidenceState.INDEFINITE,
    emf: EvidenceState.INDEFINITE,
    uv: EvidenceState.INDEFINITE,
    freezing: EvidenceState.INDEFINITE,
    orb: EvidenceState.INDEFINITE,
    writing: EvidenceState.INDEFINITE,
    box: EvidenceState.INDEFINITE,
  };

  /** Number of evidences provided by the difficulty. */
  availableEvidences: number;

  /**
   * Creates a {@link Journal} with some predefined evidence states and a
   * specific number of available evidences.
   *
   * @param states - Evidence states.
   * Each evidence defaults to {@link EvidenceState.INDEFINITE}.
   * @param availableEvidences - Number of available evidences. Should represent
   * the difficulty's evidence count.
   */
  constructor(
    states?: { [id in EvidenceID]?: EvidenceState },
    availableEvidences: number = 3
  ) {
    Object.assign(this.evidences, states);
    this.availableEvidences = availableEvidences;
  }

  /**
   * Returns the names of the possible ghosts, given the evidences found.
   *
   * @returns Names of the possible ghosts.
   */
  possibleGhosts(): string[] {
    const present = Object.entries(this.evidences)
      .filter(([_, found]) => found == EvidenceState.PRESENT)
      .map(([name]) => name);
    const absent = Object.entries(this.evidences)
      .filter(([_, found]) => found == EvidenceState.ABSENT)
      .map(([name]) => name);

    return GHOSTS.filter(({ evidences: ghostEvidences, guaranteed, fake }) => {
      const presentWithoutFake = _.difference(present, [fake]);

      // Discard ghosts that don't have one or more of the found evidences,
      // ignoring fake evidences.
      for (const evidence of presentWithoutFake)
        if (!ghostEvidences.includes(uncheckedCast(evidence))) return false;

      // Discard ghosts that have more evidences than are possible to find,
      // ignoring fake evidences.
      if (presentWithoutFake.length > this.availableEvidences) return false;

      // Discard ghosts that more absent evidences than evidences disabled by
      // the difficulty.
      if (
        absent.filter((evidence) =>
          ghostEvidences.includes(uncheckedCast(evidence))
        ).length >
        MAX_EVIDENCES - this.availableEvidences
      )
        return false;

      // Discard ghosts whose guaranteed evidence is absent or unobtainable.
      if (guaranteed != null) {
        const isAbsent = this.evidences[guaranteed] == EvidenceState.ABSENT;
        const isPresent = this.evidences[guaranteed] == EvidenceState.PRESENT;
        const obtainableRemainingEvidences =
          this.availableEvidences -
          Object.values(this.evidences).filter(
            (found) => found == EvidenceState.PRESENT
          ).length;

        if (isAbsent || (!isPresent && obtainableRemainingEvidences < 1))
          return false;
      }

      // Discard ghosts whose fake evidence is absent, as it must be present.
      if (fake && absent.includes(fake)) return false;

      return true;
    }).map(({ name }) => name);
  }

  /** Creates a view of the {@link Journal} as Discord components. */
  asComponents(): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
    const rows = [];

    const evidenceCountSelect = new StringSelectMenuBuilder()
      .setCustomId("evidence_count")
      .setPlaceholder("Evidence count")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("3 evidences")
          .setDescription("The ghost can show up to three evidences.")
          .setValue("3"),
        new StringSelectMenuOptionBuilder()
          .setLabel("2 evidences")
          .setDescription("The ghost can show up to two evidences.")
          .setValue("2"),
        new StringSelectMenuOptionBuilder()
          .setLabel("1 evidence")
          .setDescription("The ghost can show up to one evidence.")
          .setValue("1")
      );
    evidenceCountSelect.options[
      MAX_EVIDENCES - this.availableEvidences
    ].setDefault(true);
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>());
    uncheckedCast<ActionRowBuilder>(rows.at(-1)).addComponents(
      evidenceCountSelect
    );

    const buttons = EVIDENCE_IDS.map((id) =>
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel(Journal.#LABELS[id])
        .setStyle(
          this.evidences[id] == EvidenceState.PRESENT
            ? ButtonStyle.Primary
            : this.evidences[id] == EvidenceState.INDEFINITE
            ? ButtonStyle.Secondary
            : ButtonStyle.Danger
        )
    );
    const buttonRows = _.chunk(buttons, MAX_BUTTONS_PER_ACTION_ROW).map((row) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(row)
    );
    rows.push(...buttonRows);

    if (rows.length > MAX_ACTION_ROWS_PER_MESSAGE)
      throw new Error("Too many rows");

    return rows;
  }
}

/** Context for the journal message and its interactions. */
class CommandContext {
  /** How long it takes for the journal to close after the last interaction. */
  static readonly #IDLE_TIME = 3600_000;

  /** IDs of the users that can interact with this context. */
  #allowedUserIDs?: string[];

  /** Evidences collected in this context. */
  #evidences?: Journal;

  /** Message used by this context. */
  #message?: Message;

  /** Collectors used by this context. */
  #collectors?: (
    | InteractionCollector<ButtonInteraction>
    | InteractionCollector<StringSelectMenuInteraction>
  )[];

  #idleTimeout?: NodeJS.Timeout;

  /** Whether the context was terminated. */
  #terminated: boolean = false;

  /**
   * Whether the context has been terminated. Once it's terminated it can never
   * be restarted.
   */
  get terminated() {
    return this.#terminated;
  }

  /**
   * Replies to an interaction with a journal menu and returns a context for
   * interacting with that menu.
   */
  constructor(
    interaction: ChatInputCommandInteraction,
    additionalUsers: User[]
  ) {
    const interactionFilter = (interaction: MessageComponentInteraction) => {
      if (!this.#canInteract(interaction.user)) {
        interaction
          .reply({
            content: "You were not invited to use this journal.",
            ephemeral: true,
          })
          .catch((_) => {});

        return false;
      }

      return true;
    };

    void (async () => {
      // The bot needs to see the channel to later delete the message.
      if (
        interaction.appPermissions == null ||
        !interaction.appPermissions.has("ViewChannel")
      ) {
        await interaction.reply({
          content: "I don't have permission to view this channel.",
          ephemeral: true,
        });

        this.#terminate();
        return;
      }

      this.#allowedUserIDs = [
        interaction.user.id,
        ...additionalUsers.map((user) => user.id),
      ];

      const evidences = (this.#evidences = new Journal());

      await interaction
        .reply({
          content: "\u200B",
          embeds: [this.makeEmbed()],
          components: this.#evidences.asComponents(),
        })
        .then(async (reply) => {
          this.#message = await reply.fetch();
        })
        .catch(() => {
          this.#terminate.bind(this);
        });
      if (this.#message == null) return;

      const buttonCollector = this.#message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: interactionFilter,
      });
      const evidenceCountCollector =
        this.#message.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          filter: interactionFilter,
        });

      this.#collectors = [buttonCollector, evidenceCountCollector];

      buttonCollector.on("collect", (interaction: ButtonInteraction) => {
        this.#refreshTimeout();

        const customId: EvidenceID = uncheckedCast(interaction.customId);

        const state = evidences.evidences[customId];

        if (state == EvidenceState.ABSENT)
          evidences.evidences[customId] = EvidenceState.INDEFINITE;
        else if (state == EvidenceState.INDEFINITE)
          evidences.evidences[customId] = EvidenceState.PRESENT;
        else evidences.evidences[customId] = EvidenceState.ABSENT;

        this.#updateMessage(interaction);
      });

      evidenceCountCollector.on(
        "collect",
        (interaction: StringSelectMenuInteraction) => {
          this.#refreshTimeout();

          evidences.availableEvidences = parseInt(interaction.values[0]);

          this.#updateMessage(interaction);
        }
      );

      this.#idleTimeout = setTimeout(() => {
        this.#terminate();
      }, CommandContext.#IDLE_TIME);
    })();
  }

  /** Generates an embed representing the current state of the journal. */
  makeEmbed() {
    if (this.#evidences == null) {
      this.#terminate();
      throw new Error("makeEmbed called before initializing #evidences.");
    }

    const possibleGhosts = this.#evidences.possibleGhosts();

    const IDLE_HOURS = CommandContext.#IDLE_TIME / 3600_000;

    const embed = new EmbedBuilder()
      .setTitle("Ghost hunting journal")
      .setDescription(
        `(Disabled after ~${IDLE_HOURS.toFixed(1)} hour${
          IDLE_HOURS == 1 ? "" : "s"
        } of inactivity)`
      );

    if (possibleGhosts.length > 0) {
      embed.setColor("Blurple").addFields({
        name: "Possible ghosts",
        value: possibleGhosts.join(", "),
      });
    } else {
      embed.setColor("Red").addFields({
        name: "No possible ghosts",
        value: "\u200B",
      });
    }

    return embed;
  }

  /** Refreshes the idle timeout. */
  #refreshTimeout() {
    this.#idleTimeout?.refresh();
  }

  /**
   * Deletes the message and stops listening for interactions, effectively
   * terminating the context.
   */
  #terminate() {
    clearTimeout(this.#idleTimeout);
    this.#idleTimeout = undefined;

    this.#terminated = true;

    if (this.#collectors)
      for (const collector of this.#collectors) collector.stop();

    this.#message?.delete().catch((_) => {});
  }

  /** Updates the message to reflect the current state of the journal. */
  #updateMessage(interaction: MessageComponentInteraction) {
    if (this.#evidences == null) {
      this.#terminate();
      throw new Error("#updateMessage called before initializing #evidences.");
    }

    interaction
      .update({
        content: "\u200B",
        embeds: [this.makeEmbed()],
        components: this.#evidences.asComponents(),
      })
      .catch(this.#terminate.bind(this));
  }

  /**
   * Checks if a user can interact with the journal.
   *
   * @param user - User to check
   * @returns `true` if the user is allowed to interact, `false` otherwise.
   */
  #canInteract(user: User) {
    if (this.#allowedUserIDs == null) {
      this.#terminate();
      throw new Error(
        "#canInteract called before initializing #allowedUserIDs"
      );
    }

    return this.#allowedUserIDs.includes(user.id);
  }
}

function makeInviteOptionBuilder(name: string) {
  return (option: SlashCommandUserOption) =>
    option
      .setName(name)
      .setDescription("Gives a person permission to use the journal")
      .setDescriptionLocalizations({
        "pt-BR": "Dá a uma pessoa permissão para utilizar o diário",
      })
      .setRequired(false);
}

export const data = new SlashCommandBuilder()
  .setName("journal")
  .setDescription("Creates a ghost hunting journal.")
  .addUserOption(makeInviteOptionBuilder("invite1"))
  .addUserOption(makeInviteOptionBuilder("invite2"))
  .addUserOption(makeInviteOptionBuilder("invite3"));

export function handler(interaction: ChatInputCommandInteraction) {
  new CommandContext(
    interaction,
    _.compact(interaction.options.data.map((data) => data.user))
  );
}
