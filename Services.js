const express = require('express');
const bodyParser = require('body-parser');
const userInfo = require('./UserIntro.js');
const  create  = require('./CreateAcc.js');
const stellar = require('./stellarAccount.js')
const cors = require('cors');


const app = express();
app.use(bodyParser.json());

app.use(cors());

app.use('/whatsapp', userInfo);
app.use('/', create.router);
app.use('/', stellar);



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
