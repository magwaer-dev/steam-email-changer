import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const client = new ImapFlow({
  host: "outlook.office365.com",
  port: 993,
  secure: true,
  auth: {
    user: "mirzaalexandrunicolae@outlook.com",
    pass: "cnc36565",
  },
  logger: false,
});

let allConfirmationCodes: Array<string> = [];

const confirmationCodeRegex = /[A-Z0-9]{5}/;

function checkEmail(textContent: string) {
  // console.log("Text content", textContent);
  const match = textContent.match(confirmationCodeRegex);
  // console.log("match: ", match);
  let confirmationCode: string | undefined;

  if (match) {
    confirmationCode = match[0];
    allConfirmationCodes.push(confirmationCode);
    console.log("Confirmation Code:", confirmationCode);
  } else {
    console.error("no code found");
  }
}

async function main() {
  await client.connect();

  let mailbox = await client.mailboxOpen("INBOX", { readOnly: false });

  for await (let msg of client.fetch(
    { from: "egjuice99@gmail.com" },
    {
      flags: true,
      envelope: true,
      source: true,
      bodyStructure: true,
      uid: true,
    }
  )) {

    const parsedMessage = await simpleParser(msg.source);
    // console.log("pasrsed message", parsedMessage);

    const textContent = parsedMessage.text as string;

    try {
      await checkEmail(textContent);
    } catch (err: any) {
      console.error("Error processing email", err);
    }
  }

  const lastCode = allConfirmationCodes.pop();
  
  console.log("Last code", lastCode);

  // Close the connection
  await client.logout();
}

main().catch((err) => console.error("Main function error:", err));
