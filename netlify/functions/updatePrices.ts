import type { Handler } from "@netlify/functions";

// 조회할 아이템 목록과 속성을 체계적으로 관리
const ITEMS_TO_FETCH = [
  // 원재료
  { name: '아비도스 목재', categoryCode: 50000, minQuantity: 100 },
  { name: '부드러운 목재', categoryCode: 50000, minQuantity: 100 },
  { name: '목재', categoryCode: 50000, minQuantity: 100 },
  { name: '튼튼한 목재', categoryCode: 50000, minQuantity: 100 },
  // 융화재료 (제작 재료 카테고리)
  { name: '상급 아비도스 융화재료', categoryCode: 200000, minQuantity: 10 },
  { name: '아비도스 융화재료', categoryCode: 200000, minQuantity: 10 },
];

// 개별 아이템의 가격을 로스트아크 API를 통해 가져오는 헬퍼 함수
const fetchPriceFromLostArk = async (
  itemName: string,
  categoryCode: number,
  minQuantity: number,
  apiKey: string
): Promise<number | null> => {
  const requestBody = {
    Sort: 'CURRENT_MIN_PRICE',
    CategoryCode: categoryCode,
    ItemName: itemName,
    PageNo: 1,
    SortCondition: 'ASC',
  };
  console.log(`[${itemName}] Requesting with body:`, JSON.stringify(requestBody));

  try {
    const response = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`[${itemName}] API error: Status ${response.status}, Text: ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`[${itemName}] API error body: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    console.log(`[${itemName}] API response data:`, JSON.stringify(data));

    if (data.Items && data.Items.length > 0) {
      const smartListing = data.Items.find(item => item.TradeRemainCount >= minQuantity);
      let effectivePrice;

      if (smartListing) {
        effectivePrice = smartListing.CurrentMinPrice;
        console.log(`[${itemName}] Smart price found (qty >= ${minQuantity}): ${effectivePrice}`);
      } else {
        effectivePrice = data.Items[0].CurrentMinPrice;
        console.log(`[${itemName}] No smart price, falling back to min price: ${effectivePrice}`);
      }
      
      if (categoryCode === 50000) { // 원재료
        return effectivePrice * 100;
      }
      // 융화재료
      return effectivePrice;
    } else {
      console.warn(`[${itemName}] No items found in API response.`);
    }
    return null;
  } catch (error: any) {
    console.error(`[${itemName}] Failed to fetch price:`, error.message || error);
    return null;
  }
};

export const handler: Handler = async (_event, context) => {
  const apiKey = process.env.LOSTARK_API_KEY;

  if (!apiKey) {
    console.error("LOSTARK_API_KEY is not set.");
    return { statusCode: 500 };
  }

  console.log("Starting to fetch prices from Lost Ark API...");

  const pricePromises = ITEMS_TO_FETCH.map(item => 
    fetchPriceFromLostArk(item.name, item.categoryCode, item.minQuantity, apiKey)
  );
  const results = await Promise.all(pricePromises);

  const newPrices: Record<string, number> = {};
  let allSucceeded = true;

  ITEMS_TO_FETCH.forEach((item, index) => {
    const price = results[index];
    if (price !== null) {
      newPrices[item.name] = price;
    } else {
      allSucceeded = false;
      console.warn(`Could not fetch price for ${item.name}.`);
    }
  });

  if (Object.keys(newPrices).length === 0) {
    console.error("Failed to fetch any prices. Aborting update.");
    return { statusCode: 500 };
  }

  const responseData = {
    prices: newPrices,
    lastUpdated: new Date().toISOString(),
  };

  try {
    const store = context.blobs.get("prices");
    await store.setJSON("latest", responseData);
    console.log("Successfully updated prices to Netlify Blobs.", responseData);
  } catch (error) {
    console.error("Failed to save prices to Netlify Blobs:", error);
    return { statusCode: 500 };
  }

  return {
    statusCode: allSucceeded ? 200 : 500,
    body: `Price update completed. ${allSucceeded ? 'All successful.' : 'Some failed.'}`,
  };
};