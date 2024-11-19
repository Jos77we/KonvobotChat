const axios = require('axios')

async function intiatePayment (teamName){

    

  try {
    const resp =  await axios.get('https://auth-backend-1-cluk.onrender.com/api/teams/teams', {
        headers: {
          'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
          'Content-Type': 'application/json'
        }
      })

      const teamResult = resp.data
      console.log('The resulting is as:',teamResult)

      const teamByName = teamName
      console.log('The team name is', teamByName)
      const foundTeam = resp.data.find(team => team.name.toLowerCase() === teamByName.toLowerCase());

      console.log('The found team is known as', foundTeam)
      const teamId = foundTeam._id

      console.log('The team id obtained is as', teamId)

      if(foundTeam) {
        try {

          const url = `https://auth-backend-1-cluk.onrender.com/api/mpesa/stk/${teamId}`
          const load = {
            phoneNumber: "254759900998"
          }

          console.log('The url is as;', url)

          const tres = await axios.post(url, load, {
            headers: {
              'x-api-key': 'GCQI626CM2QRQH4MPOSW5D7GDEUGBY54J3XUAMIPNE4VAXIFGFQN34V5',
              'Content-Type': 'application/json'
            }
          })
          
          const messageSuccess = tres.data.CheckoutRequestID

          if(messageSuccess) {
            return 200
          } else{
            return 500
          }
        } catch (error) {
          console.error('Error fetching data from the mpesa API:', error);
          
        }
      }

} catch (error) {
    console.error('Error fetching data from API:', error);
}
}

module.exports = intiatePayment