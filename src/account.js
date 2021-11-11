import axios from "axios";
import cheerio from "cheerio";
import { constants } from "./constants.js";

export async function login(user, password) {
  let loginInfo = {
    login_email_username: user,
    login_password: password,
    login_form_auto_login: "1",
    display_language: "de",
  };
  return await axios({
    method: "post",
    url: constants.LOGIN_URL,
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
      url: constants.MESSAGE_TEMPLATE_URL + messageId,
      headers: headers,
    });
    let $ = cheerio.load(response.data);
    return $("#content").text();
  } catch (error) {
    console.log(error);
  }
}

export async function getMessageData(listingLongId, headers) {
  const response = await axios({
    method: "get",
    url: constants.SEND_MESSAGE_URL + listingLongId,
    headers: headers,
  });
  const $ = cheerio.load(response.data);
  let csrfToken = $(".csrf_token").val();
  let userId = $(".logout_button").data("user_id");
  if (!csrfToken || !userId) {
    throw new Error(
      `CSRF Token: ${csrfToken} or User ID: ${userId} not found.`
    );
  }
  return {
    userId,
    csrfToken,
  };
}

export async function sendMessage(
  listingId,
  csrfToken,
  userId,
  messageTemplate,
  headers
) {
  const data = {
    user_id: userId,
    csrf_token: csrfToken,
    messages: [
      {
        content: messageTemplate,
        message_type: "text",
      },
    ],
    ad_type: "0",
    ad_id: listingId,
  };
  console.log("Message data:", JSON.stringify(data, null, 2));
  try {
    const _ = await axios({
      method: "post",
      url: constants.POST_MESSAGE_URL,
      headers: headers,
      data: data,
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
