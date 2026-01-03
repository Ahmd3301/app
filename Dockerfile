# استخدام نسخة Debian Bullseye (الأكثر استقراراً لكروم)
FROM node:20-bullseye-slim

# 1. تثبيت Chrome, Xvfb, والخطوط (Fonts)
# إضافة الخطوط (fonts-liberation, fonts-noto) ضرورية جداً ليقرأ المتصفح النصوص
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    xvfb \
    dbus \
    dbus-x11 \
    libasound2 \
    fonts-liberation \
    fonts-noto \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. إعداد مجلد العمل
WORKDIR /app

# 3. نقل ملكية المجلد للمستخدم node (موجود افتراضياً)
RUN chown -R node:node /app

# 4. نسخ ملفات الحزمة
COPY --chown=node:node package*.json ./

# 5. التثبيت باستخدام المستخدم node (لتجنب مشاكل الصلاحيات لاحقاً)
USER node
RUN npm install

# 6. نسخ باقي الملفات
COPY --chown=node:node . .

# 7. إنشاء ملف الكوكيز للتأكد من وجوده
RUN touch cookies.json

# 8. متغيرات البيئة
ENV PORT=7860
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV DISPLAY=:99

# 9. تشغيل السيرفر مع Xvfb
CMD ["xvfb-run", "--auto-servernum", "--server-args='-screen 0 1280x1024x24'", "node", "server.js"]