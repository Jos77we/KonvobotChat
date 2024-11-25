const fs = require("fs");
const path = require("path");
const axios = require('axios')
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

const buyClubJersey = async (mpesaNo, jerseyPrice, userPBKey) => {

    try {

      const mpesaPhoneNo = mpesaNo.replace(/^0/, '254');
      const amountOwn = parseInt(jerseyPrice, 10)
    
          if(mpesaPhoneNo && jerseyPrice) {
            try {
    
              const url = `https://auth-backend-1-cluk.onrender.com/api/mpesa/stk`
              const load = {
                phoneNumber: mpesaPhoneNo,
                amount: amountOwn
              }
    
              // console.log('The url is as;', url)
    
              const tres = await axios.post(url, load, {
                headers: {
                  'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
                  'Content-Type': 'application/json'
                }
              })
              
              const messageSuccess = tres.data.CheckoutRequestID
    
              if(messageSuccess) {

                let givenTokens = null;
                let memoText = null;

                const jerseyAmount = String(jerseyPrice);
                const jerseyAmt = parseInt(jerseyAmount);
            
                const lumens = 0.00625;
            
                const jerseyTkns = jerseyAmt * lumens;
            
                // console.log("The new calculated amount is ----->", jerseyTkns);
            
                const roundJerseyAmount = Math.abs(jerseyTkns).toFixed(4);
                // console.log("The rounded amount is ---->", roundJerseyAmount);
            
                const roundJerseyTokens = parseFloat(roundJerseyAmount).toString();
            
                // console.log("The string amount is as ------>", roundJerseyTokens);
            
                givenTokens = roundJerseyTokens;
                memoText = 'Purchase for a jersey'

                try {
                  const assetCodes = "XLM";

                  const data2 = await readFileAsync("./assetCodes.json");
                  const codes = JSON.parse(data2);
      
                  const bulkPublicKey = codes.find((u) => u.assetCode === assetCodes);
      
                  if (!bulkPublicKey) {
                    console.error(
                      `Token asset code '${assetCodes}' not found in the file details.`
                    );
                    return false; // Return false if user is not found
                  }
                  const usersKey = userPBKey;
                  const tokenAccount = bulkPublicKey.secretKey;
      
                  // console.log("The keys are as----->", usersKey, 'The account seret key --->', tokenAccount);
      
                  if (usersKey) {
                    const senderKeypair = StellarSdk.Keypair.fromSecret(tokenAccount);
                    const senderPublicKey = senderKeypair.publicKey();
      
                    try {
                      const senderAccount = await server.loadAccount(senderPublicKey);
      
                      const transaction = new StellarSdk.TransactionBuilder(
                        senderAccount,
                        {
                          fee: StellarSdk.BASE_FEE,
                          networkPassphrase: StellarSdk.Networks.TESTNET,
                        }
                      )
                        .addOperation(
                          StellarSdk.Operation.payment({
                            destination: usersKey,
                            asset: StellarSdk.Asset.native(), // Native asset is XLM,
                            amount: givenTokens, // Amount in lumens
                          })
                        )
                        .addMemo(StellarSdk.Memo.text(memoText))
                        .setTimeout(30)
                        .build();
      
                      transaction.sign(senderKeypair);
      
                      const transactionResult = await server.submitTransaction(
                        transaction
                      );
      
                      const filePath = path.join(
                        __dirname,
                        "transactionsDetails.json"
                      );
      
                      const dataTrans = {
                        SendersName: assetCodes,
                        RecepientsName: mpesaPhoneNo,
                        data: transactionResult,
                        memo: memoText
                      };
      
                      let fileData;
                      try {
                        fileData = await readFileAsync(filePath);
                      } catch (err) {
                        fileData = "[]"; // File doesn't exist, initialize empty array
                      }
      
                      const jsonData = JSON.parse(fileData);
                      jsonData.push(dataTrans);
      
                      await writeFileAsync(
                        filePath,
                        JSON.stringify(jsonData, null, 2)
                      );
      
                      // console.log('The overall answer is ----->',transactionResult.successful)

                      if(transactionResult.successful){
                        return {amount: givenTokens}; // Return transaction result
                      }

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
               
              } else{
                console.log('Mpesa request was denied')
                return 3004;
              }
            } catch (error) {
              console.error('Error fetching data from the mpesa API:', error);
              return 3005;
              
            }
          }
    
    } catch (error) {
        console.error('Error fetching data from API:', error);
    }
}

module.exports = buyClubJersey