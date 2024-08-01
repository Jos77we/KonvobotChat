const express = require('express');
const bodyParser = require('body-parser');
const userInfo = require('./test.js');
const { router: create } = require('./CreateAcc.js');
const cors = require('cors');


const app = express();
app.use(bodyParser.json());

app.use(cors());

app.use('/whatsapp', userInfo);
app.use('/', create)


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
