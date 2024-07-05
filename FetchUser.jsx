const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios")


const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

let code = null;

const loginSuccess = () => {
    return code
}
router.post('/login-user', async (req, res) => {
    const {paymail, password} = req.body

    try {
        if(!paymail && !password){
            res.json({code:"2000", Message:"Error in obtaining details"})
        } else{
            const logUser = await axios.post("https://api.kipaji.app/api/v1/auth/login", {paymail, password}, {
                headers: {
                  "Content-Type": "application/json",
                },
              })

              if(logUser.data === "Invalid paymail or password"){
                  const status = 204;
                  status = code;
              } else if(logUser.data.token){
                const status1 = 200;
                status1 = code;
              } else {
                const status2 = 404;
                status2 = code;
              }
        } 
    } catch (error) {
        console.log(error)
    }
   
})

module.exports = {loginSuccess, router};