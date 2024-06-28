const express = require('express');
const bodyParser = require('body-parser');
const userInfo = require('./UserIntro.jsx');
const { router: create } = require('./CreateAcc.jsx');
const cors = require('cors');


const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: 'https://konvoui.netlify.app', // Your React app's URL
  credentials: true // Enable sending cookies with CORS
}));

app.use('/whatsapp', userInfo);
app.use('/', create)


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
