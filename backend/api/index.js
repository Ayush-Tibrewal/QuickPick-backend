const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const axios = require('axios');
const dotenv = require('dotenv');

const matchProducts = require('../backend/utils/compareProducts');
const scrapeBlinkit = require('../backend/scrapers/blinkit'); 
const fetchZeptoPrices = require('../backend/scrapers/zepto');
const swiggyScrape = require('../backend/scrapers/instamart');

dotenv.config();

const app = express();
app.use(cors());  
app.use(express.json());

// Inline fetchLocation function
// async function fetchLocation(pincode) {
//   const encodedQuery = encodeURIComponent(`"${pincode}"`);
//   try {
//     const res = await axios.get(`https://geocode.maps.co/search?q=${encodedQuery}&api_key=${process.env.API}`);
//     const latitude = Number(res.data[0]?.lat);
//     const longitude = Number(res.data[0]?.lon);
//     return { latitude, longitude };
//   } catch (err) {
//     console.error("Location fetch error:", err.message);
//     return {};
//   }
// }

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

module.exports = app;
module.exports.handler = serverless(app);
