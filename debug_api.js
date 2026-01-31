
const https = require('https');

const API_KEY = 'bbe7ec95-5bc2-4846-8000-f89e54142612';
const GAMERTAG = 'mnk ibra';

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

async function testFetch() {
    try {
        console.log(`Searching for ${GAMERTAG}...`);

        // 1. Search User
        const searchUrl = `https://xbl.io/api/v2/friends/search?gt=${encodeURIComponent(GAMERTAG)}`;
        const searchRes = await httpsGet(searchUrl, { 'X-Authorization': API_KEY, 'Accept': 'application/json' });

        if (!searchRes.ok) {
            console.error('Search failed:', searchRes.status, searchRes.text());
            return;
        }

        const searchData = searchRes.json();
        const user = searchData.profileUsers ? searchData.profileUsers[0] : null;

        if (!user) {
            console.error('User not found');
            return;
        }

        const xuid = user.id;
        console.log(`Found XUID: ${xuid}`);

        // 2. Fetch Clips
        const clipsUrl = `https://xbl.io/api/v2/dvr/gameclips/${xuid}`;
        const clipsRes = await httpsGet(clipsUrl, { 'X-Authorization': API_KEY, 'Accept': 'application/json' });

        if (clipsRes.ok) {
            const clipsData = clipsRes.json();

            // Check first clip
            const clips = clipsData.gameClips || clipsData.values || [];
            if (clips.length > 0) {
                const clip = clips[0];
                console.log('--- First Clip Sample ---');
                console.log('ID:', clip.gameClipId);
                console.log('Thumbnails:', JSON.stringify(clip.thumbnails, null, 2));

                if (clip.gameClipUris && clip.gameClipUris.length > 0) {
                    console.log('Video URI:', clip.gameClipUris[0].uri);
                } else {
                    console.log('No Video URIs found');
                }
            } else {
                console.log('No clips found');
            }
        } else {
            console.error('Clips fetch failed:', clipsRes.status);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testFetch();
