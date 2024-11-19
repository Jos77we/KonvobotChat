const axios = require('axios')


async function fetchMatchData() {
    try {
      const response = await axios.get('https://auth-backend-1-cluk.onrender.com/api/tickets', {
        headers: {
          'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
          'Content-Type': 'application/json'
        }
      });
      
     
      const matches = response.data;
  
      
      const formattedOutput = formatMatchDetails(matches);
      console.log(formattedOutput); 

     if(formattedOutput){
        return formattedOutput
     } else{
        return 500
     }

    } catch (error) {
      console.error('Error fetching data from API:', error);
    }
  }

function formatMatchDetails(matches) {
    matches.sort((a, b) => new Date(a.date) - new Date(b.date));
  
    let matchTicketNumber = 1001; 
  
    return matches.map(match => {
      const date = new Date(match.date).toISOString().split('T')[0]; 
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;
      const time = match.time;
      const venue = match.venue;
  
      
      let vipTicketNumber = 1001;
      let regularTicketNumber = 1601;
  
      
      const tickets = match.ticketTypes.map(ticket => {
        let output;
        if (ticket.type === 'VIP') {
          output = `Ticket: VIP: ${ticket.price}`;
          vipTicketNumber += ticket.quantity; 
        } else if (ticket.type === 'Regular') {
          output = `Ticket: Regular: ${ticket.price}`;
          regularTicketNumber += ticket.quantity; 
        }
        return output;
      }).join(', ');
  
      
      const result = `Ticket Number: ${matchTicketNumber}\nDate: ${date}\nTeam: ${homeTeam} vs ${awayTeam}\nTime: ${time}\nVenue: ${venue}\n${tickets}\n`;
      
      matchTicketNumber += 1; 
      return result;
    }).join('\n');
  }

  
  module.exports = {fetchMatchData};