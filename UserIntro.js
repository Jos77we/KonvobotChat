const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { MessagingResponse } = require("twilio").twiml;
const { chainRequest } = require("./CreateAcc.js");
const axios = require("axios");
const { initPayment } = require("./Payment.js");
const { withdrawDeposit } = require("./WithdrawDeposit.js");
const router = express.Router();



router.use(bodyParser.urlencoded({ extended: false }));

const apiKeySid = "SK95a3c7d21fb47759ebe4571b2fe32208";
const accountSid = "ACb4cf2d815575aca31959f1a58020a221";
const authToken = "bwtnq2FtwdCJrqbAjJUePmNBlPMD4XYp";

const client = new twilio(apiKeySid, authToken, { accountSid: accountSid });

const sendLink = "https://konvoui.netlify.app/confirm-user";
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
let reqChangeAsset = null;
let specUrl = null;

const successRes = async (form) => {
  try {
    const response = await axios.post(
      "https://api.kipaji.app/api/v1/auth/register",
      form
    );
    if (response.data && response.data.token) {
      return response.data.token;
    } else {
      console.log({ code: "2001", Message: "Error registering user" });
      return null;
    }
  } catch (error) {
    console.error("There was an error!", error);
    return null;
  }
};

async function loginSuccess(paymail, password) {
  try {
    const response = await axios.post(
      "https://api.kipaji.app/api/v1/auth/login",
      { paymail, password }, 
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);

    if (response.data) {
      return {
        status: 200,
        token: response.data.token,
        secretKey: response.data.secretKey,
        username: response.data.username,
      };
    } else {
      return { status: 404, data: { code: "404", Message: "Not Found" } };
    }
  } catch (error) {
    console.error("Error making Axios request:", error);
    return {
      status: 500,
      data: { code: "5000", Message: "Internal Server Error" },
    };
  }
}

router.post("/create", async (req, res) => {
  const { form } = req.body;

  if (!form) {
    console.log("An error occurred as no data is passed");
    res.status(400).send("No data passed");
  } else {
    try {
      const token = await successRes(form);
      if (token) {
        const key = Date.now();
        userState[key] = { token };

        res.status(200).send({ key });
      } else {
        res.status(500).send("Error registering user");
      }
    } catch (error) {
      console.error("Error during successRes:", error);
      res.status(500).send("Server error");
    }
  }
});

router.post("/login-user", async (req, res) => {
  const { paymail, password } = req.body;

  if (!paymail || !password) {
    return res
      .status(400)
      .json({ code: "2000", Message: "Error in obtaining details" });
  }

  const result = await loginSuccess(paymail, password);
  loginStatus[req.body.From] = result;
  // console.log("THis is the result",result)

  return res.status(result.status).json(result);
});

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

      const checkStatusInterval = setInterval(async () => {
        //  console.log(`Checking loginStatus for ${fromNumber}:`, loginStatus);

        const status = loginStatus["undefined"]?.status;
        // console.log("The correct status is:", status)
        const userName = loginStatus["undefined"]?.username;
        // console.log("The guys name is:", userName)

        if (status === 200) {
          clearInterval(checkStatusInterval);
          await client.messages.create({
            body: `Hello ${userName}, Welcome back. To proceed, please choose:\n1. Initiate a transaction\n2. Deposit\n3. Withdraw`,
            from: "whatsapp:+14155238886",
            to: fromNumber,
          });

          user.step = 4;
        } else if (status === 404 || status === 500) {
          clearInterval(checkStatusInterval);
          await client.messages.create({
            body: "Invalid paymail or password, Please try again",
            from: "whatsapp:+14155238886",
            to: fromNumber,
          });
          user.step = 0;
        }
      }, 5000); // Check every 5 seconds

      // Stop checking after 4 minutes
      setTimeout(() => {
        clearInterval(checkStatusInterval);
        if (!loginStatus[fromNumber]?.status) {
          twiml.message("Login process timed out. Please try again.");
          user.step = 0;
        }
      }, 240000); // 4 minutes
    } else {
      twiml.message(
        'Please type "create account" to create a new account or "log in" to log into an existing account.'
      );
    }
  } else if (user.step === 1) {
    user.name = incomingMessage;
    twiml.message(`Hello ${user.name}`);
    const response = await chainRequest(user.name);
    console.log("The response is ------>", response)

    if (response === 201) {
      user.key = Date.now();
      twiml.message(
        `Click this link to continue: ${sendLink}, You have 3 minutes`
      );

      setTimeout(async () => {
        try {
          const key = String(user.key);

          if (key) {
            await client.messages.create({
              body: "Welcome aboard, you have successfully joined Benkiko. To proceed reply with Log in",
              from: "whatsapp:+14155238886",
              to: fromNumber,
            });
            user.step = 0;
          } else {
            await client.messages.create({
              body: "Sorry, an error was encountered in registering you.",
              from: "whatsapp:+14155238886",
              to: fromNumber,
            });
            user.step = 0;
          }
        } catch (error) {
          console.error("Error during validateLogin:", error);
          await client.messages.create({
            body: "Account creation isn't successful.",
            from: "whatsapp:+14155238886",
            to: fromNumber,
          });
          user.step = 0;
        }
      }, 300000); // 5 minutes in milliseconds
    } else {
      twiml.message("An error occurred during registration. Please try again.");
      user.step = 0;
    }
  } else if (user.step === 4) {
    if (
      incomingMessage === "initiate a transaction" ||
      incomingMessage === "1"
    ) {
      twiml.message("Please provide the recipient's username.");
      user.step = 5;
    } else if (incomingMessage === "deposit" || incomingMessage === "2") {
      specUrl = "https://staging.api.benkiko.io/v1/transactions/deposit/interactive";
      twiml.message(
        "Great, lets get on with depositing some assets. What assets do you want to deposit?"
      );
      user.step = 8;
    } else if( incomingMessage === "withdraw" || incomingMessage === "3") {
      specUrl = "https://staging.api.benkiko.io/v1/transactions/withdraw/interactive"
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
        `The name-----> ${recipientName}, the asset-----> ${assetTransct}, the amount-----> ${amountTransct}`
      );

      try {
        const loginData = loginStatus["undefined"];
        console.log("This is the login data:", loginData);
        if (loginData && loginData.token && loginData.secretKey) {
          const paymentResponse = await initPayment(
            recipientName,
            assetTransct,
            amountTransct,
            loginData.token,
            loginData.secretKey
          );

          if (paymentResponse.code === 201) {
            twiml.message(`Transaction to ${recipientName} was successful.`);
          } else {
            twiml.message(
              "Operational error during transaction please repeat the process"
            );
          }
        } else {
          twiml.message("Login data is missing. Please log in again.");
          user.step = 0;
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
