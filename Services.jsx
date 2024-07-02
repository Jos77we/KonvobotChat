const express = require('express');
const bodyParser = require('body-parser');
const userInfo = require('./UserIntro.jsx');
const { router: create } = require('./CreateAcc.jsx');
const login = require('./FetchUser.jsx')
const cors = require('cors');


const app = express();
app.use(bodyParser.json());

app.use(cors());

app.use('/whatsapp', userInfo);
app.use('/', create)
app.use('/', login)


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
