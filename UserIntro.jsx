const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { MessagingResponse } = require("twilio").twiml;
const { chainRequest, successReg } = require("./CreateAcc.jsx");
const { loginSuccess } = require("./FetchUser.jsx");

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));

const apiKeySid = "SK95a3c7d21fb47759ebe4571b2fe32208";
const accountSid = "ACb4cf2d815575aca31959f1a58020a221";
const authToken = "bwtnq2FtwdCJrqbAjJUePmNBlPMD4XYp";

const client = new twilio(apiKeySid, authToken, { accountSid: accountSid });
//const client = new twilio(accountSid, authToken);

// const watNumber = "+254759900998"
const sendLink = "https://konvoui.netlify.app/confirm-user";

function initMessage() {
  client.messages
    .create({
      body: 'Welcome to Konvo Pay. Buy, trade and pay in crypto from your WhatsApp. Text "Log in" to get access to your account. If new text "Create Account"',
      from: "whatsapp:+14155238886", // Twilio Sandbox number
      to: "whatsapp:+254759900998",
    })
    .then((message) => {
      console.log(`Message sent with SID: ${message.sid}`);
    })
    .catch((error) => {
      console.error(`Failed to send message: ${error}`);
    });
}

let userState = {};

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMessage = req.body.Body.trim().toLowerCase();
  const fromNumber = req.body.From;

  if (!userState[fromNumber]) {
    userState[fromNumber] = { step: 0 };
  }

  const user = userState[fromNumber];

  if (user.step === 0) {
    if (incomingMessage === "create account") {
      twiml.message("Please provide your preferred username.");
      user.step = 1;
    } else if (incomingMessage === "log in") {
      twiml.message("Please provide your username.");
      user.step = 2;
    } else {
      twiml.message(
        'Please type "create" to create a new account or "log in" to log into an existing account.'
      );
    }
  } else if (user.step === 1) {
    user.name = incomingMessage;
    twiml.message(`Hello ${user.name}`);
    try {
      const response = await chainRequest(user.name);
      console.log(response);
      if (response === 201) {
        twiml.message(`Click this link to continue: ${sendLink}`);
      } else {
        twiml.message("An error occured please try again");
      }

      const resp = await successReg();
      if (resp === "Success") {
        twiml.message("Welcome aboard you have sucessfully joined Benkiko");
        twiml.message(
          "How would you want to proceed, ",
          "1. Intiate a transaction",
          "2. View transaction histroy",
          "3. Swap Curriences"
        );
        user.step = 3;
      } else {
        twiml.message("Sorry an error was encountered in registering you");
        user.step = 0;
      }
    } catch (error) {
      console.error("Error during chainReq:", error);
      twiml.message("An error occurred while processing your request.");
    }
    user.step = 0;
  } else if (user.step === 2) {
    user.username = incomingMessage;
    try {
      const login = await loginSuccess();
      if (login === 200) {
        twiml.message(`Hello ${user.username}, Welcome back`);
        twiml.message(
          "How would you want to proceed, ",
          "1. Intiate a transaction",
          "2. View transaction histroy",
          "3. Swap Curriences"
        );

        user.step = 3;
      } else {
        twiml.message("Invalid paymail or password, Please try again");
        user.step = 0;
      }
    } catch (error) {
      console.error("Error during validateLogin:", error);
      twiml.message("An error occurred while processing your request.");
      user.step = 0;
    }
  } else if (user.step === 3) {
    if (incomingMessage === "1. Intiate a transaction" || "Initiate a transaction" || "1") {
      twiml.message("You have selected to transact.");
    } else if (incomingMessage === "2. View transaction histroy" || "View transaction histroy" || "2") {
      twiml.message("You have selected to view history.");
    } else if (incomingMessage === "search") {
      twiml.message("You have selected to search.");
    } else {
      twiml.message(
        'Input is not recognized'
      );
    }
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

initMessage();

module.exports = router;
