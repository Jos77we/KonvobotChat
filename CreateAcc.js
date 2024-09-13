const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const session = require("express-session");
const { getToken } = require("./getToken.js");

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

let accountData1 = null;
let mnemo = null;
let usname = null;
let secretKey = "e+eiv_e5q@y-bg#b@%^zvc2@j3+&6#_ulj+w&h1y*0_+&m#8nq";
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
  if (dataAvailable) {
    req.session.accountDetails = {
      accountData1,
      mnemo,
      usname,
    };
  } else {
    res.status(404).json({ error: "No data available" });
  }
  next();
});

router.post("/data", (req, res) => {
  const { userName } = req.body;

  if (
    req.session.accountDetails &&
    req.session.accountDetails.usname === userName
  ) {
    const accountDetails = req.session.accountDetails;
    res.json({ code: "200", accountDetails });
  } else {
    res.status(404).json({ error: "User is unknown" });
  }
});

const chainRequest = async (name) => {
  try {
    const tokenData = await getToken();

    console.log("The returned data is as--------->", tokenData.data);
    const { code, data } = tokenData;

    if (code === 200) {
      const obtainedToken = data.token;
      const reqgenMemonic = {
        language: "ENGLISH",
        strength: 256,
      };

      const url2 = "https://staging.api.benkiko.io/v1/generate-mnemonic";

      const genMemonic = await axios.post(url2, reqgenMemonic, {
        headers: {
          Authorization: `Bearer ${obtainedToken}`,
          "Content-Type": "application/json",
        },
      });

      const data4 = genMemonic.data;
      const memonic = data4.data.mnemonic;
      // console.log(memonic);

      if (data4.code === 201) {
        const reqAccount = {
          username: name,
          mnemonic: memonic,
          index: 0,
          language: "ENGLISH",
          memo_type: "id",
          memo: "00123",
          home_domain: "benkiko.io",
        };

        const url3 = "https://staging.api.benkiko.io/v1/account";

        const newAccount = await axios.post(url3, reqAccount, {
          headers: {
            Authorization: `Bearer ${obtainedToken}`,
            "Content-Type": "application/json",
          },
        });
        // console.log(newAccount.data.message)
        const status = newAccount.data.code;
        // const resp = newAccount.data;
        // secretKey = resp.data["secret key"];

        if (newAccount.data.code === 201) {
          accountData1 = newAccount.data;
          mnemo = memonic;
          usname = name;
          dataAvailable = true;

          // console.log(accountData1, mnemo, usname)
        } else {
          console.log("an error occured");
        }

        return status;
      }
    }
  } catch (error) {
    console.log("404 ERROR OCCURING --------->", error);
  }
};

module.exports = { chainRequest, router };
