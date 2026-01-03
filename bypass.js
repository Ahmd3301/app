const { connect } = require('puppeteer-real-browser');
const fs = require('fs');

async function getNewCookies() {
    console.log("🛡️ [Bypass] جاري بدء عملية تجاوز Cloudflare...");
    let browser = null;

    try {
        const { browser: connectedBrowser, page } = await connect({
            headless: false,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--window-size=1280,1024'
            ],
            turnstile: true, // محاولة حل Turnstile تلقائياً
            connectOption: { defaultViewport: { width: 1280, height: 1024 } }
        });
        
        browser = connectedBrowser;

        console.log("🌐 الانتقال للموقع...");
        await page.goto('https://www.faselhds.biz/', {
            waitUntil: 'networkidle2', // الانتظار حتى يهدأ الاتصال
            timeout: 5000
        });

        // --- محاكاة السلوك البشري ---
        console.log("🖱️ محاكاة حركة الماوس...");
        try {
            // تحريك الماوس في منتصف الشاشة
            await page.mouse.move(200, 200);
            await page.mouse.move(300, 300, { steps: 10 });
            await page.mouse.move(400, 200, { steps: 20 });
            
            // النقر في مكان عشوائي آمن (لتركيز الصفحة)
            await page.mouse.click(100, 100);
        } catch (e) { console.log("⚠️ فشل تحريك الماوس (غير مؤثر)"); }

        // --- محاولة النقر على إطارات Cloudflare (Turnstile) ---
        console.log("🔍 البحث عن التحدي (Checkbox)...");
        try {
            // البحث عن جميع الإطارات ومحاولة النقر عليها إذا كانت تحتوي على تحدي
            const frames = page.frames();
            for (const frame of frames) {
                const url = frame.url();
                if (url.includes('cloudflare') || url.includes('turnstile')) {
                    console.log("⚡ تم اكتشاف إطار حماية، محاولة النقر...");
                    try {
                        const checkbox = await frame.$('input[type="checkbox"], #challenge-stage, .ctp-checkbox-label');
                        if (checkbox) {
                            await checkbox.click();
                            console.log("👆 تم النقر على التحدي!");
                        } else {
                            // النقر في وسط الإطار كحل بديل
                            const box = await frame.boundingBox();
                            if (box) {
                                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                            }
                        }
                    } catch (err) { }
                }
            }
        } catch (e) { }

        console.log("⏳ انتظار الكوكيز...");
        
        // البحث عن الكوكيز لمدة 30 ثانية
        let foundCookies = false;
        let cookies = [];
        
        for (let i = 0; i < 8; i++) {
            cookies = await page.cookies();
            const cfClearance = cookies.find(c => c.name === 'cf_clearance');
            
            if (cfClearance) {
                console.log("✅ تم العثور على كوكيز Cloudflare!");
                foundCookies = true;
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (foundCookies) {
            const userAgent = await page.evaluate(() => navigator.userAgent);
            const dataToSave = { cookies: cookies, userAgent: userAgent };
            fs.writeFileSync('cookies.json', JSON.stringify(dataToSave, null, 2));
            console.log("💾 تم حفظ البيانات بنجاح.");
            await browser.close();
            return true;
        } else {
            console.log("❌ [Failed] فشل التجاوز.");
            
            // أخذ لقطة شاشة للتشخيص
            console.log("📸 جاري التقاط صورة للمشكلة...");
            await page.screenshot({ path: 'debug_error.png', fullPage: true });
            
            // حفظ HTML الصفحة أيضاً
            const html = await page.content();
            fs.writeFileSync('debug_error.html', html);
            
            await browser.close();
            return false;
        }

    } catch (e) {
        console.log("⚠️ [Error]: " + e.message);
        if (browser) await browser.close();
        return false;
    }
}

module.exports = { getNewCookies };
