const puppeteer = require("puppeteer");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchZeptoPrices(query, pincode) {
  console.log("🟡 [Zepto] Start scrape for:", query, " @", pincode);

  const browser = await puppeteer.launch({
    headless: false,
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

    const productHtmlList = await page.$$eval('[data-testid="product-card"]', cards =>
  cards.map((card, index) => {
    return {
      index: index + 1,
      innerHTML: card.innerHTML
    };
  })
);

console.log("Full HTML of each product card:");
productHtmlList.forEach(product => {
  console.log(`\n--- Product ${product.index} ---`);
  console.log(product.innerHTML);
});


  const products = await page.$$eval('a[data-testid="product-card"]', cards =>
  cards.map(card => {
    // 1. Name
    const name = card
      .querySelector('[data-testid="product-card-name"]')
      ?.textContent
      ?.trim();

    // 2. Price & MRP
    const [price, mrp] = Array.from(
      card.querySelectorAll('div.flex.flex-wrap.items-baseline p')
    ).map(p => p.textContent.trim());

    // 3. Image
    const image = card
      .querySelector('[data-testid="product-card-image"]')
      ?.src;

    // 4. Link — card is the <a> itself
    const link = card.href;

    // 5. Out of stock flag (if it’s ever rendered inside)
    const outOfStock = !!card.querySelector('[data-testid="OOS"]');

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
