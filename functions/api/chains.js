// functions/api/chains.js
// Cloudflare Pages Functions 后端处理程序

const STORAGE_KEY = 'pond_game_data';

function getDefaultData() {
    return {
        quizSubmissions: [],
        foodChainSubmissions: []
    };
}

export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const hasKV = !!env.CHAINS_KV;

    async function loadData() {
        if (hasKV) {
            try {
                const stored = await env.CHAINS_KV.get(STORAGE_KEY, { type: 'json' });
                if (stored && Array.isArray(stored.quizSubmissions) && Array.isArray(stored.foodChainSubmissions)) {
                    return stored;
                }
            } catch (e) {
                console.error('KV read error:', e);
            }
        }
        return getDefaultData();
    }

    async function saveData(data) {
        if (hasKV) {
            try {
                await env.CHAINS_KV.put(STORAGE_KEY, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('KV write error:', e);
                return false;
            }
        }
        return false;
    }

    if (method === 'POST') {
        try {
            const body = await request.json();
            const { type, payload } = body;

            if (!type || !payload) {
                return new Response(JSON.stringify({ error: '缺少 type 或 payload' }), { status: 400, headers });
            }

            const data = await loadData();

            if (type === 'quiz') {
                data.quizSubmissions.push(payload);
                if (data.quizSubmissions.length > 500) data.quizSubmissions.shift();
            } else if (type === 'chain') {
                data.foodChainSubmissions.push(payload);
                if (data.foodChainSubmissions.length > 500) data.foodChainSubmissions.shift();
            } else {
                return new Response(JSON.stringify({ error: '未知的 type: ' + type }), { status: 400, headers });
            }

            const saved = await saveData(data);

            return new Response(JSON.stringify({
                status: 'success',
                kvEnabled: hasKV,
                saved: saved,
                counts: {
                    quiz: data.quizSubmissions.length,
                    chain: data.foodChainSubmissions.length
                }
            }), { headers });
        } catch (err) {
            return new Response(JSON.stringify({ error: '处理数据时出错: ' + err.message }), { status: 500, headers });
        }
    }

    if (method === 'GET') {
        const data = await loadData();
        return new Response(JSON.stringify({
            ...data,
            _meta: {
                kvEnabled: hasKV,
                timestamp: new Date().toISOString()
            }
        }), { headers });
    }

    if (method === 'DELETE') {
        await saveData(getDefaultData());
        return new Response(JSON.stringify({ status: 'success', message: '数据已清空', kvEnabled: hasKV }), { headers });
    }

    return new Response('Method Not Allowed', { status: 405, headers });
}
