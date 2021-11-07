import axios from "axios";
import cheerio from "cheerio";
import { franc } from "franc";

export default async function crawl(db, headers) {
  console.log("Getting new listings ...");
  try {
    let response = await axios({
      method: "get",
      url: process.env.FILTER_URL,
      headers: headers,
    });
    scrapeListings(db, response);
  } catch (error) {
    console.log(error);
  }
}

function scrapeListings(db, response) {
  const numberPattern = /\d+/g;

  let $ = cheerio.load(response.data);

  $(".panel.panel-default").each((i, elem) => {
    console.log("Scraping listing at position", i);
    let idMatches = $(elem).attr("id").match(numberPattern);
    if (idMatches) {
      db.read();
      let idInDb = db.data.rooms.find(({ id }) => id === idMatches[0]);
      if (idInDb) {
        console.log("Listing already in DB with ID", idMatches[0]);
        return;
      }

      let id = idMatches[0];
      let description = $(elem).find("a.detailansicht").text().trim();
      let url =
        process.env.BASE_URL + $(elem).find("a.detailansicht").attr("href");
      let longId = url.split("/")[url.split("/").length - 1];
      let lang = franc(description, { only: ["eng", "deu"] });

      let data = {
        id,
        longId,
        url,
        description,
        lang,
        sent: 0,
      };
      console.log(
        "Scraped listing with data:\n",
        JSON.stringify(data, null, 2)
      );

      db.data.rooms.push(data);
      db.write();
      console.log("Added listing to DB with ID: " + data.longId);
    }
  });
  console.log("Done scraping listings");
}
