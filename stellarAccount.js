const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
var StellarSdk = require('@stellar/stellar-sdk');
StellarSdk.Networks.TESTNET


const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org",
);
// StellarSdk.Networks.TESTNET = 'Test SDF Network ; September 2015';

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

router.post("/create-account", async (req, res) => {

  const user = req.body.user
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
    console.log(error)
    res
      .status(500)
      .json({ error: "An error occurred while creating the account." });
  }
});

router.post("/fund-account", async (req, res) => {

  const {user, publicKey} = req.body;


  try {
    
    const { default: fetch } = await import('node-fetch');

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
          balances
        }

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
    console.log(error)
    res
      .status(500)
      .json({ error: "An error occurred while creating the account." });
  }
});

router.post("/transact-funds", async (req, res) => {

  //senders key is the senders secret key and Reciever Key is the receivers public key

  const {senderKey, recieverKey} = req.body

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
  .addOperation(StellarSdk.Operation.payment({
    destination: recipientPublicKey,
    asset: StellarSdk.Asset.native(), // The asset to send (native asset is XLM)
    amount: '25', // Amount to send in lumens
  }))
  .setTimeout(30) // Transaction timeout
  .build();

 
  transaction.sign(senderKeypair);

  const transactionResult = await server.submitTransaction(transaction);

  console.log(transactionResult.successful)
  res.json({message: 'Transaction successful!', transactionResult})

  
} catch (e) {
  console.error('Transaction failed:', e);
}
})

router.post("/transact-history", async (req, res) => {
 
  const publicKey = req.body.publicKey

  if (!publicKey) {
    return res.status(400).json({ error: 'Public key is required' });
  }

  try {
    const transactions = await server.transactions()
      .forAccount(publicKey)
      .order('desc')
      .limit(10)
      .call();

    res.json({
      message: 'Transaction history retrieved successfully',
      transactions: transactions.records.map(tx => ({
        id: tx.id,
        createdAt: tx.created_at,
        operationCount: tx.operation_count,
        memo: tx.memo,
      }))
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Unable to fetch transaction history' });
  }
})


router.post("/account-balance", async (req, res) => {

  try {

    const accountPublicKey = req.body.accountPublicKey

  const account = await server.loadAccount(accountPublicKey);
  const balances = account.balances.map((balance) => ({
      asset_type: balance.asset_type,
      balance: balance.balance,
  }));

  res.json(balances)
    
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch balances' });
  }


})

router.post('/find-account', async (req, res) => {

  const {username, recipientName} = req.body
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
            recipientPublicKey: recipientKey
          }

          res.json(data)
        }
    })
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch data' });
  }
})
module.exports = router;
