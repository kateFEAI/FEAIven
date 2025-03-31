const axios = require("axios");

module.exports = async function (context, myTimer) {
    const auth = Buffer.from(`${process.env.CONFLUENCE_USERNAME}:${process.env.CONFLUENCE_API_TOKEN}`).toString("base64");
    const confluenceApi = `https://${process.env.CONFLUENCE_DOMAIN}/wiki/rest/api/content/1835401234/child/page?expand=body.storage&limit=50`;k

    try {
        const res = await axios.get(confluenceApi, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

        const docs = res.data.results.map(page => ({
            "@search.action": "upload",
            id: `confluence-${page.id}`,
            title: page.title,
            content: page.body.storage.value.replace(/<[^>]*>?/gm, ''),
            url: `https://${process.env.CONFLUENCE_DOMAIN}/wiki${page._links.webui}`,
            lastModified: page.version.when
        }));

        await axios.post(
            `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${process.env.AZURE_SEARCH_INDEX}/docs/index?api-version=2023-07-01-Preview`,
            { value: docs },
            {
                headers: {
                    "Content-Type": "application/json",
                    "api-key": process.env.AZURE_SEARCH_KEY
                }
            }
        );

        context.log(`✅ Synced ${docs.length} Confluence pages to Azure Search.`);
    } catch (err) {
        context.log.error("❌ Sync failed:", err.message);
    }
};
