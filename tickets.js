const axios = require('axios');

async function fetchMatchData() {
    try {
        const response = await axios.get('https://auth-backend-1-cluk.onrender.com/api/tickets', {
            headers: {
                'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
                'Content-Type': 'application/json'
            }
        });

        const matches = response.data;

        // Process and structure the matches data
        const formattedMatches = formatMatchDetails(matches);

        if (formattedMatches) {
            return formattedMatches; // Return as an array of objects
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching data from API:', error);
        return [];
    }
}

function formatMatchDetails(matches) {
    matches.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort matches by date

    let matchTicketNumber = 1001; // Initialize the ticket number

    return matches.map(match => {
        const date = new Date(match.date).toISOString().split('T')[0];
        const homeTeam = match.homeTeam.name;
        const awayTeam = match.awayTeam.name;
        const time = match.time;
        const venue = match.venue;

        // Process tickets
        const tickets = match.ticketTypes.reduce((acc, ticket) => {
            acc[ticket.type] = ticket.price; // Store ticket types and prices
            return acc;
        }, {});

        // Return a structured object for each match
        const result = {
            "Ticket Number": matchTicketNumber++,
            Date: date,
            Team: `${homeTeam} vs ${awayTeam}`,
            Time: time,
            Venue: venue,
            Tickets: tickets // Example: { VIP: 1000, Regular: 500 }
        };

        return result;
    });
}

module.exports = { fetchMatchData };
