const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { MessagingResponse } = require("twilio").twiml;
const { chainRequest } = require("./CreateAcc.js");
const axios = require("axios");

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
const tokenStore = {};
const loginStatus = {}; // Track login status by user number

const successRes = async (form) => {
  try {
    const response = await axios.post(
      "https://api.kipaji.app/api/v1/auth/register",
      form
    );
    if (response.data && response.data.token) {
      console.log("Received token:", response.data.token);
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
    const response = await axios.post("https://api.kipaji.app/api/v1/auth/login", { paymail, password }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(response.data);

    if (response.data) {
      return { status: 200, data: response.data }; // Success
    } else {
      return { status: 404, data: { code: "404", Message: "Not Found" } }; // Not Found or Error
    }
  } catch (error) {
    console.error('Error making Axios request:', error);
    return { status: 500, data: { code: "5000", Message: "Internal Server Error" } }; // Internal Server Error
  }
}

router.post("/create", async (req, res) => {
  const { form } = req.body;
  console.log("Received form:", form);

  if (!form) {
    console.log("An error occurred as no data is passed");
    res.status(400).send("No data passed");
  } else {
    try {
      const token = await successRes(form);
      if (token) {
        const key = Date.now();
        tokenStore[key] = token;

        // Log the stored token and key
        console.log(`Stored token: ${token} with key: ${key}`);

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

router.post('/login-user', async (req, res) => {
  const { paymail, password } = req.body;

  console.log({ paymail, password });

  if (!paymail || !password) {
    return res.status(400).json({ code: "2000", Message: "Error in obtaining details" });
  }

  const result = await loginSuccess(paymail, password);
  loginStatus[req.body.From] = result; // Track the login status by user number

  console.log('loginSuccess result:', result);
  console.log('current status', result.status);

  return res.status(result.status).json(result.data);
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
      twiml.message(`Please provide your paymail and password through the link ${userLink}`);

      // Start checking for the status
      const checkStatusInterval = setInterval( async () => {
        console.log(`Checking loginStatus for ${fromNumber}:`, loginStatus);
        // const status = loginStatus[fromNumber]?.status;

        const status = loginStatus["undefined"]?.status
        console.log("The obtained status", status)

        const userName = loginStatus["undefined"]?.data.username
        console.log("The user is called:", userName)

        if (status === 200) {
          clearInterval(checkStatusInterval);
          await client.messages.create({
            body: `Hello ${userName}, Welcome back`,
            from: "whatsapp:+14155238886", // Twilio Sandbox number
            to: fromNumber,
          });
          // twiml.message(`Hello ${user.username}, Welcome back`);
          // twiml.message(
          //   "How would you want to proceed? 1. Initiate a transaction, 2. View transaction history, 3. Swap Currencies"
          // );

          user.step = 4;
        } else if (status === 404 || status === 500) {
          clearInterval(checkStatusInterval);
          await client.messages.create({
            body: "Invalid paymail or password, Please try again",
            from: "whatsapp:+14155238886", // Twilio Sandbox number
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
    console.log("chainRequest response:", response);

    if (response === 201) {
      user.key = Date.now(); // Store the key for this user
      twiml.message(`Click this link to continue: ${sendLink}, You have 5 minutes`);

      // Log the current tokenStore contents for debugging
      console.log("Current tokenStore contents before timeout:", tokenStore);

      // Start the 5-minute countdown after token is stored
      setTimeout(async () => {
        try {
          console.log("Current tokenStore contents after timeout:", tokenStore);
          const key = String(user.key);
          console.log(key);

          // const token = tokenStore[key];
          // console.log(token);

          if (key) {
            
            await client.messages.create({
              body: "Welcome aboard, you have successfully joined Benkiko. How would you want to proceed? 1. Initiate a transaction, 2. View transaction history, 3. Swap Currencies",
              from: "whatsapp:+14155238886", // Twilio Sandbox number
              to: fromNumber,
            });
          } else {
            await client.messages.create({
              body: "Sorry, an error was encountered in registering you.",
              from: "whatsapp:+14155238886", // Twilio Sandbox number
              to: fromNumber,
            });
            user.step = 0;
          }
        } catch (error) {
          console.error("Error during validateLogin:", error);
          await client.messages.create({
            body: "Account creation isn't successful.",
            from: "whatsapp:+14155238886", // Twilio Sandbox number
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
    // Handle other steps and user actions here
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

initMessage();

module.exports = router;
