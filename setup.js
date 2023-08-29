import { writeFileSync } from "fs";
import promptSync from "prompt-sync";

const prompt = promptSync();

const applicationID = prompt("Discord application ID: ");
const token = prompt("Bot token: ");

writeFileSync(
  ".env",
  `APPLICATION_ID=${applicationID}\nDISCORD_TOKEN=${token}`
);
