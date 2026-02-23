import type { Handler } from "@netlify/functions";
import Redis from 'ioredis'; // ioredis import

export const handler: Handler = async (event, context) => {
  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error("UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN is not set.");
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Redis 환경 변수가 설정되지 않았습니다." }),
    };
  }

  const redis = new Redis(redisUrl, {
    password: redisToken,
  });

  try {
    // Try to get the latest prices first
    const latestPricesString = await redis.get("latest_prices");
    
    if (latestPricesString) {
      const latestPrices = JSON.parse(latestPricesString);
      redis.disconnect();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...latestPrices, isCached: false }),
      };
    }

    // Fallback to cached prices if latest prices don't exist
    const cachedPricesString = await redis.get("cached_prices");
    redis.disconnect();

    if (cachedPricesString) {
      const cachedPrices = JSON.parse(cachedPricesString);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...cachedPrices, 
          isCached: true,
          cacheWarning: "현재 최신 가격을 불러올 수 없습니다. 마지막으로 저장된 가격을 표시하고 있습니다."
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "아직 가격 정보가 없습니다. 시세 업데이트를 기다려 주세요.",
        isCached: false
      }),
    };
  } catch (error: any) {
    console.error("Error fetching prices from Redis:", error.message || error);
    redis.disconnect();
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "시세 정보를 불러오는 중 오류가 발생했습니다.",
        isCached: false
      }),
    };
  }
};
