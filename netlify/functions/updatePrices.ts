import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

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
  try {
    const response = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `bearer ${apiKey}`,
      },
      body: JSON.stringify({
        Sort: 'CURRENT_MIN_PRICE',
        CategoryCode: categoryCode,
        ItemName: itemName,
        PageNo: 1,
        SortCondition: 'ASC',
      }),
    });

    if (!response.ok) {
      console.error(`API error for ${itemName}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (data.Items && data.Items.length > 0) {
      const smartListing = data.Items.find(item => item.TradeRemainCount >= minQuantity);
      let effectivePrice;

      if (smartListing) {
        effectivePrice = smartListing.CurrentMinPrice;
      } else {
        effectivePrice = data.Items[0].CurrentMinPrice;
      }
      
      // 융화재료는 1개당, 원재료는 100개당 가격으로 UI/로직에서 사용될 것을 가정.
      // 여기서는 API가 반환하는 '개당' 가격을 그대로 반환하고, 사용하는 쪽에서 조정하도록 변경.
      // -> 다시 생각해보니, 저장 데이터의 단위를 통일하는 것이 좋음.
      //    원재료는 100개당, 융화재료는 1개당 가격으로 저장.
      if (categoryCode === 50000) { // 원재료
        return effectivePrice * 100;
      }
      // 융화재료
      return effectivePrice;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch price for ${itemName}:`, error);
    return null;
  }
};

export const handler: Handler = async () => {
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
    const store = getStore("prices");
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