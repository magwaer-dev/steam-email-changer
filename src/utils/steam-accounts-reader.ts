import * as fs from "fs";

interface SteamAccountCredentials {
  email: string;
  username: string;
  password: string;
}
export function readSteamAccountsFromFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, "utf-8");
  const lines = fileContents.split("\n");

  const accounts: SteamAccountCredentials[] = [];

  for (const line of lines) {
    const [key, value] = line
      .trim()
      .toLowerCase()
      .split(":")
      .map((elements) => elements.trim());

    if (key === "email" && value) {
      const account: SteamAccountCredentials = {
        email: value,
        username: "",
        password: "",
      };
      accounts.push(account);
    } else if (key === "login" && accounts.length > 0 && value) {
      accounts[accounts.length - 1].username = value;
    } else if (key === "password" && accounts.length > 0 && value) {
      accounts[accounts.length - 1].password = value;
    }
  }

  return accounts;
}
