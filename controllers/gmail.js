const { google } = require("googleapis");
const axios = require("axios");
const processedMessages = new Set(); // To keep track of processed messages
let isProcessing = false; // To ensure only one processing cycle runs at a time
const listEmail = [" oxford@mp.oxfordclub.com", "oxford@mb.oxfordclub.com"];
const whiteList = ["action to take", "buy"];
const TELEGRAM_TOKEN = "7266099507:AAG5KFAjz1QTxncX6AOOIIlyh4nR0ma4LLo";
const regex = new RegExp(`\\b${"Action to Take: Buy"}\\b`, "i");

const { messageFormat } = require("../utils/messageFormat");
function checkNewEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });

  setInterval(async () => {
    if (isProcessing) return; // Prevent overlapping intervals
    isProcessing = true; // Mark as processing

    try {
      const res = await gmail.users.messages.list({
        userId: "me",
        labelIds: ["INBOX"],
        q: "is:unread",
      });

      const messages = res.data.messages;

      if (messages && messages.length > 0) {
        for (const message of messages) {
          if (!processedMessages.has(message.id)) {
            processedMessages.add(message.id);

            const msgRes = await gmail.users.messages.get({
              userId: "me",
              id: message.id,
            });

            const body = Buffer.from(
              msgRes.data.payload.parts[0].body.data,
              "base64"
            ).toString("utf-8");
            const msg = msgRes.data;

            const text = messageFormat(msgRes);
            const isSendMessage =
              whiteList.some((word) =>
                body?.toLowerCase().includes(word.toLowerCase())
              ) &&
              listEmail.filter((email) =>
                msg.payload.headers
                  ?.find((info) => info.name.includes("From"))
                  ?.value.includes(email)
              ).length > 0;

            console.log("🚀 ~ isSendMessage:", isSendMessage);

            const currentTime =
              "<b><u>Current time</u>: </b>" + new Date().toTimeString();
            const actionToTake =
              "<b><u>Action To Take</u>: </b>" +
              text.slice(0, text.indexOf(")") + 1);
            const customMessage =
              "🏦 OXFORD %0A" + actionToTake + "%0A" + currentTime;
            const label = "OXFORD";

            // Mark message as read before sending
            isSendMessage && (await markMessageAsRead(auth, message.id, label));

            // Send message to bot

            isSendMessage &&
              (await sendMessageToBot(customMessage, isSendMessage));
          }
        }
      } else {
        console.log("NEW message empty");
      }
    } catch (err) {
      console.error("API повернув помилку: " + err);
    } finally {
      isProcessing = false; // Mark as not processing
    }
  }, 1000); // Checking every 10 seconds
}

// Ensure you have a valid OAuth2 client and call checkNewEmails with it

// Ensure you have a valid OAuth2 client and call checkNewEmails with it

// Ensure you have valid OAuth2 client and call checkNewEmails with it

async function markMessageAsRead(auth, messageId, label) {
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const labelsRes = await gmail.users.labels.list({
      userId: "me",
    });
    const labels = labelsRes.data.labels;
    const labelId = labels.find((_label) => _label.name === label).id;
    const response = gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      resource: {
        addLabelIds: [labelId],
        removeLabelIds: ["UNREAD"], // Note: Label IDs are case-sensitive
      },
    });
    console.log("Message marked as read:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error marking message as read:", error.message);
    throw error;
  }
}

async function sendMessageToBot(message, isSendMessage) {
  const url =
    message &&
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=593981143&text=${message}&parse_mode=HTML`;
  const url2 =
    message &&
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=466616096&text=${message}&parse_mode=HTML`;

  isSendMessage &&
    (await axios.post(url, {
      data: {
        parse_mode: "HTML",
      },
    }));
  isSendMessage &&
    (await axios.post(url2, {
      data: {
        parse_mode: "HTML",
      },
    }));
}

async function createLabel(auth, messageId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.modify({
    userId: "me",
    id: messageId, // replace with your message ID
    requestBody: {
      addLabelIds: ["LEADERBOARD"],
      removeLabelIds: ["UNREAD"],
    },
  });
  return res.data.id;
}
module.exports = { checkNewEmails };
