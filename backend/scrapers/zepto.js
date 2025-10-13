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

  // inside an async function with a Puppeteer `page`
const products = await page.$$eval('.SxLQB a[href*="/pn/"]', cards =>
  cards
    .filter(card => {
      // Only keep visible cards
      const style = window.getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      const isVisible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0;
      return isVisible;
    })
    .map(card => {
      const cleanPrice = (txt) => {
        if (!txt) return null;
        const cleaned = txt.replace(/[^\d.,]/g, '').replace(/,/g, '').trim();
        return cleaned === '' ? null : cleaned;
      };

      const name = card.querySelector('[data-slot-id="ProductName"] span')
        ?.textContent?.trim() ?? null;

      const priceSlot = card.querySelector('[data-slot-id="Price"]');
      let price = null, mrp = null;
      if (priceSlot) {
        const sellingP = priceSlot.querySelector('p.cGFDG0, p')?.textContent?.trim() ?? null;
        price = cleanPrice(sellingP);

        const mrpP = priceSlot.querySelector('p.cFLlze')?.textContent?.trim()
          ?? (priceSlot.querySelectorAll('p').length > 1
            ? priceSlot.querySelectorAll('p')[1]?.textContent?.trim()
            : null);
        mrp = cleanPrice(mrpP);
      }

      const image = card.querySelector('img.c2ahfT')?.src ?? null;
      const link = card.getAttribute('href') ?? null;

      const quantity = card.querySelector('[data-slot-id="PackSize"] span')
        ?.textContent?.trim() ?? null;

      const deliveryTime = card.querySelector('[data-slot-id="EtaInformation"]')
        ?.textContent?.trim() ?? null;

      const rating = card.querySelector('[data-slot-id="RatingInformation"] .cPdMhy')
        ?.textContent?.trim() ?? null;
      const reviewCount = card.querySelector('[data-slot-id="RatingInformation"] .cuNaP7')
        ?.textContent?.replace(/[()]/g, '')?.trim() ?? null;

      let outOfStock = false;
      const productDiv = card.querySelector('div[data-is-out-of-stock]');
      if (productDiv) {
        outOfStock = productDiv.getAttribute('data-is-out-of-stock') === 'true';
      }

      return { name, price, mrp, image, link, quantity, deliveryTime, rating, reviewCount, outOfStock };
    })
);



    console.log(products);
    console.log(`✅ Extracted ${products.length} products from Zepto.`);
    if (products.length) {
      // show a quick sample to verify structure
      console.log('Sample product:', products[0]);
    }
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
