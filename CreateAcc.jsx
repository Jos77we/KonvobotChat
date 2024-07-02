const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const session = require('express-session');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

let accountData1 = null;
let mnemo = null;
let usname = null;
let secretKey;
let accToken = null;
let dataAvailable = false;

const sessionMiddleware = (req, res, next) => {

  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, 
  })(req, res, next);
};

router.use(async (req, res, next) => {
  if (!secretKey) {
    await chainRequest();
  }
  next();
});

router.use(sessionMiddleware);

router.use((req, res, next) => {
  if(dataAvailable){
  req.session.accountDetails = {
    accountData1,
    mnemo,
    usname
  };
} else {
  res.status(404).json({ error: 'No data available' });
}
  next();
});


router.post('/data', (req, res) => {
  const { userName } = req.body;

  if (req.session.accountDetails && req.session.accountDetails.usname === userName) {
    const accountDetails = req.session.accountDetails;
    res.json({code:"200", accountDetails});
  } else {
    res.status(404).json({ error: "User is unknown" });
  }
});

router.post('/create', (req, res) => {
  const {form} = req.body;
  console.log(form)
  
  if(!form){
     console.log("An error occured as no data is passed")
  } else{
    try {
      const response = axios.post(
        'https://api.kipaji.app/api/v1/auth/register', form,  {
               headers: {
                Authorization: `Bearer ${accToken}`,
                 "Content-Type": "application/json",
              }
            }
      );
      console.log(response.data);
    } catch (error) {
      console.error("There was an error!", error);
    }
  }
})

async function chainRequest(name) {
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
        const resToken = data3.data.token;

        if (data3.code === 200) {
          const genToken = resToken;
          accToken = genToken;
          const reqgenMemonic = {
            language: "ENGLISH",
            strength: 256,
          };

          const url2 = "https://staging.api.benkiko.io/v1/generate-mnemonic";

          const genMemonic = await axios.post(url2, reqgenMemonic, {
            headers: {
              Authorization: `Bearer ${genToken}`,
              "Content-Type": "application/json",
            },
          });

          const data4 = genMemonic.data;
          const memonic = data4.data.mnemonic;
          console.log(memonic);
          

          if (data4.code === 201) {
            // const name = "leminado"
            const reqAccount = {
              username: name,
              mnemonic: memonic,
              index: 0,
              language: "ENGLISH",
              memo_type: "id",
              memo: "0049",
              home_domain: "benkiko.io",
            };

            const url3 = 'https://staging.api.benkiko.io/v1/account'

            const newAccount = await axios.post(url3, reqAccount, {
              headers: {
                Authorization: `Bearer ${genToken}`,
                "Content-Type": "application/json",
              },
            })
            // console.log(newAccount.data.message)
            const status = newAccount.data.code;
            const resp = newAccount.data;
            secretKey = resp.data['secret key']
           
              if(newAccount.data.code === 201){
              accountData1 = newAccount.data;
              mnemo = memonic;
              usname = name;
              dataAvailable = true;

              console.log(accountData1, mnemo, usname)
            } else{
              console.log("an error occured")
            }

            return status
            // if(newAccount.code === 201){
            //   const publicKey = newAccount.data["public key"]
            //   console.log(publicKey)
            //   const secretKey = newAccount.data["secret key"]
            //   const reqAcc = { 
            //       username: "tecard",
            //       paymail: newAccount.data.paymail,
            //       password: "Goodwell123@#",
            //       publicKey: publicKey,
            //       secretKey: secretKey,
            //       mnemonic: memonic,
  
            //   }

            //   const url4 = 'https://api.kipaji.app/api/v1/auth/register'
            //   const uniAccount = await axios.post(url4, reqAcc, {
            //     headers: {
            //       Authorization: `Bearer ${genToken}`,
            //       "Content-Type": "application/json",
            //     }
            //   })

            //   console.log(uniAccount)
            // }
          }

          
        }
      }
    } else {
      console.log("An error occured");
    }
  } catch (error) {
    console.log(error);
  }
}

// chainRequest();


// const port = 3000;
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
module.exports = { chainRequest, router };
