import SteamUser from "steam-user";
import { gotScraping } from "got-scraping";
import { JSDOM } from "jsdom";

import {
  ajaxPostResponseHref,
  filePath,
  helpChangeEmailUrl,
  userAgent,
} from "./config/constants";
import { readSteamAccountsFromFile } from "./utils/steam-accounts-reader";

const user = new SteamUser();

let queryString: string;

interface SteamSession {
  sessionId: string;
  cookies: string[];
}

interface AjaxParams {
  sessionId: string;
  sValue: string;
  cookies: string[];
  queryString: string;
}

async function loginToSteam(
  username: string,
  password: string
): Promise<SteamSession> {
  return new Promise<SteamSession>((resolve, reject) => {
    user.on("webSession", (sessionId, cookies) => {
      console.log(`cookies ${username}`, cookies);

      resolve({ sessionId, cookies });
    });

    user.logOn({
      accountName: username,
      password: password,
    });

    user.on("loggedOn", () => {
      console.log(`Successfully logged in as ${username}`);
    });

    user.on("error", (err: any) => {
      reject(err);
    });
  });
}

async function fetchSteamHelpPage(session: SteamSession) {
  const cookieString = session.cookies.join("; ");
  const response = await gotScraping(helpChangeEmailUrl, {
    headers: {
      Cookie: cookieString,
      "User-Agent": userAgent,
    },
  });
  return {
    body: response.body,
  };
}

async function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function storedHrefHelpWithLoginInfoEnterCode(responseBody: string) {
  const dom = new JSDOM(responseBody);
  const document = dom.window.document;

  const anchorElement = document.querySelector("a.help_wizard_button");

  if (anchorElement) {
    const helpWithLoginInfoEnterCodeUrl = anchorElement.getAttribute(
      "href"
    ) as string;
    return helpWithLoginInfoEnterCodeUrl;
  } else {
    throw new Error(`No link found in the page`);
  }
}

async function accessHref(url: string, cookies: string[]) {
  try {
    const response = await gotScraping(url, {
      headers: {
        Cookies: cookies,
        "User-Agent": userAgent,
      },
    });
    
    console.log("Response coming from accessHref:", response);
    console.log("URL coming from accessHref:", response.url);
    console.log("status code coming from accessHref:", response.statusCode);
    console.log("cookies from accessHref", cookies);
    
  } catch (error) {
    console.error(
      "An error occurred while accessing the href in accessHref function:",
      error
    );
  }
}

function ajaxPostParams(params: AjaxParams) {
  const { sessionId, sValue, cookies } = params;
  queryString = new URLSearchParams({
    sessionid: sessionId,
    wizard_ajax: "1",
    gamepad: "0",
    s: sValue,
    method: "2",
    link: "",
  }).toString();

  const contentLength = Buffer.byteLength(queryString, "utf8");

  const ajaxHeaders = {
    "Content-Length": contentLength.toString(),
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookies,
    "User-Agent": userAgent,
  };

  return { ajaxHeaders, params, queryString };
}

async function ajaxPostResponse(url: string, ajaxParams: AjaxParams) {
  try {
    const { ajaxHeaders, queryString } = ajaxPostParams(ajaxParams);
    const response = await gotScraping(url, {
      method: "POST",
      headers: ajaxHeaders,
      body: queryString,
    });

    console.log("ajaxPostResponse status", response.statusCode);
    console.log("ajaxPostResponse status", response.url);
  } catch (error) {
    console.error("An error occurred during the AJAX POST request:", error);
    throw error;
  }
}

function getUrlParamValue(url: string, paramName: string): string {
  const urlParams = new URLSearchParams(new URL(url).search);
  const paramValue = urlParams.get(paramName);
  if (paramValue) {
    return paramValue;
  } else {
    throw new Error(`Parameter '${paramName}' not found in URL`);
  }
}

async function accessHelpPageAndPostResponse(
  userHelpPageUrl: string,
  helpPageUrl: string,
  ajaxParams: AjaxParams
) {
  // await accessHref(helpPageUrl, ajaxParams.cookies);
  await ajaxPostResponse(ajaxPostResponseHref, ajaxParams);
  await accessHref(userHelpPageUrl, ajaxParams.cookies);
}

async function main() {
  try {
    const steamAccounts = readSteamAccountsFromFile(filePath);

    for (const { username, password } of steamAccounts) {
      const session = await loginToSteam(username, password);
      const { body } = await fetchSteamHelpPage(session);
      const helpPageEnterCodeUrl = storedHrefHelpWithLoginInfoEnterCode(body);
      const modifiedHelpPageEnterCodeUrl = `${helpPageEnterCodeUrl}&sessionid=${session.sessionId}&wizard_ajax=1&gamepad=0`;
      const sValue = getUrlParamValue(modifiedHelpPageEnterCodeUrl, "s");

      const ajaxParams: AjaxParams = {
        sessionId: session.sessionId,
        sValue: sValue,
        cookies: session.cookies,
        queryString: queryString,
      };

      if (ajaxParams !== undefined) {
        accessHelpPageAndPostResponse(
          helpPageEnterCodeUrl,
          modifiedHelpPageEnterCodeUrl,
          ajaxParams
        );
      } else {
        throw new Error(
          "ajaxParams is undefined. Unable to call ajaxPostResponse."
        );
      }

      // console.log(`Help page fetched for ${username}:`, body);

      user.logOff();

      await delay(5000); // Wait for 5 seconds before proceeding to the next login attempt
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
