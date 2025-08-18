const puppeteer = require("puppeteer");
require("dotenv").config();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchZeptoPrices(query, pincode) {
  console.log("🟡 [Zepto] Start scrape for:", query, " @", pincode);

  const browser = await puppeteer.launch({
    executablePath: process.env.NODE_ENV ==='production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,800",
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  try {
    console.log("➡️ Navigating to Zepto...");
    await page.goto("https://www.zepto.com/", { waitUntil: "networkidle2" });

//     Waits until the "Select Location" button is visible on the page.

// This ensures the page is ready before clicking anything.



    console.log("➡️ Waiting for 'Select Location'...");
    await page.waitForSelector('button[aria-label="Select Location"]', { visible: true });
    await page.click('button[aria-label="Select Location"]');

    console.log("➡️ Typing PIN:", pincode);
    await page.waitForSelector('input[type="text"]', { visible: true });
    await page.click('input[type="text"]', { clickCount: 3 });
    await delay(300);
    await page.type('input[type="text"]', pincode.toString(), { delay: 80 });

    console.log("➡️ Selecting first location suggestion...");
    await page.waitForSelector('[data-testid="address-search-item"]', { visible: true });
    await page.click('[data-testid="address-search-item"]');

    console.log("➡️ Confirming location...");
    await page.waitForSelector('[data-testid="location-confirm-btn"]', { visible: true });
    await page.click('[data-testid="location-confirm-btn"]');

    console.log("➡️ Waiting for location to apply...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    console.log("➡️ Opening search bar...");
    await page.waitForSelector('a[aria-label="Search for products"]', { visible: true });
    await page.click('a[aria-label="Search for products"]');

    console.log("➡️ Typing query:", query);
    await page.waitForSelector('input[placeholder*="Search"]', { visible: true });
    await page.type('input[placeholder*="Search"]', query, { delay: 60 });
    await page.keyboard.press("Enter");

    console.log("⏳ Waiting for products to load...");
    await delay(3000)

  const products = await page.$$eval('a[href*="/pn/"]', cards =>
  cards.map(card => {
    // 1. Product name
    const name = card.querySelector('div[data-slot-id="ProductName"] span')
      ?.textContent.trim();

    // 2. Price (selling) and MRP
    const price = card.querySelector('div[data-slot-id="Price"] p._price_ljyvk_11')
      ?.textContent.trim();
    const mrp = card.querySelector('div[data-slot-id="Price"] p._original-price_ljyvk_35')
      ?.textContent.trim();

    // 3. Image
    const image = card.querySelector('img')?.src;

    // 4. Product link (href from <a>)
    const link = card.href;


    // 8. Out of stock flag
    const outOfStock = card.querySelector('div[data-is-out-of-stock="true"]') !== null;

    return { name, price, mrp, image, link, outOfStock };
  })
);


console.log(products);


    console.log(`✅ Extracted ${products.name} products from Zepto.`);
    console.log(`✅ Extracted ${products.mrp} products from Zepto.`);
    console.log(`✅ Extracted ${products.outOfStock} products from Zepto.`);
    console.log(`✅ Extracted ${products.price} products from Zepto.`);
    console.log(`✅ Extracted ${products.length} products from DOM.`);
    return products;

  } catch (err) {
    console.error("❌ Zepto scrape error:", err.stack || err.message);
    return [];
  } finally {
    await browser.close();
    console.log("🔚 Browser closed.");
  }
}

module.exports = fetchZeptoPrices;
