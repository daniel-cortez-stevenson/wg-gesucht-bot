import * as dotenv from "dotenv";
dotenv.config();

import * as path from "path";
import { Low, JSONFile } from "lowdb";

import { crawlListings } from "./src/crawl.js";
import {
  getLoginCookie,
  getMessageTemplate,
  getMessageData,
  sendMessage,
} from "./src/account.js";

(async () => {
  try {
    console.log("Starting Wg-Gesucht Bot");
    console.log("***************************");

    const db = await initDb();

    while (true) {
      console.log(`Attempt at: ${new Date().toISOString()}`);

      // Get available listings from WG-Gesucht based on filters.
      const crawledListings = await crawlListings(process.env.FILTER_URL);

      // Write available listings to the DB if they are not already there.
      await crawledListings.forEach(async (listing) => {
        const listingInDb = await findListingById(db, listing.id);
        if (!listingInDb) {
          await writeListing(db, listing);
        }
      });

      // Check DB for any listings we haven't written to yet.
      const listingsNotMessaged = await getListingsNotMessaged(db);

      // If no new listings were crawled, sleep and skip messaging.
      if (listingsNotMessaged.length === 0) {
        console.log(
          `No new listings found. Sleeping for ${process.env.WAIT_SECONDS} seconds.`
        );
        await sleep(parseInt(process.env.WAIT_SECONDS) * 1000);
        continue;
      }

      // If new listings were crawled, send a message request to the listing owner.
      // Create request headers with login cookie.
      const loggedInHeaders = {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.62 Mobile Safari/537.36",
        Cookie: await getLoginCookie(
          process.env.WG_USER,
          process.env.WG_PASSWORD
        ),
        Origin: "https://www.wg-gesucht.de",
        Host: "www.wg-gesucht.de",
      };

      // Get up-to-date message templates from WG-Gesucht profile.
      const messageTemplates = await getMessageTemplates(loggedInHeaders);

      // Construct a message payload and send it for each listing not messaged in DB.
      await listingsNotMessaged.forEach(async (listing) => {
        // Get necessary data to send a message from the listing URL.
        const { csrfToken, userId } = await getMessageData(
          listing.longId,
          loggedInHeaders
        ).catch((e) => {
          console.log(`getMessageData failed with error message: ${e.message}`);
        });

        // If necessary data not found, remove listing from DB and skip sending message.
        if (!csrfToken || !userId) {
          await removeListingById(db, listing.id);
          return;
        }

        // Choose a message to send based on interpreted language of the listing description.
        const message =
          listing.lang === "eng" ? messageTemplates.eng : messageTemplates.ger;

        // Send the message to the user who owns the listing.
        const messageSent = await sendMessage(
          listing.id,
          csrfToken,
          userId,
          message,
          loggedInHeaders
        );

        // On success, mark the listing as messaged in the DB.
        if (messageSent) {
          await updateListingById(db, listing.id, { sent: 1 });
        }
      });
      console.log(
        `Messaged the owners of new listings. Sleeping for ${process.env.WAIT_SECONDS} seconds.`
      );
      await sleep(parseInt(process.env.WAIT_SECONDS) * 1000);
    }
  } catch (e) {
    console.log(e);
  }
})();

async function initDb() {
  const file = path.join(process.env.DB_PATH);
  const adapter = new JSONFile(file);
  const db = new Low(adapter);
  console.log("DB initiated!");
  return db;
}

async function findListingById(db, listingId) {
  await db.read();
  db.data ||= { listings: [] };
  return db.data.listings.find(({ id }) => id === listingId);
}

async function writeListing(db, listing) {
  await db.read();
  db.data.listings.push(listing);
  await db.write();
  console.log("Added listing to DB:", JSON.stringify(listing, null, 2));
}

async function getMessageTemplates(headers) {
  return {
    eng: await getMessageTemplate(process.env.MESSAGE_ENG_ID, headers),
    ger: await getMessageTemplate(process.env.MESSAGE_GER_ID, headers),
  };
}

async function getListingsNotMessaged(db) {
  await db.read();
  db.data ||= { listings: [] };
  return await db.data.listings.filter(({ sent }) => sent === 0);
}

async function removeListingById(db, listingId) {
  await db.read();
  const index = await db.data.listings.findIndex(({ id }) => id === listingId);
  if (index > -1) {
    db.data.listings.splice(index, 1);
    await db.write();
    console.log(`Removed listing ${listing.id}`);
  }
}

async function updateListingById(db, listingId, update) {
  await db.read();
  const index = await db.data.listings.findIndex(({ id }) => id === listingId);
  for (const key in update) {
    db.data.listings[index][key] = update[key];
    await db.write();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
