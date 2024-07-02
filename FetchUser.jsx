const express = require("express");
const bodyParser = require("body-parser");


const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


router.post('/login-user', (req, res) => {
    const {username, publickey, secretkey, token} = req.body

    try {
        if(!username && !publickey && !secretkey && !token){
            res.json("Error in obtaining details")
        } else{
            const details = {username, publickey, secretkey, token}
            console.log(details)
            res.json("Success")
        } 
    } catch (error) {
        console.log(error)
    }
   
})

module.exports = router;