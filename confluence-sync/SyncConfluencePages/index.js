const axios = require("axios");

module.exports = async function (context, myTimer) {
    context.log("🚀 Starting Confluence → Azure Search sync...");

    // ✅ Show all relevant environment vars
    context.log("🔎 CONFLUENCE_DOMAIN:", process.env.CONFLUENCE_DOMAIN);
    context.log("🔎 AZURE_SEARCH_ENDPOINT:", process.env.AZURE_SEARCH_ENDPOINT);
    context.log("🔎 AZURE_SEARCH_INDEX:", process.env.AZURE_SEARCH_INDEX);

    try {
        // ✅ Prepare basic auth for Confluence
        const auth = Buffer.from(`${process.env.CONFLUENCE_USERNAME}:${process.env.CONFLUENCE_API_TOKEN}`).toString("base64");

        // ✅ Confluence API: fetch child pages under How-To folder
        const confluenceApi = `https://${process.env.CONFLUENCE_DOMAIN}/wiki/rest/api/content/1835401234/child/page?expand=body.storage&limit=50`;

        context.log("📡 Fetching pages from:", confluenceApi);

        const confluenceRes = await axios.get(confluenceApi, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

        const pages = confluenceRes.data.results || [];

        context.log(`📄 Retrieved ${pages.length} pages from Confluence.`);

        // ✅ Transform to searchable documents
        const docs = pages.map(page => ({
            "@search.action": "upload",
            chunk_id: `confluence-${page.id}`,
            title: page.title,
            content: page.body?.storage?.value?.replace(/<[^>]*>?/gm, '') || ""
        }));

        // ✅ Azure Search endpoint
        const searchApiUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${process.env.AZURE_SEARCH_INDEX}/docs/index?api-version=2023-07-01-Preview`;

        context.log("📤 Indexing docs to:", searchApiUrl);

        const searchRes = await axios.post(searchApiUrl, { value: docs }, {
            headers: {
                "Content-Type": "application/json",
                "api-key": process.env.AZURE_SEARCH_KEY
            }
        });

        context.log(`✅ Successfully indexed ${docs.length} docs to Azure Search.`);
    } catch (err) {
        context.log.error("❌ Sync failed:", err.message || err);
        context.log.error(err.stack || err.response?.data || "No additional error details.");
    }

    context.log("✅ Function execution complete.");
};
