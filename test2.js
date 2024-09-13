const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { MessagingResponse } = require("twilio").twiml;
const transactFunds = require("./stellarTransaction");
const router = express.Router();



router.use(bodyParser.urlencoded({ extended: false }));

const apiKeySid = "SK95a3c7d21fb47759ebe4571b2fe32208";
const accountSid = "ACb4cf2d815575aca31959f1a58020a221";
const authToken = "bwtnq2FtwdCJrqbAjJUePmNBlPMD4XYp";

const client = new twilio(apiKeySid, authToken, { accountSid: accountSid });

const userLink = "https://konvoui.netlify.app/login";


function initMessage() {
  client.messages
    .create({
      body: 'Welcome to Konvo Pay. Buy, trade and pay in crypto from your WhatsApp. Text "Log in" to get access to your account. If new text "Create Account" \u{1F60A}',
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
const loginStatus = {};
let recipientName = null;
let assetTransct = null;
let amountTransct = null;
let userName = null;
let reqChangeAsset = null;
let specUrl = null;


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
      twiml.message(
        `Please provide your paymail and password through the link ${userLink}`
      );

      twiml.message(
        `Provide your username`
      );
      user.step = 1;
      
    } else {
      twiml.message(
        'Please type "create account" to create a new account or "log in" to log into an existing account.'
      );
    }
  } else if (user.step === 1) {
    user.name = incomingMessage;
    userName = user.name
    twiml.message(`Hello ${user.name}, Welcome back. To proceed, please choose:\n1. Initiate a transaction\n2. Deposit\n3. Withdraw`);
    
    user.step = 4;

  } else if (user.step === 4) {
    if (
      incomingMessage === "initiate a transaction" ||
      incomingMessage === "1"
    ) {
      twiml.message("Please provide the recipient's username.");
      user.step = 5;
    } else if (incomingMessage === "deposit" || incomingMessage === "2") {

      twiml.message(
        "Great, lets get on with depositing some assets. What assets do you want to deposit?"
      );
      user.step = 8;
    } else if( incomingMessage === "withdraw" || incomingMessage === "3") {
        
      twiml.message(
        "Wonderful, lets get on with withdrawing some assets. What assets do you want to withdraw"
      );
      user.step = 8;
    } else {
      twiml.message(
        "Please choose:\n1. Initiate a transaction\n2. Deposit\n3. Withdraw"
      );
    }
  } else if (user.step === 5) {
    const recipient = incomingMessage;
    recipientName = recipient;

    if (recipientName) {
      twiml.message("Provide the asset you wish to transact with");
      user.step = 6;
    } else {
      twiml.message("Recipient username is required.");
      user.step = 4;
    }
  } else if (user.step === 6) {
    const asset = incomingMessage;
    assetTransct = asset;

    if (assetTransct) {
      twiml.message("Provide the amount you wish to transact");
      user.step = 7;
    } else {
      twiml.message("An amount id required to continue is required.");
      user.step = 5;
    }
  } else if (user.step === 7) {
    const amount = incomingMessage;
    amountTransct = amount;

    if (recipientName && assetTransct && amountTransct) {
      console.log(
        `The name-----> ${recipientName}, the asset-----> ${assetTransct}, the amount-----> ${amountTransct}, the user-------> ${userName}`
      );

      try {

        const transact = await transactFunds(userName, recipientName, amountTransct)

        if(transact === true){
          twiml.message(`Transaction to ${recipientName} was successful.`);
        } else {
          twiml.message(
            "Operational error during transaction please repeat the process"
          );
        }
        
      } catch (error) {
        console.error("Error during transaction:", error);
        twiml.message(
          "An error occurred during the transaction. Please try again."
        );
        user.step = 4;
      }
    } else {
      twiml.message("Recipient username is required.");
      user.step = 4;
    }
  } else if (user.step === 8) {
    const changeAsset = incomingMessage;
    console.log(changeAsset)
    reqChangeAsset = changeAsset;
    console.log("The passed asset------>", reqChangeAsset);

    if (reqChangeAsset) {
      try {
        const loginData2 = loginStatus["undefined"];
        const depoUrl = specUrl;
        console.log("The require url is ----------->", specUrl)
        if (loginData2 && loginData2.secretKey) {
          const depositHandle = await withdrawDeposit(
            reqChangeAsset,
            depoUrl,
            loginData2.secretKey
          );
          // console.log("The data am supposed to receive------------->",depositHandle);

          if (depositHandle.code === 200) {
            twiml.message(
              `Navigate to this URL to complete the deposit process:\n${depositHandle.url}`
            );
          } else {
            twiml.message(
              "Operational error occured. Please repeat the process"
            );
            user.step = 4;
          }
        }
      } catch (error) {
        console.error("Error during transaction:", error);
        twiml.message(
          "An error occurred during the transaction. Please try again."
        );
        user.step = 4;
      }
    } else {
      twiml.message("Recipient username is required.");
      user.step = 4;
    }
  }
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

initMessage();

module.exports = router;
