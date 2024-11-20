const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

let storedUser = null;

router.post("/user-login", async (req, res) => {
  const { phoneNumber, publicKey } = req.body;

  // console.log('The phone number is ---->', phoneNumber, 'The public key is ----->', publicKey)

  if (!phoneNumber || !publicKey) {
    return res
      .status(400)
      .json({ error: "Phone number and Stellar public key are required." });
  }
  try {
    const accRes = await checkLogin(phoneNumber, publicKey);

    res.json(accRes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const checkLogin = async (phoneNumber, publicKey) => {
  storedUser = { phoneNumber, publicKey };

  // console.log("The stored values are ---->", storedUser);

  // Return a success response
  return { message: "Login successful" };
};

const getUserLogins = () => storedUser;

module.exports = { router, getUserLogins };
