// functions/api/chains.js
// Cloudflare Pages Functions 后端处理程序

// 注意：Cloudflare Worker 全局变量在冷启动或重新部署时会重置。
// 如果需要持久化存储，建议配置 Cloudflare KV 并在 Wrangler 中绑定为 CHAINS_KV。
let globalChains = [];

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
    let chains = globalChains;
    if (env.CHAINS_KV) {
        const stored = await env.CHAINS_KV.get('globalChains');
        if (stored) {
            chains = JSON.parse(stored);
        }
    }

    // 1. 学生提交正确食物链 (POST)
    if (method === 'POST') {
        try {
            const body = await request.json();
            const { foodChain, studentName } = body;
            
            if (foodChain && Array.isArray(foodChain)) {
                chains.push({
                    name: studentName || "学生",
                    chain: foodChain,
                    time: new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })
                });
                
                // 限制记录数量
                if (chains.length > 100) chains.shift();
                
                // 持久化存储
                if (env.CHAINS_KV) {
                    await env.CHAINS_KV.put('globalChains', JSON.stringify(chains));
                } else {
                    globalChains = chains;
                }
                
                return new Response(JSON.stringify({ status: 'success', message: '已同步到教师端' }), { headers });
            }
            return new Response(JSON.stringify({ error: '数据格式不正确' }), { status: 400, headers });
        } catch (err) {
            return new Response(JSON.stringify({ error: '无效的 JSON 数据' }), { status: 400, headers });
        }
    }

    // 2. 教师端/学生端获取所有数据 (GET)
    if (method === 'GET') {
        return new Response(JSON.stringify(chains), { headers });
    }

    // 3. 教师端清除所有数据 (DELETE)
    if (method === 'DELETE') {
        chains = [];
        if (env.CHAINS_KV) {
            await env.CHAINS_KV.put('globalChains', JSON.stringify(chains));
        } else {
            globalChains = chains;
        }
        return new Response(JSON.stringify({ status: 'success', message: '数据已清空' }), { headers });
    }

    // 默认返回 405 Method Not Allowed
    return new Response('Method Not Allowed', { status: 405, headers });
}
