const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
var StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);
// StellarSdk.Networks.TESTNET = 'Test SDF Network ; September 2015';

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

router.post("/create-account", async (req, res) => {
  const user = req.body.user;
  try {
    const pair = StellarSdk.Keypair.random();

    const secretKey = pair.secret();
    const accPublicKey = pair.publicKey();

    const currentTime = new Date().toISOString();

    const filePath = path.join(__dirname, "usersDetails.json");

    const dataAcc = {
      user: user,
      secretKey: secretKey,
      publicKey: accPublicKey,
      timestamp: currentTime,
    };

    fs.readFile(filePath, "utf8", (err, data) => {
      let jsonData = [];
      if (err && err.code === "ENOENT") {
        jsonData = [];
      } else if (!err) {
        try {
          jsonData = JSON.parse(data);
        } catch (parseError) {
          jsonData = [];
        }
      }

      if (Array.isArray(jsonData)) {
        jsonData.push(dataAcc);

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to save keys to file." });
          }

          res.json(dataAcc);
        });
      } else {
        res.status(500).json({ error: "Unexpected file format." });
      }
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the account." });
  }
});

router.post("/fund-account", async (req, res) => {
  const { user, publicKey } = req.body;

  try {
    const { default: fetch } = await import("node-fetch");

    // const fetch = (...args) =>
    //     import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const friendbotUrl = `https://friendbot.stellar.org/?addr=${publicKey}`;
    const response = await fetch(friendbotUrl);
    const data = await response.json();

    const account = await server.loadAccount(publicKey);
    const balances = account.balances.map((balance) => ({
      asset_type: balance.asset_type,
      balance: balance.balance,
    }));

    const filePath = path.join(__dirname, "accountDetails.json");

    const accountData = {
      userName: user,
      accountKey: publicKey,
      data,
      balances,
    };

    fs.readFile(filePath, "utf8", (err, data) => {
      let jsonData = [];
      if (err && err.code === "ENOENT") {
        jsonData = [];
      } else if (!err) {
        try {
          jsonData = JSON.parse(data);
        } catch (parseError) {
          jsonData = [];
        }
      }

      if (Array.isArray(jsonData)) {
        jsonData.push(accountData);

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to save keys to file." });
          }

          res.json(accountData);
        });
      } else {
        res.status(500).json({ error: "Unexpected file format." });
      }
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the account." });
  }
});

router.post("/transact-funds", async (req, res) => {
  //senders key is the senders secret key and Reciever Key is the receivers public key

  const { senderKey, recieverKey } = req.body;

  const senderSecret = senderKey;
  const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
  const senderPublicKey = senderKeypair.publicKey();

  const recipientPublicKey = recieverKey;

  try {
    const senderAccount = await server.loadAccount(senderPublicKey);

    const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: StellarSdk.Asset.native(), // The asset to send (native asset is XLM)
          amount: "25", // Amount to send in lumens
        })
      )
      .setTimeout(30) // Transaction timeout
      .build();

    transaction.sign(senderKeypair);

    const transactionResult = await server.submitTransaction(transaction);

    console.log(transactionResult.successful);
    res.json({ message: "Transaction successful!", transactionResult });
  } catch (e) {
    console.error("Transaction failed:", e);
  }
});

router.post("/transact-history", async (req, res) => {
  const publicKey = req.body.publicKey;

  if (!publicKey) {
    return res.status(400).json({ error: "Public key is required" });
  }

  try {
    const transactions = await server
      .transactions()
      .forAccount(publicKey)
      .order("desc")
      .limit(10)
      .call();

    res.json({
      message: "Transaction history retrieved successfully",
      transactions: transactions.records.map((tx) => ({
        id: tx.id,
        createdAt: tx.created_at,
        operationCount: tx.operation_count,
        memo: tx.memo,
      })),
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({ error: "Unable to fetch transaction history" });
  }
});

router.post("/account-balance", async (req, res) => {
  try {
    const accountPublicKey = req.body.accountPublicKey;

    const account = await server.loadAccount(accountPublicKey);
    const balances = account.balances.map((balance) => ({
      asset_code: balance.asset_code || "XLM",
      balance: balance.balance,
    }));

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch balances" });
  }
});

router.post("/find-account", async (req, res) => {
  const { username, recipientName } = req.body;
  try {
    fs.readFile("./usersDetails.json", "utf8", async (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        return;
      }
      const users = JSON.parse(data);

      const user = users.find((u) => u.user === username);
      const recipient = users.find((u) => u.user === recipientName);

      if (user && recipient) {
        const usersKey = user.secretKey;
        const recipientKey = recipient.publicKey;

        console.log(
          "Secret Key:",
          user.secretKey,
          "Public Key:",
          recipient.publicKey
        );

        const data = {
          usersSecretKey: usersKey,
          recipientPublicKey: recipientKey,
        };

        res.json(data);
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch data" });
  }
});

router.post("/check-balances", async (req, res) => {
  //check account balance and asset type
  const accKey = req.body.publicKey;

  try {
    const account = await server.loadAccount(accKey);
    const balances = account.balances;

    const resultList = balances.map((balance) => {
      return {
        balance: balance.balance,
        asset_type: balance.asset_type,
        asset_code: balance.asset_code || "XLM",
        asset_issuer: balance.asset_issuer,
      };
    });

    res.json(resultList);
  } catch (error) {
    console.error("Error retrieving assets:", error);
    res.status(500).json({ error: "Unable to fetch balances" });
  }
});

router.post("/trustline", async (req, res) => {
  //establish a trustline using change_trust

  const { secretKey, assetCode, issuerPublicKey } = req.body;

  try {
    // const assetIssuerKey = 'GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B'
    const srtAsset = new StellarSdk.Asset(assetCode, issuerPublicKey);

    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    const account = await server.loadAccount(publicKey);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: srtAsset,
          limit: "10000",
        })
      )
      .setTimeout(30)
      .build();

    // Sign the transaction with your account's secret key
    transaction.sign(keypair);

    const result = await server.submitTransaction(transaction);

    res.json(result);
  } catch (error) {
    console.error("Error retrieving assets:", error);
    res.status(500).json({ error: "Unable to create a trustline" });
  }
});

router.post("/swap-usdc", async (req, res) => {
  // const { secretKey, destinationPublicKey, destAmount } = req.body;

  // // Validate request body
  // if (!secretKey || !destinationPublicKey || !destAmount) {
  //   return res.status(400).send('Missing required fields: secretKey, destinationPublicKey, destAmount');
  // }

  // try {
  //   // Load source account from the secret key
  //   const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
  //   const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

  //   // Set up the USDC asset with the correct asset code
  //   const usdcAsset = new StellarSdk.Asset('USDCAllow', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  //   // Check if the account has a trustline for USDCAllow
  //   const hasTrustline = sourceAccount.balances.some(balance => balance.asset_code === 'USDCAllow');
  //   if (!hasTrustline) {
  //     return res.status(400).send('You need to add a trustline for USDCAllow.');
  //   }

  //   // Build the transaction to swap XLM for USDCAllow
  //   const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
  //     fee: StellarSdk.BASE_FEE,
  //     networkPassphrase: StellarSdk.Networks.TESTNET,
  //   })
  //     .addOperation(StellarSdk.Operation.pathPaymentStrictReceive({
  //       sendAsset: StellarSdk.Asset.native(), // XLM as native asset
  //       sendMax: '10000',  // Maximum amount of XLM to send
  //       destination: destinationPublicKey,
  //       destAsset: usdcAsset,
  //       destAmount: destAmount.toString(),  // Amount of USDCAllow to receive
  //       path: [],  // Empty path for a direct exchange
  //     }))
  //     .setTimeout(30)
  //     .build();

  //   // Sign the transaction
  //   transaction.sign(sourceKeypair);

  //   // Submit the transaction to the network
  //   const transactionResult = await server.submitTransaction(transaction);
  //   res.status(200).json({ success: true, transactionResult });
  // } catch (error) {
  //   console.error('Transaction failed:', error);
  //   res.status(500).send('Transaction failed: ' + error.message);
  // }

  const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"; // Replace with the USDC issuer public key
  const USDC = new StellarSdk.Asset("USDCAllow", usdcIssuer);
  const { secretKey, publicKey, sendAmount, destMin } = req.body;

  if (!secretKey || !publicKey || !sendAmount || !destMin) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);

    const sourceAccount = await server.loadAccount(publicKey);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: StellarSdk.Asset.native(), // XLM
          sendAmount: sendAmount, // Amount of XLM to swap
          destination: publicKey, // Destination
          destAsset: USDC, // USDC asset to receive
          destMin: destMin, // Minimum amount of USDC to receive
          path: [], //direct swap
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);

    // Submit transaction
    const result = await server.submitTransaction(transaction);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/sponsor-account", async (req, res) => {
  const { sponsorSecKey, sponsoredPubKey, sponsoredSecKey } = req.body;

  // Validate input
  if (!sponsorSecKey || !sponsoredPubKey || !sponsoredSecKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecKey);
    const sponsorPublicKey = sponsorKeypair.publicKey();
    const sponsoredKeypair = StellarSdk.Keypair.fromSecret(sponsoredSecKey);
    const sponsoredPublicKey = sponsoredKeypair.publicKey();

    // Ensure the sponsor account exists
    const sponsorAccount = await server.loadAccount(sponsorPublicKey);

    // Ensure the sponsored account exists
    let sponsoredAccount;
    try {
      sponsoredAccount = await server.loadAccount(sponsoredPublicKey);
    } catch (e) {
      return res
        .status(404)
        .json({ error: "Sponsored account does not exist." });
    }

    const usdcAsset = new StellarSdk.Asset(
      "USDC",
      "GCJJ5FY3LR6ALT2527ZJRNCF2EXBGVKYXQ63MXNPEYHLIYSA5EO7YX25" // Issuer's public key
    );

    // Begin transaction for sponsoring the account
    const transaction = new StellarSdk.TransactionBuilder(sponsorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.beginSponsoringFutureReserves({
          sponsoredId: sponsoredPublicKey,
        })
      )
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: usdcAsset,
          limit: "1000",
          source: sponsoredPublicKey,
        })
      )
      .addOperation(
        StellarSdk.Operation.payment({
          source: sponsorPublicKey, // Sponsoring account sends payment
          destination: sponsoredPublicKey, // Payment to sponsored account
          asset: usdcAsset, // XLM asset
          amount: "0.05", // Amount of XLM to send
        })
      )
      .addOperation(
        StellarSdk.Operation.endSponsoringFutureReserves({
          source: sponsoredPublicKey,
        })
      )
      .setTimeout(30)
      .build();

    // Sign the transaction with both the sponsor's and the sponsored account's keypairs
    transaction.sign(sponsorKeypair); // Sponsor signs the transaction
    transaction.sign(sponsoredKeypair); // Sponsored account signs the transaction

    console.log("This is the transaction being sent", transaction);

    // Submit the transaction
    const result = await server.submitTransaction(transaction);

    // Return the transaction result as a response
    res.json(result);
    console.log("Sponsorship transaction result:", result);
  } catch (error) {
    console.error(
      "Error during sponsorship:",
      error.response?.data?.extras?.result_codes || error.message
    );
    res
      .status(500)
      .json({ error: "Something went wrong during the sponsorship process." });
  }
});

router.get("/asset", async (req, res) => {
  const assetCode1 = "SRT";

  if (!assetCode1 === "SRT" || !assetCode1 === "USDC") {
    return "Error selecting the required asset";
  } else {
    fs.readFile("./assetCodes.json", "utf8", async (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        return;
      }
      const users = JSON.parse(data);

      const user = users.find((u) => u.assetCode === assetCode1);

      if (user) {
        const issuerAsset = user.assetCode;
        const usersKey = user.publicKey;

        console.log("Public Key:", usersKey);

        const data = {
          issuerAssetCode: issuerAsset,
          usersPublicKey: usersKey,
        };

        res.json(data);
      }
    });
  }
});

router.get("/matches", async (req, res) => {
  try {
    const response = await axios.get(
      "https://auth-backend-1-cluk.onrender.com/api/tickets",
      {
        headers: {
          "x-api-key":
            "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
          "Content-Type": "application/json",
        },
      }
    );

    const matches = response.data;
    const formattedOutput = formatMatchDetails(matches);

    res.status(200).send(formattedOutput);
  } catch (error) {
    console.error("Error fetching match data:", error);
    res.status(500).send("An error occurred while fetching match data");
  }
});

router.post("/mpesa", async (req, res) => {
  const { team, phoneNo } = req.body;

  try {
    const resp = await axios.get(
      "https://auth-backend-1-cluk.onrender.com/api/teams/teams",
      {
        headers: {
          "x-api-key":
            "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
          "Content-Type": "application/json",
        },
      }
    );

    const teamResult = resp.data;
    console.log("The resulting is as:", teamResult);

    const teamByName = team;
    console.log("The team name is", teamByName);
    const foundTeam = resp.data.find(
      (team) => team.name.toLowerCase() === teamByName.toLowerCase()
    );

    console.log("The found team is known as", foundTeam);
    const teamId = foundTeam._id;

    console.log("The team id obtained is as", teamId);

    if (foundTeam) {
      try {
        const url = `https://auth-backend-1-cluk.onrender.com/api/mpesa/stk/${teamId}`;
        const load = {
          phoneNumber: phoneNo,
        };

        console.log("The url is as;", url);

        const tres = await axios.post(url, load, {
          headers: {
            "x-api-key":
              "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
            "Content-Type": "application/json",
          },
        });

        const messageSuccess = tres.data.CheckoutRequestID;

        if (messageSuccess) {
          res.json(tres.data);
        } else {
          res.status(500).send("An error occurred while fetching match data");
        }
      } catch (error) {
        console.error("Error fetching data from the mpesa API:", error);
        res.status(500).send("An error occurred while fetching match data");
      }
    }
  } catch (error) {
    console.error("Error fetching data from API:", error);
  }
});

router.get("/teams", async (req, res) => {
  try {
    const resp = await axios.get(
      "https://auth-backend-1-cluk.onrender.com/api/teams/teams",
      {
        headers: {
          "x-api-key":
            "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
          "Content-Type": "application/json",
        },
      }
    );

    const teamNames = resp.data.map((team) => team.name);
    res.json(teamNames);
  } catch (error) {
    console.error("Error fetching data from API:", error);
    res.status(500).send("An error occurred while fetching match data");
  }
});

// function formatMatchDetails(matches) {
//   // Sort matches by date
//   matches.sort((a, b) => new Date(a.date) - new Date(b.date));

//   // Format each match
//   return matches.map(match => {
//     const date = new Date(match.date).toISOString().split('T')[0]; // Extract date part
//     const homeTeam = match.homeTeam.name;
//     const awayTeam = match.awayTeam.name;
//     const time = match.time;
//     const venue = match.venue;
//     const tickets = match.ticketTypes.map(ticket => `${ticket.type}: ${ticket.price}`).join(', ');

//     return `Date: ${date}\nTeam: ${homeTeam} vs ${awayTeam}\nTime: ${time}\nVenue: ${venue}\nTicket: ${tickets}\n`;
//   }).join('\n');
// }

function formatMatchDetails(matches) {
  matches.sort((a, b) => new Date(a.date) - new Date(b.date));

  let matchTicketNumber = 1001;

  return matches
    .map((match) => {
      const date = new Date(match.date).toISOString().split("T")[0];
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;
      const time = match.time;
      const venue = match.venue;

      let vipTicketNumber = 1001;
      let regularTicketNumber = 1601;

      const tickets = match.ticketTypes
        .map((ticket) => {
          let output;
          if (ticket.type === "VIP") {
            output = `Ticket: VIP: ${ticket.price}`;
            vipTicketNumber += ticket.quantity;
          } else if (ticket.type === "Regular") {
            output = `Ticket: Regular: ${ticket.price}`;
            regularTicketNumber += ticket.quantity;
          }
          return output;
        })
        .join(", ");

      const result = `Ticket Number: ${matchTicketNumber}\nDate: ${date}\nTeam: ${homeTeam} vs ${awayTeam}\nTime: ${time}\nVenue: ${venue}\n${tickets}\n`;

      matchTicketNumber += 1;
      return result;
    })
    .join("\n");
}

router.post("/buy-jersey", async (req, res) => {
  const { team } = req.body; // Destructure the team name from the request body

  try {
    const jersResp = await axios.get(
      "https://auth-backend-1-cluk.onrender.com/api/teams/teams",
      {
        headers: {
          "x-api-key":
            "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
          "Content-Type": "application/json",
        },
      }
    );

    const data = jersResp.data;

    if (typeof team === "string") {
      const item = data.find(
        (entry) => entry.name.toLowerCase() === team.toLowerCase()
      );

      if (item) {
        const teamId = item._id;
        console.log(teamId);

        try {
          const retResp = await axios.get(
            "https://auth-backend-1-cluk.onrender.com/api/jerseys",
            {
              headers: {
                "x-api-key":
                  "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
                "Content-Type": "application/json",
              },
            }
          );

          const resData = retResp.data;

          console.log(resData);
          const jerseyFull = resData.find(
            (great) => great.teamName.toLowerCase() === teamId.toLowerCase()
          );

          if (jerseyFull) {
            res.json({ type: jerseyFull.type, price: jerseyFull.price });
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          res.status(500).json({ error: "Unable to fetch data" });
        }
      } else {
        res.status(404).json({ message: "Team name not found" });
      }
    } else {
      res.status(400).json({ message: "Invalid team name" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Unable to fetch data" });
  }
});

router.post("/award-tokens", async (req, res) => {
  const { senderKey, recieverKey, typeofPayment, amount } = req.body;
  let memoText = "";
  let givenTokens = null;

  if (typeofPayment === "buyTokens") {
    const tallyAmount = String(amount);
    const tokenAmt = parseInt(tallyAmount);

    const lumens = 0.0865;

    const awardedTokens = tokenAmt * lumens;

    console.log("The new calculated amount is ----->", awardedTokens);

    const roundedAmount = Math.abs(awardedTokens).toFixed(4);
    console.log("The rounded amount is ---->", roundedAmount);

    const roundedTokens = parseFloat(roundedAmount).toString();

    console.log("The string amount is as ------>", roundedTokens);

    givenTokens = roundedTokens;
    memoText = "Tokens for purchasing tokens";
  } else if (typeofPayment === "buyTickets") {
    const ticketAmount = String(amount);
    const ticAmt = parseInt(ticketAmount);

    const lumens = 0.1025;

    const ticketToken = ticAmt * lumens;

    console.log("The new calculated amount is ----->", ticketToken);

    const roundAmount = Math.abs(ticketToken).toFixed(4);
    console.log("The rounded amount is ---->", roundAmount);

    const roundTokens = parseFloat(roundAmount).toString();

    console.log("The string amount is as ------>", roundTokens);

    givenTokens = roundTokens;
    memoText = "Tokens for buying a ticket";
  } else {
    console.log("The correct type of payment was not issued");
  }

  const senderSecret = senderKey;
  const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
  const senderPublicKey = senderKeypair.publicKey();

  const recipientPublicKey = recieverKey;

  try {
    const senderAccount = await server.loadAccount(senderPublicKey);

    const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: StellarSdk.Asset.native(), // The asset to send (native asset is XLM)
          amount: givenTokens, // Amount to send in lumens
        })
      )
      .addMemo(StellarSdk.Memo.text(memoText))
      .setTimeout(30) // Transaction timeout
      .build();

    transaction.sign(senderKeypair);

    const transactionResult = await server.submitTransaction(transaction);

    console.log(transactionResult.successful);

    if (transactionResult.successful === true) {
      try {
        const account = await server.loadAccount(recipientPublicKey);
        const balances = account.balances;

        const asset = "XLM";
        const resultList = balances
          .filter(
            (balance) =>
              balance.asset_code === asset ||
              (asset === "XLM" && !balance.asset_code)
          )
          .map((balance) => ({
            balance: balance.balance,
            asset_code: balance.asset_code || "XLM",
          }));

        if (resultList) {
          res.json({
            message: "Transaction successful!",
            memo: transactionResult.memo,
            transactID: transactionResult.id,
            awardedTokens: givenTokens,
            balances: resultList,
          });
        } else {
          console.error("Unable to acces the balances");
          res.status(500).json({ error: "Unable to fetch balances" });
        }
      } catch (error) {
        console.error("Error retrieving assets:", error);
        res.status(500).json({ error: "Unable to fetch balances" });
      }
    } else {
      console.error("The transaction was unsuccesful");
      res.status(500).json({ error: "Unable to fetch balances" });
    }
  } catch (e) {
    console.error("Transaction failed:", e);
  }
});

router.post("/players", async (req, res) => {
  try {
    const { chosenTeam } = req.body;

    const teamName = chosenTeam;

    const url = `https://auth-backend-1-cluk.onrender.com/api/players/team/${teamName}`;

    const allPlayers = await axios.get(url, {headers: {
      "x-api-key":
        "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
      "Content-Type": "application/json",
    },});

    const obtPlayers = allPlayers.data
    if (obtPlayers.length > 0) {
      res.json(allPlayers.data);
    } else {
      res.json({message: 'NO players obtained'})
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Unable to fetch data" });
  }
});

module.exports = router;