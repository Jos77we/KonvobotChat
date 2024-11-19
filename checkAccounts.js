const StellarSdk = require("@stellar/stellar-sdk");
StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");

const checkAccount = async (userPBKey) => {
  
  try {
    // Use fs.readFile with async/await
   
    if (userPBKey) {

      try {
        const account = await server.loadAccount(userPBKey);
        const balances = account.balances;

        const resultList = balances.map((balance) => ({
          balance: balance.balance,
          asset_type: balance.asset_type,
          asset_code: balance.asset_code || 'XLM',
        }));

        console.log('The result is:', resultList);
        return resultList;
      } catch (error) {
        console.error("Error retrieving assets:", error);
        throw new Error("Unable to fetch balances");
      }
    } else {
      console.log("User not found");
      return null;  // Return null if user not found
    }
  } catch (err) {
    console.error("Error reading the file:", err);
    throw err;  // Propagate error to caller
  }
};

module.exports = checkAccount;
