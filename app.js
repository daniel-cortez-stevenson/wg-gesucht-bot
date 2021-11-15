import * as dotenv from "dotenv";
dotenv.config();

import * as path from "path";
import { Low, JSONFile } from "lowdb";

import crawl from "./src/crawl.js";
import {
  login,
  getMessageTemplate,
  getMessageData,
  sendMessage,
} from "./src/account.js";

(async () => {
  try {
    console.log("Starting Wg-Gesucht Bot");
    console.log("***************************");

    // init db
    const file = path.join(process.env.DB_PATH);
    const adapter = new JSONFile(file);
    const db = new Low(adapter);

    // login
    let cookie = await login(process.env.WG_USER, process.env.WG_PASSWORD);

    // run main sequence once, then every 5 minutes indefinitely
    const sleepMinutes = 2;
    while (true) {
      console.log(`Attempt at: ${new Date().toISOString()}`)
      // crawl new listings
      const crawledListings = await crawl(process.env.FILTER_URL);

      await db.read();
      db.data ||= { listings: [] };
      for (const listing of crawledListings) {
        const dbListing = db.data.listings.find(({ id }) => id === listing.id);
        if (!dbListing) {
          db.data.listings.push(listing);
          await db.write();
          console.log("Added listing to DB:", JSON.stringify(listing, null, 2));
        }
      }

      // get message templates
      let messageTemplateHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Cookie: cookie,
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
      let messageHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Cookie: cookie,
        Origin: "https://www.wg-gesucht.de",
        Host: "www.wg-gesucht.de",
      };
      await db.read();
      const listingsNotMessaged = await db.data.listings.filter(
        ({ sent }) => sent === 0
      );
      for (const listing of listingsNotMessaged) {
        let csrfToken, userId;
        try {
          ({ csrfToken, userId } = await getMessageData(
            listing.longId,
            messageHeaders
          ));
        } catch (e) {
          console.log(e);
          continue;
        }
        let messageTemplate =
          listing.lang === "eng" ? messageTemplates.eng : messageTemplates.ger;
        const messageSent = await sendMessage(
          listing.id,
          csrfToken,
          userId,
          messageTemplate,
          messageHeaders
        );
        if (messageSent) {
          let listingIndex = await db.data.listings.findIndex(
            ({ id }) => id === listing.id
          );
          db.data.listings[listingIndex].sent = 1;
        }
      }
      await db.write();

      // wait
      await sleep(sleepMinutes * 60 * 1000);
    }
  } catch (e) {
    console.log(e);
  }
})();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
