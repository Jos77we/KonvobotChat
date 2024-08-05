const axios = require("axios");


const getToken = async () => {
    try {
      const auth = await axios.get(
        "https://staging.api.benkiko.io/v1/auth/challenge",
        {
          params: {
            client_account:
              "GBSPEPAOZM4Q65MHOS4Z5NKY55HTXZEDQETKCPLE4BC4TBYXFRTZIYSF",
            home_domain: "benkiko.io",
          },
        }
      );
      const data1 = auth.data;
      const transaction = data1.data.transaction;
  
      if (data1.code === 200) {
        const reqSignIn = {
          challenge_transaction_xdr: transaction,
          client_account_signing_seed:
            "gAAAAABkVMwqYQdZVUQBwK5uNUeUgp2T8CYb4IvK7NwA7fiHZfgxFAiia-DP3-UiJm2J_Lksxa8EjFh3m-Q-3OTiyI-Ik8EIthz6mijIQVvKORPNl6X0ZwCicl8B7WY9MAFq2J1Wqd8phbmmV7gamzW-uzyoyGddkg==",
        };
        const url = "https://staging.api.benkiko.io/v1/auth/sign";
  
        const signIn = await axios.post(url, reqSignIn, {
          headers: {
            "Content-Type": "application/json",
          },
        });
  
        const data2 = signIn.data;
        const transaction2 = data2.data.transaction;
  
        if (data2.code === 200) {
          const reqToken = {
            signed_challenge_transaction_xdr: transaction2,
          };
  
          const url1 = "https://staging.api.benkiko.io/v1/auth/token";
  
          const token = await axios.post(url1, reqToken, {
            headers: {
              "Content-Type": "application/json",
            },
          });
          const data3 = token.data;
        //   console.log(data3)
          const resToken = data3.data.token;
  
          console.log("function getTken returns",resToken)
  
          return data3
        }
      }
    } catch (error) {
      console.log("402, Error in fetching the required token");
    }
  }

  module.exports = {getToken};