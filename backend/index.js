const express = require('express');
const cors = require('cors');
const matchProducts = require('./utils/compareProducts');
const scrapeBlinkit = require('./scrapers/blinkit'); 
const fetchZeptoPrices = require('./scrapers/zepto');
const swiggyScrape= require('./scrapers/instamart');
const fetchLocation=require('./api')

const dotenv=require('dotenv');
const axios= require('axios');

dotenv.config();

async function encodeToUTF8(query) {
  return encodeURIComponent(query);
}

// async function fetchLocation(pincode){
//   // 1. Encode the pincode for URL
//   const encodedQuery = await encodeToUTF8(`"${pincode}"`);

//   // 2. Log the API key (for debugging - remove in production)
//   console.log("API Key:", process.env.API);
//   console.log(process.env); 
//   const res = await axios.get(`https://geocode.maps.co/search?q=${encodedQuery}&api_key=${process.env.API}`);

//   // 4. Extract coordinates
//   const latitude = Number(res.data[0]?.lat);
//   const longitude = Number(res.data[0]?.lon);

//   // 5. Return as object
//   return { latitude, longitude };
// }
   

module.exports=fetchLocation

const app = express();
app.use(cors());  
app.use(express.json());

app.post("/", (req, res) => {
  res.send("POST request received. Backend is working!");
});

app.post('/search/compare', async (req, res) => {
  const { query, pincode } = req.body;

  if (!query || !pincode) {
    return res.status(400).json({ error: 'Query and pincode required.' });
  }

  const location = await fetchLocation(pincode);

  if (!location?.latitude) {
    return res.status(400).json({ error: 'Try searching with a more specific locality name.' });
  }

  try {
    let swiggyData = [];
    try {
      swiggyData = await swiggyScrape(query, location);
    } catch (err) {
      console.warn('Swiggy scrape failed:', err.message);
    }

    let zeptoData = [];
    try {
      zeptoData = await fetchZeptoPrices(query, pincode);
    } catch (err) {
      console.warn('Zepto scrape failed:', err.message);
    }

    let blinkitData = [];
    try {
      blinkitData = await scrapeBlinkit(query, pincode);
    } catch (err) {
      console.warn('Blinkit scrape failed:', err.message);
    }

    if (!swiggyData.length && !zeptoData.length && !blinkitData.length) {
      return res.status(404).json({ error: 'No data found from any provider.' });
    }

    const comparison = matchProducts(blinkitData, zeptoData, swiggyData);
    res.json(comparison);
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Comparison failed.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
