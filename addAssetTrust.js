const fs = require("fs");
const path = require("path");
const StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

const addAssetTrust = async (reqChangeAsset, userName) => {
  const assetCode1 = String(reqChangeAsset).toUpperCase();
  const nameUser = String(userName);

  console.log('The asset is', assetCode1, 'the user for the asset is', nameUser)
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
        const issuersKey = user.publicKey;

        // console.log('The issuers asset', issuerAsset, 'and the key is', issuersKey)

        try {
          fs.readFile("./usersDetails.json", "utf8", async (err, data) => {
            if (err) {
              console.error("Error reading the file:", err);
              return;
            }
            const users = JSON.parse(data);

            const user2 = users.find((u) => u.user === nameUser);

            const secretKey1 = user2.secretKey

            // console.log('the users secret key is', secretKey1)

            if (user2) {
              try {
                const secretKey = user2.secretKey;

                // console.log('the users secret key is', secretKey)
  
                const srtAsset = new StellarSdk.Asset(issuerAsset, issuersKey);
  
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
                      amount: '9000'
                    })
                  )
                  .setTimeout(30)
                  .build();
  
                // Sign the transaction with your account's secret key
                transaction.sign(keypair);
  
                const result = await server.submitTransaction(transaction);
                return result.successful
  
              } catch (error) {
                console.log('THis is the error', error)
              }
            }
          });
        } catch (error) {
          console.log("Error fetching users secret key");
        }
      }
    });
  }
};

module.exports = addAssetTrust;
