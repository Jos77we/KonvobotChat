const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { MessagingResponse } = require("twilio").twiml;
const { getStoredUserDetails } = require("./CreateAccount");
const { getUserLogins } = require("./LoginUsers");
// const addAssetTrust = require("./addAssetTrust");
// const clubTokenSponsering = require("./newClubTokens");
const checkAccount = require("./checkAccounts");
const buyTokens = require("./buyTokenTransaction");
const { fetchMatchData } = require("./tickets");
const { allTeams } = require("./getTeams");
const getJersey = require("./getJersey");
const buyClubJersey = require("./buyClubJersey");
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));

// const apiKeySid = "SK95a3c7d21fb47759ebe4571b2fe32208";
// const accountSid = "ACb4cf2d815575aca31959f1a58020a221";
// const authToken = "a3bea88ce8ea5e2a81e81209f2368f56";

const accountSid = "AC9f97bf6338fd0b5613d4a36ef7893346"; // Add your Account SID here
const authToken = "a9068e6ffc97e50f3ddbefe5b487bd8b"; // Add your Auth Token here
const client = require("twilio")(accountSid, authToken);
// const client = new twilio(apiKeySid, authToken);

const userLink = "https://konvobot-z41p.onrender.com/login";
const createAcc = "https://konvobot-z41p.onrender.com/create-user";

let userState = {};

let recipientPhoneNo = null;
let assetTransct = null;
let amountTransct = null;
let userName = null;
let reqChangeAsset = null;
let newAmountToken = null;
let tokenAsset = null;
let tokenAmount = null;
let merchChoice = null;
let merchCategory = null;
let merchSize = null;
let merchCustomization = null;
let mpesaNo = null
let ticketChoice = null;
let teamName = null;
const givenPhoneNo = "254759900998";
let newPhoneNo = null;
let userPBKey = null;
let availableTeams = [];

// function initMessage() {

// }

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMessage = req.body.Body.trim().toLowerCase();
  const fromNumber = req.body.From;

  function handleError(message) {
    twiml.message(message);
    user.step = 4; // Reset to step 4 to try again
  }

  function sucessHandeling(message) {
    twiml.message(message);
    user.step = 4; // Reset to step 4 to try again
  }

  function startHandleError(message) {
    twiml.message(message);
    user.step = 2;
  }

  if (!userState[fromNumber]) {
    userState[fromNumber] = { step: 0 };
  }

  const user = userState[fromNumber];

  //The first step to log in or create an account
  if (user.step === 0) {
    twiml.message(
      'Welcome to Konvo Pay. Buy, trade and pay in crypto from your WhatsApp. Text "Log in" to get access to your account. If new text "Create Account" \u{1F60A}'
    );

    user.step = 1;
  } else if (user.step === 1) {
    // Main menu
    // client.messages.create({
    //   body: `Welcome to Benkiko Dao. To explore more procced by choosing:\n1. Clubs\n2. Club tokens and balances\n3. About us`,
    //   from: "whatsapp:+14155238886",
    //   to: "whatsapp:+254759900998",
    // });
    // user.step = 2;
    if (incomingMessage === "create account") {
      twiml.message(
        `To procced with creating your account in a secure way, follow the link ${createAcc}`
      );

      let checkAttempts = 0;
      const maxAttempts = 3; // 3 attempts (2 minutes per attempt = 6 minutes max)
      const intervalDuration = 120000; // 2 minutes in milliseconds

      // Start checking
      const intervalId = setInterval(() => {
        checkAttempts++;

        try {
          // Retrieve stored user details
          const userDetails = getStoredUserDetails();

          if (userDetails) {
            // If details are found, stop the interval and proceed
            console.log("User details found:", userDetails);

            const { phoneNumber, publicKey } = userDetails;

            newPhoneNo = userDetails.phoneNumber;
            userPBKey = userDetails.publicKey;

            // Notify the user of successful account creation
            client.messages.create({
              body: `Your account has been successfully created!\nPhone Number: ${phoneNumber}\nPublic Key: ${publicKey}\n\n Welcome to Benkiko Dao. To explore more procced by choosing:\n1. Clubs\n2. Club tokens and balances\n3. About us`,
              from: "whatsapp:+14155238886", // Your Twilio WhatsApp number
              to: "whatsapp:+254759900998", // Replace with user's WhatsApp number
            });
            user.step = 2;
            // Stop checking
            clearInterval(intervalId);
          } else {
            // No details yet, log the attempt
            console.log("No user details found yet. Retrying...");
          }
        } catch (error) {
          console.error("Error retrieving user details:", error);
        }

        // Stop checking after maximum attempts
        if (checkAttempts >= maxAttempts) {
          clearInterval(intervalId);
          twiml.message(
            "We couldn't create your account within the expected timeframe. Please try again later."
          );
          console.log("Stopped checking after 6 minutes.");
        }
      }, intervalDuration);
    } else if (incomingMessage === "log in") {
      twiml.message(
        `Please provide your paymail and password through the link ${userLink}`
      );

      const maxAttempts = 3;
      const intervalDuration = 120000;
      let checkAttempts = 0;

      let intervalId = setInterval(() => {
        checkAttempts++;

        try {
          // Retrieve stored user login details
          const userDetails = getUserLogins();

          if (userDetails) {
            console.log("User login details found:", userDetails);

            const { phoneNumber, publicKey } = userDetails;

            newPhoneNo = userDetails.phoneNumber;
            userPBKey = userDetails.publicKey;

            console.log("The new public key is ---->", userPBKey);

            // Notify the user of successful login
            client.messages.create({
              body: `Welcome back! The login was successful!\nPhone Number: ${phoneNumber}\nStellar Public Key: ${publicKey}\n\n Welcome to Benkiko Dao. To explore more procced by choosing:\n1. Clubs\n2. Club tokens and balances\n3. About us`,
              from: "whatsapp:+14155238886",
              to: "whatsapp:+254759900998",
            });

            user.step = 2;
            clearInterval(intervalId); // Stop checking once successful login is found
          } else {
            console.log("No login details found yet. Retrying...");
          }
        } catch (error) {
          console.error("Error retrieving login details:", error);
        }

        // Stop checking after maximum attempts
        if (checkAttempts >= maxAttempts) {
          clearInterval(intervalId);
          twiml.message(
            "We couldn't verify your login details within the expected timeframe. Please try again later."
          );
          console.log("Stopped checking after 6 minutes.");
        }
      }, intervalDuration);
    } else {
      twiml.message(
        'Please type "create account" to create a new account or "log in" to log into an existing account.'
      );
    }
  } else if (user.step === 2) {
    if (incomingMessage === "clubs" || incomingMessage === "1") {
      const getAllTeams = await allTeams();

      if (getAllTeams && getAllTeams.length > 0) {
        availableTeams = getAllTeams;
        console.log("The obtained teams are ---->", availableTeams);
        twiml.message(
          `The teams available are as the following. Choose your team. \n\n${getAllTeams}`
        );
        user.step = 3;
      } else if (getAllTeams === 5001) {
        startHandleError(
          "Connection was timed out please try again by selecting \n1. Clubs\n2. Club tokens and balances\n3. About us"
        );
      } else {
        startHandleError(
          "No teams where found, please try again\n1. Clubs\n2. Club tokens and balances\n3. About us"
        );
      }
    } else if (incomingMessage === "club tokens" || incomingMessage === "2") {
      const accBalances = await checkAccount(userPBKey);

      if (accBalances) {
        const balanceString = accBalances
          .map((balance) => {
            return `\nAsset: ${balance.asset_code}\nBalance: ${balance.balance} `;
          })
          .join("\n");

        twiml.message(
          `Your account for phone number ${givenPhoneNo} has the following balances:\n${balanceString}`
        );
        startHandleError(
          "To continue with more club options choose from the following options,\n1. Clubs\n2. Club tokens and balances\n3. About us"
        );
      } else {
        startHandleError(
          `No accounts for the number ${givenPhoneNo} were found, to proceed choose the options,\n1. Clubs\n2. Club tokens and balances\n3. About us`
        );
      }
    } else {
      startHandleError(
        "There was a wrong input please try using the number or wording from , \n1. Clubs\n2. Club tokens and balances\n3. About us"
      );
    }
  } else if (user.step === 3) {
    teamName = incomingMessage.trim();
    console.log("List of teaams is ------->", availableTeams);

    const teamLists = availableTeams.toLowerCase();
    console.log("New teams are as ------->", teamLists);

    if (teamLists.includes(teamName)) {
      // If valid team, proceed to next step
      twiml.message(
        `Welcome to the ${teamName} menu! How would you like to proceed? Please choose:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost your Player`
      );
      user.step = 4;
    } else {
      twiml.message(
        "The team you entered is not recognized by us please try again"
      );
      user.step = 2;
    }
  } else if (user.step === 4) {
     if (
      incomingMessage === "buy club fan tokens" ||
      incomingMessage === "1"
    ) {

      const checkAccountDetail = await checkAccount(userPBKey);

      if (checkAccountDetail) {
        const teamTokens = checkAccountDetail
          .map((item) => item.asset_code)
          .join("\n"); // Join all asset codes with a newline

        await client.messages.create({
          body: `Wonderful add more tokens to your club account.Your account has the following tokens:\n${teamTokens}\n\nChoose which team token you wish to buy.`,
          from: "whatsapp:+14155238886",
          to: "whatsapp:+254759900998",
        });

        user.step = 11;
      } else {
        sucessHandeling(
          "An error occure please wait as we fix it, try again\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player"
        );
      }
    } else if (incomingMessage === "club merch" || incomingMessage === "2") {
      const jerseyDet = await getJersey(teamName);

      if (
        jerseyDet &&
        typeof jerseyDet === "object" &&
        "type" in jerseyDet &&
        "price" in jerseyDet
      ) {
        twiml.message(
          `Welcome to Club merch, the available merch is of jersey which are;\n Category: ${jerseyDet.type} \n Price: ${jerseyDet.price}\n If you wish to purchase text YES if not text No`
        );
        user.step = 14;
      } else if (jerseyDet === 2301) {
        handleError(
          "An error occured when fetching jersey details we are working to resolve it, please try again.\n1.  Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player "
        );
      } else if (jerseyDet === 2302) {
        handleError(
          "The team provided was not found in our database, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player "
        );
      } else if (jerseyDet === 2303) {
        handleError(
          "Invalid team name was used, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player "
        );
      } else {
        handleError(
          "An error is experienced we are working to resolve this, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player "
        );
      }
    } else if (incomingMessage === "match tickets" || incomingMessage === "3") {
      const ticketAvail = await fetchMatchData();

      if (ticketAvail === 500) {
        handleError(
          "An error ocurred when fetching tickets, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player "
        );
      } else {
        twiml.message(
          `Which tickets would you want to purchase,Enter the ticket number for the ticket you want to purchase\n \n${ticketAvail}`
        );
        user.step = 18;
      }
    } else if (incomingMessage === "boost player" || incomingMessage === "4") {
      const choseTeam = await allTeams();

      if (!choseTeam) {
        handleError(
          "No teams has been found currently. We working to fix that, please try again.\n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player "
        );
      } else {
        twiml.message(
          `This are the teams, choose your players team ${choseTeam}`
        );
        user.step = 19;
      }
    }
  }  else if (user.step === 11) {
    if (
      incomingMessage === "xlm" ||
      incomingMessage === "srt" ||
      incomingMessage === "usdc"
    ) {
      tokenAsset = incomingMessage;

      twiml.message(
        "Your code was recieved. Please enter your mpesa number for the transaction"
      );
      user.step = 12;
    } else {
      handleError(
        "You entered the wrong token code, please try again.\n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player "
      );
    }
  } else if(user.step === 12){
    if(incomingMessage.length !== 10){
      handleError(
        "You entered the wrong phone number format, please try again.\n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player "
      );
    } else {
      mpesaNo = incomingMessage;
      user.step === 13
    }
    
  } else if (user.step === 13) {
    tokenAmount = incomingMessage;

    try {
      if (tokenAsset && tokenAmount) {
        const payForClubTokens = await buyTokens(
          userPBKey,
          mpesaNo,
          teamName,
          tokenAsset,
          tokenAmount
        );

        if (payForClubTokens === true) {
          twiml.message(
            `Your account for club Tokens ${tokenAsset} has been credited with KES ${tokenAmount}.`
          );
          sucessHandeling(
            "To proceed with other options, input \n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player"
          );
        } else {
          twiml.message(
            "Operational error during transaction please repeat the process"
          );
          handleError(
            "Operational error during transaction please repeat the process \n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player"
          );
        }
      } else {
       
        handleError(
          "No token or amount provided, please try again \n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player"
        );
      }
    } catch (error) {
      console.error("Error during transaction:", error);
      handleError(
        "An error occurred during the transaction. Please try again. \n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player"
      );
    }
  } else if (user.step === 14) {
    merchChoice = incomingMessage;

    if (merchChoice === "yes") {
      twiml.message(
        "A prompt has been sent your way. INput your details to finish the transaction"
      );
      const purchaseJersey = await buyClubJersey(teamName, newPhoneNo);

      if (purchaseJersey === 3003) {
        twiml.message("Your purchase has been successfully received.");
        sucessHandeling(
          "To proceed with other options, input \n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player"
        );
      } else if (purchaseJersey === 3004) {
        twiml.message("An unsuccessful transaction due to mpesa failure");
        user.step = 1;
      } else if (purchaseJersey === 3005) {
        twiml.message(
          "An error occurred when parsing data. We are working to fix this error"
        );
        user.step = 1;
      } else {
        twiml.message("An error occured please start again");
        user.step = 1;
      }

      user.step = 1;
    } else if (merchChoice === "no") {
      twiml.message("Thank you for your response. Come back anytime");
      user.step = 4;
    } else {
      twiml.message("You entered the wrong choice. Please try again");
      user.step = 4;
    }

    user.step = 4;
  } else if (user.step === 15) {
    merchCategory = incomingMessage;

    twiml.message(
      "We are so lucky for you supporting us. What size fit are you, is it small, medium or large "
    );

    user.step = 15;
  } else if (user.step === 16) {
    merchSize = incomingMessage;
    twiml.message(
      "Amazing! What wordings would you want to have on your merch"
    );
    user.step = 16;
  } else if (user.step === 17) {
    merchCustomization = incomingMessage;
    twiml.message(
      "Thank you for purchasing your teams merch. Delivery is on process, Enjoy"
    );
  } else if (user.step === 18) {
    ticketChoice = incomingMessage;

    const payTicket = await buyClubJersey(teamName, givenPhoneNo);

    if (payTicket === 3003) {
      twiml.message("Your purchase has been successfully received.");
      user.step = 1;
    } else if (payTicket === 3004) {
      twiml.message("An unsuccessful transaction due to mpesa failure");
      user.step = 1;
    } else if (payTicket === 3005) {
      twiml.message(
        "An error occurred when parsing data. We are working to fix this error"
      );
      user.step = 1;
    } else {
      twiml.message("An error occured please start again");
      user.step = 1;
    }
    user.step = 1;
  }
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

// initMessage();

module.exports = router;
