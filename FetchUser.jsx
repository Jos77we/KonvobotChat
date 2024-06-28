const express = require('express')

const router = express.Router();


router.post('/login-user', (req, res) => {
    const {username, publickey, secretkey, token} = req.body

    try {
        if(!username && !publickey && !secretkey && !token){
            res.json("Error in obtaining details")
        } else{
            res.json("Success")
        } 
    } catch (error) {
        console.log(error)
    }
   
})

module.exports = router;