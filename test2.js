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
const { getTeamPlayers } = require("./getTeamPlayers");
const buyTickets = require("./buyTickets");
const router = express.Router();
require('dotenv').config();

router.use(bodyParser.urlencoded({ extended: false }));


const accountSid = process.env.ACC_SID
const authToken = process.env.AUTH_TOKEN
const client = require("twilio")(accountSid, authToken);
// const client = new twilio(apiKeySid, authToken);

const userLink = process.env.USER_LINK
const createAcc = process.env.CREATE_ACC

let userState = {};

let tokenAsset = null;
let tokenAmount = null;
let merchChoice = null;
let jerseyPrice = null;
let mpesaNo = null;
let ticketChoice = null;
let teamName = null;
let newPhoneNo = null;
let userPBKey = null;
let availableTeams = [];
let ticketData = [];
let ticketAmt = null;
let player = null;


function setInactivityTimer(fromNumber) {
  const INACTIVITY_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  // Clear any existing timer
  if (userState[fromNumber]?.inactivityTimeoutId) {
    clearTimeout(userState[fromNumber].inactivityTimeoutId);
  }

  // Set a new inactivity timer
  const timeoutId = setTimeout(() => {
    const user = userState[fromNumber];
    if (user) {
      user.step = 0; // Reset to step 0
      delete user.inactivityTimeoutId; // Remove the timer ID

      // Notify the user
      client.messages.create({
        body: "You were inactive for an hour. Please log in again to continue by texting join why-stream then Hello.",
        from: "whatsapp:+14155238886",
        to: fromNumber,
      });

      // console.log(
      //   `User ${fromNumber} has been reset to step 0 due to inactivity.`
      // );
    }
  }, INACTIVITY_DURATION);

  // Update user's state with the new timeout ID
  userState[fromNumber].inactivityTimeoutId = timeoutId;
}

// Helper function to handle user activity
function handleUserActivity(fromNumber) {
  const user = userState[fromNumber];
  if (user) {
    user.lastActivity = Date.now(); // Update last activity time
    setInactivityTimer(fromNumber); // Reset the inactivity timer
  }
}

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
    userState[fromNumber] = {
      step: 0,
      lastActivity: Date.now(),
      inactivityTimeoutId: null,
    };
  }

  const user = userState[fromNumber];

  // Track activity and reset inactivity timer
  handleUserActivity(fromNumber);

  //The first step to log in or create an account
  if (user.step === 0) {
    twiml.message(
      'Welcome to Konvo Pay. Buy, trade and pay in crypto from your WhatsApp. Text "Log in" to get access to your account. If new text "Create Account" \u{1F60A}'
    );

    user.step = 1;
  } else if (user.step === 1) {
    // Main menu
    if (incomingMessage === "create account") {
      twiml.message(
        `To procced with creating your account in a secure way, follow the link ${createAcc}`
      );

      let checkAttempts = 0;
      const maxAttempts = 5; // 5 attempts (1 minute per attempt = 5 minutes max)
      const intervalDuration = 60000; // 1 minute in milliseconds

      // Start checking
      const intervalId = setInterval(async () => {
        checkAttempts++;

        try {
          // Retrieve stored user details
          const userDetails = await getStoredUserDetails();

          if (userDetails) {
            // If details are found, stop the interval and proceed
            // console.log("User details found:", userDetails);

            const { phoneNumber, publicKey } = userDetails;

            newPhoneNo = userDetails.phoneNumber;
            userPBKey = userDetails.publicKey;

            // Notify the user of successful account creation
            client.messages.create({
              body: `Your account has been successfully created!\nPhone Number: ${phoneNumber}\nPublic Key: ${publicKey}\n\n Welcome to Benkiko Dao. To explore more procced by choosing:\n1. Clubs\n2. Club tokens and balances\n3. About us`,
              from: "whatsapp:+14155238886", // Your Twilio WhatsApp number
              to: fromNumber, // Replace with user's WhatsApp number
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
          client.messages.create({
            body: "We couldn't verify you created your account within the expected timeframe. Please try again later by typing Create account",
            from: "whatsapp:+14155238886",
            to: fromNumber,
          });
          user.step = 1
          console.log("Stopped checking after 6 minutes.");
        }
      }, intervalDuration);
    } else if (incomingMessage === "log in") {
      twiml.message(
        `Please provide your paymail and password through the link ${userLink}`
      );

      const maxAttempts = 5;
      const intervalDuration = 60000;
      let checkAttempts = 0;

      let intervalId = setInterval(() => {
        checkAttempts++;

        try {
          // Retrieve stored user login details
          const userDetails = getUserLogins();

          if (userDetails) {
            // console.log("User login details found:", userDetails);

            const { phoneNumber, publicKey } = userDetails;

            newPhoneNo = userDetails.phoneNumber;
            userPBKey = userDetails.publicKey;

            // console.log("The new public key is ---->", userPBKey);

            // Notify the user of successful login
            client.messages.create({
              body: `Welcome back! The login was successful!\nPhone Number: ${phoneNumber}\nStellar Public Key: ${publicKey}\n\n Welcome to Benkiko Dao. To explore more procced by choosing:\n1. Clubs\n2. Club tokens and balances\n3. About us`,
              from: "whatsapp:+14155238886",
              to: fromNumber,
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
          client.messages.create({
            body: "We couldn't verify your login details within the expected timeframe. Please try again later by typing Log in",
            from: "whatsapp:+14155238886",
            to: fromNumber,
          });
          user.step = 1
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

        const teamsArray = Array.isArray(getAllTeams)
        ? getAllTeams
        : getAllTeams.split(', ');

        const numberedTeams = teamsArray
        .map((team, index) => `${index + 1}. ${team}`)
        .join('\n');
        // console.log("The obtained teams are ---->", availableTeams);
        twiml.message(
          `The teams available are as the following. Choose your team. \n\n${numberedTeams}`
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
          `Your account for phone number ${newPhoneNo} has the following balances:\n${balanceString}`
        );
        startHandleError(
          "To continue with more club options choose from the following options,\n1. Clubs\n2. Club tokens and balances\n3. About us"
        );
      } else {
        startHandleError(
          `No account balances for the number ${newPhoneNo} were found, to proceed choose the options,\n1. Clubs\n2. Club tokens and balances\n3. About us`
        );
      }
    } else {
      startHandleError(
        "There was a wrong input please try using the number or wording from , \n1. Clubs\n2. Club tokens and balances\n3. About us"
      );
    }
  } else if (user.step === 3) {
    teamName = incomingMessage.trim();
    // console.log("List of teaams is ------->", availableTeams);

    const teamLists = availableTeams.toLowerCase();
    // console.log("New teams are as ------->", teamLists);

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
    if (incomingMessage === "buy club fan tokens" || incomingMessage === "1") {
      const checkAccountDetail = await checkAccount(userPBKey);

      if (checkAccountDetail) {
        const teamTokens = checkAccountDetail
          .map((item) => item.asset_code)
          .join("\n"); // Join all asset codes with a newline

        await client.messages.create({
          body: `Wonderful add more tokens to your club account.Your account has the following tokens:\n\n${teamTokens}\n\nChoose which team token you wish to buy.`,
          from: "whatsapp:+14155238886",
          to: fromNumber,
        });

        user.step = 11;
      } else {
        sucessHandeling(
          "An error occure please wait as we fix it, try again\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
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
        jerseyPrice = jerseyDet.price;
        twiml.message(
          `Welcome to Club merch, the available merch is of jersey which are;\n Category: ${jerseyDet.type} \n Price: ${jerseyDet.price}\n\nEnter your mpesa number to continue with the transaction`
        );
        user.step = 14;
      } else if (jerseyDet === 2301) {
        handleError(
          "An error occured when fetching jersey details we are working to resolve it, please try again.\n1.  Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      } else if (jerseyDet === 2302) {
        handleError(
          "The team provided was not found in our database, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      } else if (jerseyDet === 2303) {
        handleError(
          "Invalid team name was used, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      } else {
        handleError(
          "An error is experienced we are working to resolve this, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      }
    } else if (incomingMessage === "match tickets" || incomingMessage === "3") {
      const ticketAvail = await fetchMatchData();

      if (ticketAvail === 500) {
        handleError(
          "An error ocurred when fetching tickets, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      } else {
        ticketData = ticketAvail;
        const formattedTickets = ticketAvail
          .map((ticket) => {
            return `Ticket Number: ${ticket["Ticket Number"]}\nDate: ${
              ticket.Date
            }\nTeam: ${ticket.Team}\nTime: ${ticket.Time}\nVenue: ${
              ticket.Venue
            }\nVIP Price: ${ticket.Tickets.VIP || "N/A"}, Regular Price: ${
              ticket.Tickets.Regular || "N/A"
            }`;
          })
          .join("\n\n");

        twiml.message(
          `Which tickets would you want to purchase? Enter the ticket number for the ticket you want to purchase:\n\n${formattedTickets}`
        );
        // console.log("The updated ticket data is as --->", ticketData);
        user.step = 18;
      }
    } else if (incomingMessage === "boost player" || incomingMessage === "4") {

      const givenTeamName = teamName
      const choseTeam = await getTeamPlayers(givenTeamName);

      if (choseTeam.length > 0) {
        twiml.message(
          `This are the team players, ${choseTeam}. Enter the name of the payer you want to sponser`
        );
        user.step = 20;
      } else {
        handleError(
          "No players were found currently. We working to fix that, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
        );
      }
    } else if(incomingMessage === 'main menu' || incomingMessage === "5"){
      client.messages.create({
        body: 'Welcome back to the Main Menu. which option would you want proceed with:\n1. Clubs\n2. Club tokens and balances\n3. About us',
        from: "whatsapp:+14155238886",
        to: fromNumber,
      });
      user.step = 2
    }
  } else if (user.step === 11) {
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
        "You entered the wrong token code, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
      );
    }
  } else if (user.step === 12) {
    const numberGiven = incomingMessage;
    // console.log("The responded mpesa number ----->", numberGiven);
    if (numberGiven.length !== 10) {
      handleError(
        "You entered the wrong phone number format, please try again.\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu "
      );
    } else {
      mpesaNo = numberGiven;
      // console.log("The passed mpesa number ---->", mpesaNo);
      twiml.message("Enter the amount in KES you want to purchase as tokens");
      user.step = 13;
    }
  } else if (user.step === 13) {
    tokenAmount = incomingMessage;

    try {
      if (tokenAsset && tokenAmount) {
        const payForClubTokens = await buyTokens(
          userPBKey,
          mpesaNo,
          tokenAsset,
          tokenAmount
        );

        // console.log("THe returned value is --->", payForClubTokens);
        if (payForClubTokens && payForClubTokens.amount) {
          const assetTokenObt = tokenAsset.toUpperCase()
          client.messages.create({
            body: `Your account for club Tokens ${payForClubTokens.amount} ${assetTokenObt} has been credited with KES ${tokenAmount}. To proceed with other options, input \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu`,
            from: "whatsapp:+14155238886", // Your Twilio WhatsApp number
            to: fromNumber, // Replace with user's WhatsApp number
          });

          user.step = 4;
        } else {
          handleError(
            "Operational error during transaction please repeat the process \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
          );
        }
      } else {
        handleError(
          "No token or amount provided, please try again \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
        );
      }
    } catch (error) {
      // console.error("Error during transaction:", error);
      handleError(
        "An error occurred during the transaction. Please try again. \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
      );
    }
  } else if (user.step === 14) {
    const numberGiven = incomingMessage;
    // console.log("The responded mpesa number ----->", numberGiven);
    if (numberGiven.length !== 10) {
      handleError(
        "You entered the wrong phone number format, please try again.\n1. Get a new Club Token\n2. Buy Club Tokens\n3. Buy Clubs Jerseys\n4. Buy Match Tickets\n5. Boost your Player\n5. Main Menu "
      );
    } else {
      mpesaNo = numberGiven;
      // console.log("The passed mpesa number ---->", mpesaNo);
      twiml.message(
        "If you wish to continue with your purchase text YES and wait for the mpesa prompt \nif not text No"
      );
      user.step = 15;
    }
  } else if (user.step === 15) {
    merchChoice = incomingMessage;

    if (merchChoice === "yes") {
      const purchaseJersey = await buyClubJersey(
        mpesaNo,
        jerseyPrice,
        userPBKey
      );

      if (purchaseJersey && purchaseJersey.amount) {
        sucessHandeling(
          `Your purchase has been successfully received and ${purchaseJersey.amount} XLM accredited to your account.\n\n To proceed with other options, input \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu`
        );
      } else if (purchaseJersey === 3004) {
        handleError(
          "An unsuccessful transaction due to mpesa failure.\n\n Please try again \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
        );
      } else if (purchaseJersey === 3005) {
        handleError(
          "An error occurred when parsing data. We are working to fix this error.\n\n Please try again \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
        );
      } else {
        handleError(
          "An error occured please start again.\n\n Please try again \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
        );
      }
    } else if (merchChoice === "no") {
      sucessHandeling(
        "Thank you for your response. \n\nWould you like to try other club options\n \n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
      );
    } else {
      twiml.message(
        "You entered the wrong choice. \n\nPlease try again\n1. Buy Club Tokens\n2. Buy Clubs Jerseys\n3. Buy Match Tickets\n4. Boost your Player\n5. Main Menu"
      );
      user.step = 4;
    }

    user.step = 4;
  } else if (user.step === 18) {
    ticketChoice = incomingMessage.trim(); // Remove any whitespace or newlines from input.

    if (ticketChoice) {
      // console.log("The choice is ----->", ticketChoice);

      twiml.message("Enter your mpesa number to procced");
      user.step = 19;
    } else {
      handleError(
        "No ticket number was passed.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
      );
    }
  } else if (user.step === 19) {
    mpesaNo = incomingMessage;

    // console.log(
    //   "The ticket data that is updated is as ----->",
    //   JSON.stringify(ticketData, null, 2)
    // );

    if (ticketChoice && mpesaNo) {
      const ticketNumber = parseInt(ticketChoice, 10); // Convert user input to a number
      if (isNaN(ticketNumber)) {
        handleError("Invalid ticket number. Please enter a valid number.");
        return;
      }

      // Find the ticket with the matching 'Ticket Number'
      const ticket = ticketData.find(
        (t) => t["Ticket Number"] === ticketNumber
      );

      if (ticket) {
        // console.log("Found ticket:", ticket);
        // console.log("The date:", ticket.Date, "The venue:", ticket.Venue);

        const ticketAmt = "500"; // Adjust amount as needed
        const obtTicket = await buyTickets(
          mpesaNo,
          ticketAmt,
          userPBKey
        );

        if (obtTicket && obtTicket.amount) {
          sucessHandeling(
            `You have successfully purchased a ticket for:\nDate: ${ticket.Date}\nTeam: ${ticket.Team}\nVenue: ${ticket.Venue}\n\n${obtTicket.amount} XLM accredited to your account.\n\nTo proceed with other options, input:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu`
          );
        } else if (obtTicket === 3004) {
          handleError(
            "Unsuccessful transaction due to Mpesa failure.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
          );
        } else if (obtTicket === 3005) {
          handleError(
            "An error occurred when parsing data. We are working to fix this error.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
          );
        } else {
          handleError(
            "An error occurred. Please start again.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
          );
        }
      } else {
        handleError(
          "Ticket number not found.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
        );
      }
    } else {
      handleError(
        "Ticket number was not passed.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
      );
    }
  } else if (user.step === 20) {
    player = incomingMessage;
    if (player !== null) {
      twiml.message("Enter the amount you wish to sponser them with");
      user.step = 21;
    } else {
      handleError(
        "The player doesnt exist or you entered the wrong name.\n\nPlease try again:\n1. Buy Club Tokens\n2. Buy Club Jerseys\n3. Buy Match Tickets\n4. Boost Your Player\n5. Main Menu"
      );
    }
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});



module.exports = router;
