const axios = require('axios')

async function allTeams () {
    try {
        const resp =  await axios.get('https://auth-backend-1-cluk.onrender.com/api/teams/teams', {
            headers: {
              'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
              'Content-Type': 'application/json'
            },
            timeout: 50000
          })

          const teamNames = resp.data.map(team => team.name);
          const formattedTeams = teamNames.join('\n')
          // console.log(resp.data)
          // console.log(teamNames)
          // console.log(formattedTeams)
      return formattedTeams
        
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('Request timed out:', error.message);
        return 5001;
    } else {
        console.error('Error fetching data from API:', error.message);
        return "An error occurred while fetching team data.";
    }
}

}

module.exports = {allTeams};