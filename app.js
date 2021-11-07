import * as dotenv from "dotenv";
dotenv.config();

import * as path from "path";
import { Low, JSONFile } from "lowdb";

import crawl from "./src/crawl.js";
import { login, getMessageTemplate, messageListingSeller } from "./src/account.js";

(async () => {
  try {
    console.log("Starting Wg-Gesucht Scraper");
    console.log("***************************");

    // init db
    const file = path.join("./db/db.json");
    const adapter = new JSONFile(file);
    const db = new Low(adapter);

    // login
    let loginCookie = await login();

    // run main sequence once, then every 5 minutes indefinitely
    const sleepMinutes = 5;
    while (true) {
      // crawl new listings
      await db.read();
      db.data ||= { rooms: [] };
      let scraperHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Origin: "https://www.wg-gesucht.de",
        Host: "www.wg-gesucht.de",
      };
      await crawl(db, scraperHeaders);
      console.log("Done crawling new listings!");

      // get message templates
      let messageTemplateHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Cookie: loginCookie,
        Origin: "https://www.wg-gesucht.de",
        Host: "www.wg-gesucht.de",
      };
      let messageTemplates = {
        eng: await getMessageTemplate(
          process.env.MESSAGE_ENG_ID,
          messageTemplateHeaders
        ),
        ger: await getMessageTemplate(
          process.env.MESSAGE_GER_ID,
          messageTemplateHeaders
        ),
      };

      // send messages to sellers
      await db.read();
      let messageHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Cookie: loginCookie,
        Origin: "https://www.wg-gesucht.de",
        Host: "www.wg-gesucht.de",
      };
      await messageListingSeller(db, messageHeaders, messageTemplates);
      console.log("Done messaging sellers!");

      // wait
      console.log(`Waiting ${sleepMinutes} minutes ...`);
      await sleep(sleepMinutes * 60 * 1000);
    }
  } catch (e) {
    console.log(e);
  }
})();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
