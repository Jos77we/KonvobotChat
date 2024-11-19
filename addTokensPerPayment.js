const StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);


const awardTokens = async (typeofPayment, amount) => {
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
    memoText = 'Tokens for purchasing tokens'

  } else if(typeofPayment === "buyTickets"){

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
    memoText = 'Tokens for buying a ticket'

  } else if(typeofPayment === "buyJerseys"){

    const jerseyAmount = String(amount);
    const jerseyAmt = parseInt(jerseyAmount);

    const lumens = 0.0625;

    const jerseyTkns = jerseyAmt * lumens;

    console.log("The new calculated amount is ----->", jerseyTkns);

    const roundJerseyAmount = Math.abs(jerseyTkns).toFixed(4);
    console.log("The rounded amount is ---->", roundJerseyAmount);

    const roundJerseyTokens = parseFloat(roundJerseyAmount).toString();

    console.log("The string amount is as ------>", roundJerseyTokens);

    givenTokens = roundJerseyTokens;
    memoText = 'Tokens for buying a ticket'

  }else {
    console.log("The correct type of payment was not issued");
  }

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

        const asset = "XLM"
        const resultList = balances
        .filter((balance) => balance.asset_code === asset || (asset === "XLM" && !balance.asset_code))
        .map((balance) => ({
          balance: balance.balance,
          asset_code: balance.asset_code || "XLM",
        }));

        if (resultList) {
          return({
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
};

module.exports = awardTokens