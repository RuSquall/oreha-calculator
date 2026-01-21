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
    const latestPricesString = await redis.get("latest_prices");
    redis.disconnect(); // Disconnect Redis after use

    if (!latestPricesString) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "아직 가격 정보가 없습니다. 잠시 후 다시 시도해 주세요." }),
      };
    }

    const latestPrices = JSON.parse(latestPricesString);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestPrices),
    };
  } catch (error: any) {
    console.error("Error fetching prices from Redis:", error.message || error);
    redis.disconnect(); // Ensure Redis connection is closed on error
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Redis에서 가격 정보를 가져오는 중 오류가 발생했습니다." }),
    };
  }
};
