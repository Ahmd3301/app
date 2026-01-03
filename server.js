const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');
const path = require('path'); // مكتبة المسارات
const { getNewCookies } = require('./bypass');

const app = express();
app.use(cors());
app.use(express.json());

// إعداد مجلد الملفات الثابتة (لخدمة الصور)
app.use(express.static(__dirname));

let isBypassing = false;

function loadSessionData() {
    try {
        if (!fs.existsSync('cookies.json')) return null;
        const data = JSON.parse(fs.readFileSync('cookies.json'));
        const cookieString = data.cookies.map(c => `${c.name}=${c.value}`).join('; ');
        return { cookieString, userAgent: data.userAgent };
    } catch (e) { return null; }
}

async function fetchWithRetry(url, res, attempt = 1) {
    if (attempt > 3) return res.status(500).json({ error: "Failed after 3 attempts. Check /debug.png" });

    const sessionData = loadSessionData();
    if (!sessionData) {
        console.log("🍪 الكوكيز غير موجودة...");
        await performBypass();
        return fetchWithRetry(url, res, attempt + 1);
    }

    try {
        console.log(`📡 [Attempt ${attempt}] Connecting...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': sessionData.userAgent,
                'Cookie': sessionData.cookieString,
                'Referer': 'https://www.faselhds.biz/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 15000,
            validateStatus: status => status < 500
        });

        const body = response.data;
        if (typeof body === 'string' && (body.includes('Just a moment') || body.includes('challenge-platform'))) {
            throw new Error('CF_CHALLENGE');
        }

        res.json({ success: true, length: typeof body === 'string' ? body.length : 0, html: body });

    } catch (error) {
        if (error.message === 'CF_CHALLENGE' || error.response?.status === 403 || error.response?.status === 503) {
            console.log("⚠️ كشف الحماية. إعادة المحاولة...");
            await performBypass();
            return fetchWithRetry(url, res, attempt + 1);
        }
        res.status(500).json({ error: error.message });
    }
}

async function performBypass() {
    if (isBypassing) {
        while(isBypassing) await new Promise(r => setTimeout(r, 500));
        return;
    }
    isBypassing = true;
    try {
        await getNewCookies();
    } finally {
        isBypassing = false;
    }
}

app.post('/fetch', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    await fetchWithRetry(url, res);
});

// ✅ نقطة نهاية جديدة لعرض صورة الخطأ
app.get('/debug.png', (req, res) => {
    const imagePath = path.join(__dirname, 'debug_error.png');
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.send('<h1>No error image found yet. Try requesting /fetch first.</h1>');
    }
});

app.get('/', (req, res) => res.send('API Ready. Go to /debug.png to see errors.'));

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Running on port ${PORT}`));