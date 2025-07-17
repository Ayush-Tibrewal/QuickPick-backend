const dotenv=require('dotenv');
const axios= require('axios');

dotenv.config();

async function encodeToUTF8(query) {
  return encodeURIComponent(query);
}

async function fetchLocation(pincode){
  // 1. Encode the pincode for URL
  const encodedQuery = await encodeToUTF8(`"${pincode}"`);

  // 2. Log the API key (for debugging - remove in production)
  console.log("API Key:", process.env.API);
  console.log(process.env); 
  const res = await axios.get(`https://geocode.maps.co/search?q=${encodedQuery}&api_key=${process.env.API}`);

  // 4. Extract coordinates
  const latitude = Number(res.data[0]?.lat);
  const longitude = Number(res.data[0]?.lon);

  // 5. Return as object
  return { latitude, longitude };
}
   

module.exports=fetchLocation