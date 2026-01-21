import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  try {
    const store = context.blobs.get("prices");
    const latestPrices = await store.get("latest", { type: "json" });

    if (!latestPrices) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "아직 가격 정보가 없습니다. 잠시 후 다시 시도해 주세요." }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestPrices),
    };
  } catch (error) {
    console.error("Error fetching prices from store:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "저장소에서 가격 정보를 가져오는 중 오류가 발생했습니다." }),
    };
  }
};