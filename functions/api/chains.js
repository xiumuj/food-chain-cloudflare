// functions/api/chains.js (Cloudflare Pages Function)
// 注意：Cloudflare 实例是隔离且短暂的，内存变量 globalChains 会频繁重置。
// 如果需要持久化，建议连接 Cloudflare KV 数据库。
let globalChains = [];

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 处理跨域 (CORS)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 请求 (Preflight)
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // 1. 学生提交正确食物链 (POST)
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { foodChain, studentName } = body;
            
            if (foodChain && Array.isArray(foodChain)) {
                globalChains.push({
                    name: studentName || "学生",
                    chain: foodChain,
                    time: new Date().toLocaleTimeString('zh-CN')
                });
                // 限制内存中的数据量
                if (globalChains.length > 500) globalChains.shift();
                
                return new Response(JSON.stringify({ status: 'success', message: '已同步到教师端' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({ error: '数据格式不正确' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: '无效的 JSON 数据' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // 2. 教师端清除所有数据 (DELETE)
    if (request.method === 'DELETE') {
        globalChains = [];
        return new Response(JSON.stringify({ status: 'success', message: '所有数据已清空' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 3. 获取所有数据 (GET)
    if (request.method === 'GET') {
        return new Response(JSON.stringify(globalChains), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response('Method Not Allowed', { status: 405 });
}
