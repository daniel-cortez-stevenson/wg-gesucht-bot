import puppeteer from "puppeteer";
import { franc } from "franc";
import { constants } from "./constants.js";

export async function crawlListings(filterUrl) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: undefined,
      slowMo: undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await applyStealth(page);
    await page.goto(filterUrl, { waitUntil: "networkidle0" });
    await page.reload({ waitUntil: "networkidle0" }); // TODO: Find out why reload enables district filters ...
    const listings = await scrapeListings(page);
    processListings(listings);
    return listings;
  } catch (error) {
    console.log(error);
    return [];
  } finally {
    await browser.close();
  }
}

const applyStealth = (page) =>
  page
    .addScriptTag({
      url: "https://raw.githack.com/berstend/puppeteer-extra/stealth-js/stealth.min.js",
    })
    .catch((e) =>
      console.log(
        "Applying stealth protections failed with:",
        e.message,
        "\nContinuing without protection"
      )
    );

async function scrapeListings(page) {
  return await page.$$eval(
    ".wgg_card.offer_list_item",
    (listings, baseUrl) =>
      listings
        .map((listing) => {
          if (!$(listing).attr("class").includes("cursor-pointer")) {
            let id = $(listing).attr("data-id");
            let description = $(listing).find("a.detailansicht").text().trim();
            let url = baseUrl + $(listing).find("a.detailansicht").attr("href");
            let longId = url.split("/")[url.split("/").length - 1];
            return {
              id,
              longId,
              url,
              description,
              sent: 0,
              createdAt: new Date().toISOString(),
            };
          }
        })
        .filter((listing) => listing),
    constants.BASE_URL
  );
}

function processListings(listings) {
  for (let i = 0; i < listings.length; i++) {
    listings[i].lang = franc(listings[i].description, { only: ["eng", "deu"] });
  }
}
