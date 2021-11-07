import axios from "axios";
import cheerio from "cheerio";

export async function login() {
  let loginInfo = {
    login_email_username: process.env.WG_USER,
    login_password: process.env.WG_PASSWORD,
    login_form_auto_login: "1",
    display_language: "de",
  };
  return await axios({
    method: "post",
    url: process.env.LOGIN_URL,
    data: loginInfo,
  })
    .then(function (response) {
      if (response.status == 200) {
        console.log("got cookie:", response.headers["set-cookie"].toString());
        return response.headers["set-cookie"].toString();
      }
    })
    .catch(function (error) {
      console.log(error);
    });
}

export async function getMessageTemplate(messageId, headers) {
  try {
    const response = await axios({
      method: "get",
      url: process.env.MESSAGE_TEMPLATE_URL + messageId,
      headers: headers,
    });
    let $ = cheerio.load(response.data);
    return $("#content").text();
  } catch (error) {
    console.log(error);
  }
}

export async function messageListingSeller(db, headers, messageTemplates) {
  await db.read();
  let listings = await db.data.rooms.filter(({ sent }) => sent === 0);

  console.log("Processing " + listings.length + " rooms");

  for (let i = 0; i < listings.length; i++) {
    console.log("Processing id: " + listings[i].longId);

    let messageData = await getMessageData(listings[i].longId, headers);
    console.log(messageData);

    let messageSent = await sendMessage(
      listings[i],
      headers,
      messageData,
      messageTemplates
    );

    if (messageSent) {
      let listingIndex = await db.data.rooms.findIndex(
        ({ id }) => id === listings[i].id
      );
      db.data.rooms[listingIndex].sent = 1;
      await db.write();
    }
  }
}

async function getMessageData(listingId, headers) {
  const response = await axios({
    method: "get",
    url: "https://www.wg-gesucht.de/en/nachricht-senden/" + listingId,
    headers: headers,
  });
  const $ = cheerio.load(response.data);
  let csrfToken = $(".csrf_token").val();
  console.log("csrf_token", csrfToken);
  let userId = $(".logout_button").data("user_id");
  console.log("user_id", userId);
  return {
    userId,
    csrfToken,
  };
}

async function sendMessage(listing, headers, messageData, messageTemplates) {
  let message = {
    user_id: messageData.userId,
    csrf_token: messageData.csrfToken,
    messages: [
      {
        content:
          listing.lang === "eng" ? messageTemplates.eng : messageTemplates.ger,
        message_type: "text",
      },
    ],
    ad_type: "0",
    ad_id: listing.id,
  };

  console.log("Message is sending ...");
  try {
    const _ = await axios({
      method: "post",
      url: process.env.POST_MESSAGE_URL,
      headers: headers,
      data: message,
    });
    console.log("Message sent!");
    return true;
  } catch (error) {
    let detailText = error.response.data.detail;
    console.log(error.message + ":", detailText);
    if (detailText.startsWith("Conversation already exists ")) {
      console.log(
        "Message not sent because you've already started a conversation on this ad"
      );
      return true;
    }
    return false;
  }
}
