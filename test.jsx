const twilio = require('twilio');

const apiKeySid = 'SK95a3c7d21fb47759ebe4571b2fe32208';
const accountSid = 'ACb4cf2d815575aca31959f1a58020a221';
const authToken = 'bwtnq2FtwdCJrqbAjJUePmNBlPMD4XYp';

const client = new twilio(apiKeySid, authToken, { accountSid: accountSid });
// const client = new twilio(accountSid, authToken);

client.messages('SMf917720370f70f8ed6ed559e170598d0') // replace with your message SID
  .fetch()
  .then(message => {
    console.log('Message Status:', message.status);
    console.log('Error Code:', message.errorCode);
    console.log('Error Message:', message.errorMessage);
  })
  .catch(error => console.error(error));