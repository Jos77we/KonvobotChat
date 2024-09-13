const { getToken } = require("./getToken.js");
const axios = require("axios");

let reqAuth = null;

const withdrawDeposit = async (reqChangeAsset, depoUrl, secretKey) => {
  try {
    const obAuth = await getToken();
    reqAuth = obAuth.data.token;
    console.log(reqAuth);

    const asset = String(reqChangeAsset).toLocaleUpperCase();
    const aqSecretK = String(secretKey)

    console.log(`The asset is ${asset} and the secret key is as -------> ${aqSecretK}`)

    const data = {
      asset_code: asset,
      limit: "922337203685.4775807",
      secret_key: aqSecretK,
    };

    const responseChange = await axios.post(
      "https://staging.api.benkiko.io/v1/change-trust",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${reqAuth}`,
        },
      }
    );
 
    if (responseChange.data) {
      console.log(depoUrl)
      const responseDeposit = await axios.get(depoUrl,
        {
          params: {
            asset_code: asset,
            domain: "testanchor.stellar.org",
            secret_key: aqSecretK,
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${reqAuth}`,
          },
        }
      );

      if (responseDeposit.data) {
        const sucCode = responseDeposit.data.code
        const sucData = responseDeposit.data.data
        const sucUrl = responseDeposit.data.data.url
        const sucId = responseDeposit.data.data.id

       
        return { code: sucCode, data: sucData, url: sucUrl, id: sucId }
      } else {
        console.log("Unsuccessful transaction");
        return { code: 400, message: "Error occurred" };
      }
    } else {
      console.log("Unsuccessful transaction");
      return { code: 400, message: "Error occurred" };
    }
  } catch (axiosError) {
    console.error("Axios error:", error.message);
    return { code: 500, message: "Internal server error" };
  }
};

module.exports = { withdrawDeposit };
