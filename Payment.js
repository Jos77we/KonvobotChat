const axios = require("axios");
const { getToken } = require("./getToken.js");

const initPayment = async (recipientName, assetTransct, amountTransct, loginToken, secretKey) => {
  try {
    const retToken = String(loginToken);
    const recUsername = String(recipientName);

    // console.log(`the token is called: ${retToken} and the recipients name is ${recUsername}`)

    const getPublickey = await axios.get(
      "https://api.kipaji.app/api/v1/auth/user",
      {
        params: {
          username: recUsername,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${retToken}`,
        },
      }
    );

    // console.log(getPublickey.data);

    if (getPublickey.data.publicKey) {
      const obPublickey = getPublickey.data.publicKey;
      const obStrPublicKey = String(obPublickey)

      const authBearer = await getToken();
      const authStrBearer = authBearer.data.token

      const obSecretKey = String(secretKey);
      const assetCode = String(assetTransct).toUpperCase();
      const amountT = String(amountTransct);

      const data = {
        destination: obStrPublicKey, // Recipient's public key
        asset_code: assetCode,
        amount: amountT,
        secret_key: obSecretKey,
        home_domain: "benkiko.io",
      };

      console.log(data)

      const confirmTransaction = await axios.post(
        "https://staging.api.benkiko.io/v1/payment",
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authStrBearer}`,
          },
        }
      );

      console.log(confirmTransaction.data)
      if (confirmTransaction.data.code === 201) {
        const succData = confirmTransaction.data.data;
        const msg1 = confirmTransaction.data.message;
 
        return { code: 201, data: succData, message: msg1 };
      } else {
        const errorMsg = confirmTransaction.data.code;
        console.log("The error being returned", errorMsg);
        return { code: errorMsg, message: confirmTransaction.data.message };
      }
    } else {
      return { code: 4004, message: "Public key not found" };
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
    return { code: 4001, message: "Error in obtaining the public key", error: error.message };
  }
}

module.exports = { initPayment }; 