// functions/api/chains.js
// Cloudflare Pages Functions 后端处理程序

// 注意：Cloudflare Worker 全局变量在冷启动或重新部署时会重置。
// 如果需要持久化存储，建议配置 Cloudflare KV 并在 Wrangler 中绑定为 CHAINS_KV。
let globalData = {
    quizSubmissions: [],
    foodChainSubmissions: []
};

export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;
    const url = new URL(request.url);

    // 允许跨域 (CORS)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 处理预检请求 (Preflight Request)
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    // 尝试从 KV 获取数据 (如果配置了)
    // 使用 cacheTtl: 0 绕过边缘缓存，确保读取最新数据
    let data = globalData;
    if (env.CHAINS_KV) {
        const stored = await env.CHAINS_KV.get('globalData', { cacheTtl: 0 });
        if (stored) {
            data = JSON.parse(stored);
        }
    }

    // 1. 学生提交数据 (POST)
    if (method === 'POST') {
        try {
            const body = await request.json();
            const { type, payload } = body;
            
            if (type === 'quiz' && payload) {
                data.quizSubmissions.push(payload);
                if (data.quizSubmissions.length > 200) data.quizSubmissions.shift();
            } else if (type === 'chain' && payload) {
                data.foodChainSubmissions.push(payload);
                if (data.foodChainSubmissions.length > 200) data.foodChainSubmissions.shift();
            } else {
                return new Response(JSON.stringify({ error: '无效的数据类型或载荷' }), { status: 400, headers });
            }
            
            // 持久化存储
            if (env.CHAINS_KV) {
                await env.CHAINS_KV.put('globalData', JSON.stringify(data));
            } else {
                globalData = data;
            }
            
            return new Response(JSON.stringify({ status: 'success', message: '数据已同步' }), { headers });
        } catch (err) {
            return new Response(JSON.stringify({ error: '处理数据时出错' }), { status: 500, headers });
        }
    }

    // 2. 获取所有数据 (GET)
    if (method === 'GET') {
        return new Response(JSON.stringify(data), { headers });
    }

    // 3. 教师端清除所有数据 (DELETE)
    if (method === 'DELETE') {
        data = {
            quizSubmissions: [],
            foodChainSubmissions: []
        };
        if (env.CHAINS_KV) {
            await env.CHAINS_KV.put('globalData', JSON.stringify(data));
        } else {
            globalData = data;
        }
        return new Response(JSON.stringify({ status: 'success', message: '数据已清空' }), { headers });
    }

    // 默认返回 405 Method Not Allowed
    return new Response('Method Not Allowed', { status: 405, headers });
}
