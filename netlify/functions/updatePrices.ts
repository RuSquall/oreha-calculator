import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  console.log("--- Forcing Blob Store Provisioning ---");
  if (!context.blobs) {
    console.error("context.blobs is undefined. Cannot provision store.");
    return {
      statusCode: 500,
      body: "Error: context.blobs is undefined. Blobs feature might not be available.",
    };
  }
  try {
    const store = context.blobs.get("prices");
    await store.set("latest", JSON.stringify({
      test: true,
      createdAt: Date.now(),
      message: "Blob store provisioned successfully with test data."
    }));
    console.log("Blob store 'prices' provisioned successfully with test data.");
    return {
      statusCode: 200,
      body: "Blob store 'prices' provisioned successfully with test data.",
    };
  } catch (error: any) {
    console.error("Failed to provision Blob store:", error.message || error);
    return {
      statusCode: 500,
      body: `Error provisioning Blob store: ${error.message || error}`,
    };
  }
};
