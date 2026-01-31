
const https = require('https');

const API_KEY = 'bbe7ec95-5bc2-4846-8000-f89e54142612';
const GAMERTAG = 'mnk mario';

function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => {
                        try { return JSON.parse(data); }
                        catch (e) { return null; }
                    },
                    text: () => data
                });
            });
        }).on('error', (e) => reject(e));
    });
}

async function testGuideFlow() {
    try {
        console.log(`--- Testing Guide Flow for ${GAMERTAG} ---`);

        // 1. Search using the User's suggested endpoint
        // Endpoint: GET https://xbl.io/api/v2/search/{gamertag}
        const searchUrl = `https://xbl.io/api/v2/search/${encodeURIComponent(GAMERTAG)}`;
        console.log(`Step 1: Search ${searchUrl}`);

        const searchRes = await httpsGet(searchUrl, { 'X-Authorization': API_KEY, 'Accept': 'application/json' });

        if (!searchRes.ok) {
            console.error('Search failed:', searchRes.status, searchRes.text());
            return;
        }

        const searchData = searchRes.json();
        console.log('Search Data Keys:', Object.keys(searchData));

        let xuid = null;
        if (searchData.people && searchData.people.length > 0) {
            xuid = searchData.people[0].xuid;
            console.log(`User found (Schema: people). XUID: ${xuid}`);
        } else if (searchData.profileUsers && searchData.profileUsers.length > 0) {
            xuid = searchData.profileUsers[0].id;
            console.log(`User found (Schema: profileUsers). XUID: ${xuid}`);
        } else {
            console.log("No user found in response.");
            console.log("Response dump:", JSON.stringify(searchData, null, 2));
            return;
        }

        // 2. Fetch Clips
        // Endpoint: GET https://xbl.io/api/v2/dvr/gameclips/{xuid}
        const clipsUrl = `https://xbl.io/api/v2/dvr/gameclips/${xuid}`;
        console.log(`Step 2: Fetch Clips ${clipsUrl}`);

        const clipsRes = await httpsGet(clipsUrl, { 'X-Authorization': API_KEY, 'Accept': 'application/json' });

        if (clipsRes.ok) {
            const clipsData = clipsRes.json();
            console.log('Clips Response Keys:', Object.keys(clipsData));

            const clips = clipsData.gameClips || clipsData.values || [];
            console.log(`Clips found: ${clips.length}`);

            if (clips.length > 0) {
                console.log('First Clip:', JSON.stringify(clips[0], null, 2));
            }
        } else {
            console.error('Clips fetch failed:', clipsRes.status);
            console.error('Response:', clipsRes.text());
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testGuideFlow();
