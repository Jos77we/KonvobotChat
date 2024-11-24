const axios = require('axios')

const jerseyCharacteristics  = async (teamName) => {
    try {
        const jersResp = await axios.get('https://auth-backend-py1a.vercel.app/api/teams/teams', {
          headers: {
            'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
            'Content-Type': 'application/json'
          }
        });
    
        const data = jersResp.data;
    
        if (typeof teamName === 'string') {
          const item = data.find((entry) => entry.name.toLowerCase() === teamName.toLowerCase());
    
          if (item) {
           
            const teamId = item._id
            console.log(teamId)
    
            try {
    
              const retResp = await axios.get('https://auth-backend-py1a.vercel.app/api/jerseys', {
                headers: {
                  'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
                  'Content-Type': 'application/json'
                }
              })
              
              const resData = retResp.data
    
              // console.log(resData)
              const jerseyFull = resData.find((great) => great.teamName.toLowerCase() === teamId.toLowerCase());
    
              if(jerseyFull){

                 
                return { type: jerseyFull.type, price: jerseyFull.price };
              }
            } catch (error) {
                console.error("Error fetching data:", error);
                return 2301;
            }
          } else {
    
            console.log("Team name not found");
            return 2302; 
          }
        } else {
            console.log("Invalid team name");
            return 2303
        }
    
      } catch (error) {
        console.error("Error fetching data:", error);
    return 2301;
      }
}

module.exports = jerseyCharacteristics