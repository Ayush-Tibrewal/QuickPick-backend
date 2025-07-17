// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const matchProducts = require('./utils/compareProducts');
const scrapeBlinkit = require('./scrapers/blinkit');
const fetchZeptoPrices = require('./scrapers/zepto');
const swiggyScrape = require('./scrapers/instamart');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Location fetcher using geocode.maps.co API
async function fetchLocation(pincode) {
  const encodedQuery = encodeURIComponent(`"${pincode}"`);
  
  try {
    const res = await axios.get(`https://geocode.maps.co/search?q=${encodedQuery}&api_key=${process.env.API}`);
    
    if (!res.data || res.data.length === 0) {
      throw new Error('No data returned from geocoding API.');
    }

    const latitude = Number(res.data[0]?.lat);
    const longitude = Number(res.data[0]?.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates received.');
    }

    return { latitude, longitude };
  } catch (error) {
    console.error('Location fetch failed:', error.message);
    throw new Error('Location fetch failed.');
  }
}

app.get("/" (req,res) => {
  res.send("Welcome to QuickPick API"); 
});

// Main comparison route
app.post('/search/compare', async (req, res) => {
  const { query, pincode } = req.body;

  if (!query || !pincode) {
    return res.status(400).json({ error: 'Query and pincode required.' });
  }

  let location;
  try {
    location = await fetchLocation(pincode);
  } catch (err) {
    return res.status(400).json({ error: "Could not fetch location. Check pincode or try again later." });
  }

  try {
    const [blinkitData, zeptoData, swiggyData] = await Promise.all([
      scrapeBlinkit(query, pincode),
    //   fetchZeptoPrices(query, location),
    //   swiggyScrape(query, location)
    ]);

    const comparison = matchProducts(blinkitData, zeptoData, swiggyData);
    res.json(comparison);
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Comparison failed.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
