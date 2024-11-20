const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
var StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


let storedUser = null;

const writeFileAsync = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Function to store user details
const storeUserDetails = (phoneNumber, publicKey) => {
  storedUser = { phoneNumber, publicKey };

  // console.log('The stored values are ---->', storedUser)
};

const getStoredUserDetails = () => storedUser;

router.post("/create-user", async (req, res) => {
  const { phoneNumber, publicKey } = req.body;
  // console.log("Received phone number:", phoneNumber, "and public key:", publicKey);

  try {
    
    const accountResult = await createAccount(phoneNumber, publicKey);

    const filePath = path.join(__dirname, "newCreatedUsers.json");

        const dataTrans = {
          phoneNo: phoneNumber,
          publicKey: publicKey
        };

        let fileData;
        try {
          fileData = await readFileAsync(filePath);
        } catch (err) {
          fileData = "[]"; // File doesn't exist, initialize empty array
        }

        const jsonData = JSON.parse(fileData);
        jsonData.push(dataTrans);

        await writeFileAsync(filePath, JSON.stringify(jsonData, null, 2));


    res.json(accountResult);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const createAccount = async (phoneNumber, publicKey) => {
  try {
    const { default: fetch } = await import("node-fetch");

    if(!publicKey){
      throw new Error("Public key is required and cannot be undefined.");
    }
    const friendbotUrl = `https://friendbot.stellar.org/?addr=${publicKey}`;
    await fetch(friendbotUrl);

  
    // Load the account to get balances
    const account = await server.loadAccount(publicKey);
    const balances = account.balances.map((balance) => ({
      asset_type: balance.asset_type,
      balance: balance.balance,
    }));

    // console.log("Account created successfully with balances:", balances);

    if(balances.length > 0){
  
    const result = { phoneNumber, publicKey };
    // console.log("Storing and returning the result from createAccount:", result);

    // Store the details for later retrieval
    storeUserDetails(phoneNumber, publicKey);
  } else{
    console.error("No balances found. Account funding may have failed.");
      return null;
  }
 
  } catch (error) {
    console.error("Error during account creation:", error);
    throw new Error("An error occurred while creating the account.");  
  }
};

module.exports = {router, getStoredUserDetails };
