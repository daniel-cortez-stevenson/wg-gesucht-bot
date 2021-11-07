import axios from "axios";
import cheerio from "cheerio";
import { franc } from "franc";
import { constants } from "./constants.js";

export default async function crawl(filterUrl, headers) {
  console.log("Getting new listings ...");
  try {
    let response = await axios({
      method: "get",
      url: filterUrl,
      headers: headers,
    });
    return scrapeListings(response);
  } catch (error) {
    console.log(error);
    return [];
  }
}

function scrapeListings(response) {
  let $ = cheerio.load(response.data);
  let listings = [];
  $(".wgg_card.offer_list_item").each((i, elem) => {
    if (!$(elem).attr('class').includes('cursor-pointer')) {
      let id = $(elem).attr("data-id");
      let description = $(elem).find("a.detailansicht").text().trim();
      let url = constants.BASE_URL + $(elem).find("a.detailansicht").attr("href");
      let longId = url.split("/")[url.split("/").length - 1];
      let lang = franc(description, { only: ["eng", "deu"] });
      let data = {
        id,
        longId,
        url,
        description,
        lang,
        sent: 0,
        createdAt: new Date().toISOString(),
      };
      listings.push(data);
    }
  });
  return listings;
}
