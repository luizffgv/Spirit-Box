/**
 * An independent logger for outputting messages.
 */
export default class Logger {
  /** How many spaces messages will be indented in relation to their labels. */
  static readonly #INLABEL_INDENTATION = 3;

  /** A string representing #INLABEL_INDENTATION. */
  static readonly #INLABEL_INDENTATION_STR = " ".repeat(
    this.#INLABEL_INDENTATION
  );

  /** Currently displayed label. */
  static #currentLabel: string | null = null;

  /**
   * Splits a message into multiple lines and properly indents the lines after
   * the first.
   *
   * @remarks
   *
   * Lines might be longer than expected depending on {@link indent} and
   * {@link lineLength} to ensure the lines are at least 25 characters long plus
   * indentation.
   *
   * @param message - Message to split.
   * @param indent - Number of additional spaces to indent the message.
   * @param lineLength - Maximum length of each line, including indentation.
   *
   * @returns New string.
   */
  static #splitMessage(
    message: string,
    indent: number = 0,
    lineLength: number = 80
  ) {
    indent += this.#INLABEL_INDENTATION;

    if (lineLength - indent < 10) lineLength = indent + 25;

    const regex = new RegExp(
      `(\\S.{0,${lineLength - 1 - indent}}(?=\\s+|$))|\\S{${
        lineLength - indent
      }}`,
      "g"
    );

    const lines = message.match(regex) ?? [""];

    return lines.join("\n" + " ".repeat(indent));
  }

  /** Label used by this logger. */
  #label: string;

  /**
   * Creates a new logger with the specified label.
   *
   * @param label - Label for the logger.
   * @returns Newly created logger.
   */
  constructor(label: string) {
    this.#label = label;
  }

  /** Ensures that this logger's label is already being displayed. */
  #ensureLabel() {
    if (this.#label != Logger.#currentLabel)
      console.log(`\u001B[1mFrom ${this.#label}\u001B[0m`);
    Logger.#currentLabel = this.#label;
  }

  /**
   * Logs a message.
   *
   * @param message - Message.
   */
  log(message: string) {
    this.#ensureLabel();
    console.log(
      `${Logger.#INLABEL_INDENTATION_STR}${Logger.#splitMessage(message)}`
    );
  }

  /**
   * Logs a warning message.
   *
   * @param message - Warning message.
   */
  warn(message: string) {
    this.#ensureLabel();
    console.warn(
      `${
        Logger.#INLABEL_INDENTATION_STR
      }\u001B[1m\u001B[33mWARNING\u001B[0m ${Logger.#splitMessage(
        message,
        "WARNING ".length
      )}`
    );
  }

  /**
   * Logs an error message.
   *
   * @param message - Error message.
   */
  error(message: string) {
    this.#ensureLabel();
    console.error(
      `${
        Logger.#INLABEL_INDENTATION_STR
      }\u001B[1m\u001B[31mERROR\u001B[0m ${Logger.#splitMessage(
        message,
        "ERROR ".length
      )}`
    );
  }
}
