const fs = require("fs");
const path = require("path");
var StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

const readFileAsync = (filePath, encoding = "utf8") => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, encoding, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

const writeFileAsync = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const transactFunds = async (userName, recipientName, amountTransct) => {
  const usName = String(userName);
  const rcName = String(recipientName);

  try {
    const data = await readFileAsync("./usersDetails.json");
    const users = JSON.parse(data);

    const user = users.find((u) => u.user === usName);
    const recipient = users.find((u) => u.user === rcName);

    if (!user) {
      console.error(`User '${usName}' not found in the user details.`);
      return false; // Return false if user is not found
    }

    if (!recipient) {
      console.error(`Recipient '${rcName}' not found in the user details.`);
      return false; // Return false if recipient is not found
    }

    const usersKey = user.secretKey;
    const recipientKey = recipient.publicKey;

    if (usersKey && recipientKey) {
      const senderKeypair = StellarSdk.Keypair.fromSecret(usersKey);
      const senderPublicKey = senderKeypair.publicKey();

      try {
        const senderAccount = await server.loadAccount(senderPublicKey);

        const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: recipientKey,
              asset: StellarSdk.Asset.native(), // Native asset is XLM
              amount: amountTransct, // Amount in lumens
            })
          )
          .setTimeout(30)
          .build();

        transaction.sign(senderKeypair);

        const transactionResult = await server.submitTransaction(transaction);

        const filePath = path.join(__dirname, "transactionsDetails.json");

        const dataTrans = {
          SendersName: userName,
          RecepientsName: recipientName,
          data: transactionResult,
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

        return transactionResult.successful; // Return transaction result
      } catch (e) {
        console.error("Transaction failed:", e);
        return false;
      }
    } else {
      console.error("User or recipient keys not found.");
      return false;
    }
  } catch (err) {
    console.error("Error reading or processing file:", err);
    return false;
  }
};

module.exports = transactFunds;
