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



const transactFunds = async (
  userPBKey,
  recipientPhoneNo,
  amountTransct,
  assetTransct
) => {

let newBalance = null;

// console.log('The users public key --->', userPBKey, 'the users phone number is ----->', recipientPhoneNo, 'the amount to transact------>', amountTransct, 'the asset is ---->',assetTransct)

  const account = await server.loadAccount(userPBKey);
  const balances = account.balances.map((balance) => ({
    asset_code: balance.asset_code || "XLM",
    balance: balance.balance,
  }));

  // console.log('The users account balances is', balances)

  const assetValue = assetTransct.toUpperCase()
  const specificAssetCode = assetValue;
  const specificBalance = balances.find(
    (balance) => balance.asset_code === specificAssetCode
  );

  const balanceValue = specificBalance ? specificBalance.balance : null;

  // console.log("The value of the balance is --->", balanceValue);

  const givenAmt = parseInt(balanceValue);

  if (givenAmt > amountTransct) {
    const data = await readFileAsync("./newCreatedUsers.json");
    const users = JSON.parse(data);

    const user = users.find((u) => u.phoneNo === recipientPhoneNo);

    if (!user) {
      return 2009;
    }
    const usersKey = user.publicKey;
    // console.log('The obtained and needed public key is ----->', usersKey)

    if (usersKey) {
      const senderKeypair = StellarSdk.Keypair.fromSecret(userPBKey);
      const senderPublicKey = senderKeypair.publicKey();

      try {
        const senderAccount = await server.loadAccount(senderPublicKey);

        const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: usersKey,
              asset: StellarSdk.Asset.native(), // Native asset is XLM
              amount: amountTransct, // Amount in lumens
            })
          )
          .setTimeout(30)
          .build();

        transaction.sign(senderKeypair);

        const transactionResult = await server.submitTransaction(transaction);

        if(transactionResult.successful){
          const account = await server.loadAccount(userPBKey);
          const balances = account.balances.map((balance) => ({
            asset_code: balance.asset_code || "XLM",
            balance: balance.balance,
          }));
        
          // console.log('The updated balance is as', balances)
          const assetValue2 = assetTransct.toUpperCase()
          const specificAssetCode2 = assetValue2;
          const specificBalance2 = balances.find(
            (balance) => balance.asset_code === specificAssetCode2
          );
        
          const balanceValue2 = specificBalance2 ? specificBalance2.balance : null;
          
          newBalance = balanceValue2

        }
        return {
          successful: transaction.successful,
          newBalance: newBalance,
        };
      } catch (e) {
        console.error("Transaction failed:", e);
        return false;
      }
    } else {
      console.error("User or recipient keys not found.");
      return false;
    }
  } else{
    console.error("Balance is less than the transacting amount.");
      return 2111;
  }
};

module.exports = transactFunds;