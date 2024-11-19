const fs = require("fs").promises;
const StellarSdk = require("@stellar/stellar-sdk");
const axios = require('axios')
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

const clubTokenSponsering = async (
  reqChangeAsset,
  userName,
  newAmountToken,
  userPBKey,
  team,
  newPhoneNo
) => {

let givenTokens = null
  const tallyAmount = String(newAmountToken);
    const tokenAmt = parseInt(tallyAmount);

    const usdc = 0.0077;

    const awardedTokens = tokenAmt * usdc;

    console.log("The new calculated amount is ----->", awardedTokens);

    const roundedAmount = Math.abs(awardedTokens).toFixed(4);
    console.log("The rounded amount is ---->", roundedAmount);

    const roundedTokens = parseFloat(roundedAmount).toString();

    console.log("The string amount is as ------>", roundedTokens);

    givenTokens = roundedTokens;
    memoText = 'Tokens for purchasing tokens'

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
          phoneNumber: newPhoneNo,
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
          const assetCode1 = String(reqChangeAsset).toUpperCase();


  console.log("The asset is ------>", assetCode1);


  try {
    if (assetCode1 !== "USDC") {
      return "Error selecting the required asset";
    } else {
      // Read assetCodes.json using promises
      const assetData = await fs.readFile("./assetCodes.json", "utf8");
      const users = JSON.parse(assetData);
      const user = users.find((u) => u.assetCode === assetCode1);

      if (user) {
        const issuerAsset = user.assetCode;
        const issuersKey = user.secretKey;

        console.log(
          "The issuers asset",
          issuerAsset,
          "and the key is",
          issuersKey
        );

        

        const sponsorSecKey = issuersKey;
     

        const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecKey);
        const sponsorPublicKey = sponsorKeypair.publicKey();
        const sponsoredPublicKey = userPBKey;

        // Ensure the sponsor account exists
        const sponsorAccount = await server.loadAccount(sponsorPublicKey);

        // Ensure the sponsored account exists
        let sponsoredAccount;
        try {
          sponsoredAccount = await server.loadAccount(sponsoredPublicKey);
        } catch (e) {
          return "Sponsored account does not exist.";
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
              asset: usdcAsset, // Asset
              amount: newAmountToken, // Amount of asset to send
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

        // Submit the transaction
        const result = await server.submitTransaction(transaction);

        console.log("Sponsorship transaction result:", result.successful);
        return result.successful;
      } else {
        return "Asset not found.";
      }
    }
  } catch (error) {
    console.error("Error during sponsorship:", error);
    return false;
  }
        } else {
          res.status(500).send("An error occurred while fetching match data");
        }
      } catch (error) {
        console.error("Error fetching data from the mpesa API:", error);
        res.status(500).send("An error occurred while fetching match data");
      }
    }
    

  
};

module.exports = clubTokenSponsering;
