const express = require('express');
const bodyParser = require('body-parser');
const stellar = require('./stellarAccount.js')
const test2 = require('./test2.js')
const cors = require('cors');


const app = express();
app.use(bodyParser.json());

app.use(cors());

app.use('/', stellar);
app.use('/whatsapp', test2)



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});