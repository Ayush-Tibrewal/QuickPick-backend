const puppeteer = require('puppeteer');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function swiggyScrape(query, location) {
  const { latitude, longitude } = location;
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://www.swiggy.com", ["geolocation"]);

  const page = await browser.newPage();
  console.log('Setting user agent...');
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  console.log('Setting geolocation:', latitude, longitude);
  await page.setGeolocation({ latitude, longitude });

    try {
    console.log('Navigating to Swiggy Instamart...');
    await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'networkidle2' });

    console.log('Waiting for GPS button...');
    await page.waitForSelector('[data-testid="set-gps-button"]', { visible: true });
    console.log('Clicking GPS button...');
    await page.click('[data-testid="set-gps-button"]');
  } catch (e) {
    console.warn('GPS button not found or clickable:', e.message);
  }

// try {
//   console.log('Navigating to Swiggy Instamart...');
//   await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'networkidle2' });

//   console.log('Trying to click GPS button using evaluate...');
//   await page.evaluate(() => {
//     const gpsBtn = document.querySelector('[data-testid="set-gps-button"]');
//     if (gpsBtn) gpsBtn.click();
//   });
// } catch (e) {
//   console.warn('GPS button not found or clickable:', e.message);
// }

console.log('Waiting briefly for tooltip...');
await delay(500);

  try {
    console.log('Waiting for re-check address tooltip...');
    await page.waitForFunction(() => {
      const tooltip = document.querySelector('[data-testid="re-check-address-tooltip"]');
      const closeBtn = tooltip?.querySelector('[role="button"]');
      return !!closeBtn;
    }, { timeout: 3000 });

    console.log('Closing re-check address tooltip...');
    await page.evaluate(() => {
      const tooltip = document.querySelector('[data-testid="re-check-address-tooltip"]');
      const closeBtn = tooltip?.querySelector('[role="button"]');
      closeBtn?.click();
    });
  } catch (e) {
    console.warn('Tooltip not found or already closed:', e.message);
  }

  console.log('Opening search bar...');
  await page.waitForSelector('div._1AaZg', { visible: true });
  await page.click('div._1AaZg');

  console.log('Waiting for search input...');
  await delay(200);
  await page.waitForSelector('[data-testid="search-page-header-search-bar-input"]', { visible: true });

  console.log('Typing search query:', query);
  await page.type('[data-testid="search-page-header-search-bar-input"]', query);
  await page.keyboard.press('Enter');

  console.log('Waiting for search results to appear...');
  await page.waitForSelector('[data-testid="IM_SEARCH_PAGE_TITLE"]', { visible: true });

  console.log('Triggering image load with small scroll...');
  await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight);
  });

  console.log('Scrolling all items into view to trigger lazy load...');
  await page.evaluate(async () => {
    const items = Array.from(document.querySelectorAll('[data-testid="default_container_ux4"]'));
    for (const item of items) {
      item.scrollIntoView({ behavior: 'instant', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  console.log('Re-setting geolocation just in case...');
  await delay(200);
  await page.setGeolocation({ latitude, longitude });

  console.log('Extracting product data...');
  const products = await page.$$eval('[data-testid="default_container_ux4"]', items => {
    function generateSwiggySearchURL(productName) {
      const encodedQuery = encodeURIComponent(productName).replace(/%20/g, '+');
      return `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodedQuery}`;
    }

    return items.map((item, index) => {
      const name = item.querySelector('.novMV')?.innerText.trim() || '';

      // Extract image from background-image style
      let productImg = null;
      const bgStyle = item.querySelector('._7Vorb')?.style.backgroundImage;
      const bgUrl = bgStyle?.match(/url\("?(.*?)"?\)/)?.[1] || '';
      if (bgUrl && !bgUrl.includes('offer_tag.png')) {
        productImg = bgUrl;
      } else {
        productImg = Array.from(item.querySelectorAll('img'))
          .map(img => img.src)
          .find(src =>
            src.includes('media-assets.swiggy.com') &&
            !src.includes('instamart-assets/offer_tag.png')
          ) || null;
      }

      const quantity = item.querySelector('.FqnWn')?.innerText.trim() || '';
      const deliveryLabel = item.querySelector('[aria-label^="Delivery in"]')?.getAttribute('aria-label') || '';
      const deliveryTime = deliveryLabel.match(/\d+/)?.[0] || '';
      const price = item.querySelector('[data-testid="item-offer-price"]')?.innerText.trim() || '';
      const link = generateSwiggySearchURL(name);
      const isSoldOut = !!item.querySelector('[data-testid="sold-out"]');
      const availability = isSoldOut ? 'Sold Out' : 'Available';

      return {
        debugLog: `==== ITEM ${index + 1} ====`,
        outerHTML: item.outerHTML,
        name,
        image:productImg,
        quantity,
        deliveryTime,
        price,
        link,
        availability
      };
    });
  });

  // ✅ Log results outside of page context
  products.forEach(p => {
    // console.log(p.debugLog);
    // console.log(p.outerHTML);
    // console.log(`🛒 Name: ${p.name}`);
    console.log(`🖼️ Image: ${p.productImg}`);
    // console.log(`💰 Price: ${p.price}`);
    // console.log(`📦 Quantity: ${p.quantity}`);
    // console.log(`🚚 Delivery Time: ${p.deliveryTime}`);
    // console.log(`🔗 Link: ${p.link}`);
    // console.log(`📌 Availability: ${p.availability}`);
    // console.log('-------------------------------------\n');
  });

  console.log(`✅ Extracted ${products.length} products.`);
  console.log('Closing browser...');
  await browser.close();

  return products;
}

module.exports = swiggyScrape;
