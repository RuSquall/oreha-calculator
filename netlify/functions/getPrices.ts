import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  console.log("--- Debugging getPrices function ---");
  console.log("Context object:", JSON.stringify(context, null, 2));
  console.log("context.blobs:", context.blobs);

  if (!context.blobs) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "context.blobs is undefined. Blobs feature might not be available." }),
    };
  }

  // Blobs 관련 코드는 잠시 주석 처리하거나 제거
  try {
    const store = context.blobs.get("prices");
    const latestPrices = await store.get("latest", { type: "json" });

    if (!latestPrices) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "아직 가격 정보가 없습니다. 잠시 후 다시 시도해 주세요." }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestPrices),
    };
  } catch (error: any) {
    console.error("Error fetching prices from store:", error.message || error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "저장소에서 가격 정보를 가져오는 중 오류가 발생했습니다." }),
    };
  }
};
