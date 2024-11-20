const axios = require('axios')


const getTeamPlayers = async(givenTeamName) => {

    const teamName = givenTeamName;

    const url = `https://auth-backend-1-cluk.onrender.com/api/players/team/${teamName}`;

    const allPlayers = await axios.get(url, {headers: {
      "x-api-key":
        "GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5",
      "Content-Type": "application/json",
    },});

    const obtPlayers = allPlayers.data
    if (obtPlayers.length > 0) {
      return obtPlayers
    } else {
      return 2404
    }


}

module.exports = {getTeamPlayers}