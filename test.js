const express = require('express');
const bodyParser = require('body-parser');
const newAccount = require('./CreateAccount.js')
const userLogin = require('./LoginUsers.js')
const test2 = require('./test2.js')
const cors = require('cors');


const app = express();

app.use(cors({
  origin: '*',      
}));
app.use(bodyParser.json());



app.use('/user', newAccount.router)
app.use('/login', userLogin.router)
app.use('/whatsapp', test2)


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});