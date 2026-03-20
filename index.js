const puppeteer = require('puppeteer');

const EMAIL   = process.env.WEG_EMAIL;
const SENHA   = process.env.WEG_PASSWORD;
const WEBHOOK = process.env.WEBHOOK_URL;

console.log('EMAIL:', EMAIL);
console.log('SENHA:', SENHA ? '***definida***' : 'VAZIA');
console.log('WEBHOOK:', WEBHOOK);

if (!EMAIL || !SENHA || !WEBHOOK) {
  console.error('❌ Variáveis não definidas! Verifique o Environment no Easypanel.');
  process.exit(1);
}

(async () => {
  console.log('Iniciando browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  console.log('Abrindo portal WEG...');
  await page.goto('https://solarportal.weg.net', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Preenchendo email...');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.type('input[type="email"]', EMAIL);
  await page.click('button[type="submit"]');

  console.log('Preenchendo senha...');
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.type('input[type="password"]', SENHA);
  await page.click('button[type="submit"]');

  console.log('Aguardando portal carregar...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Capturando token...');
  const token = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val && val.startsWith('eyJ')) return val;
    }
    return null;
  });

  await browser.close();

  if (!token) {
    console.error('❌ Token não encontrado');
    process.exit(1);
  }

  console.log('✅ Token capturado:', token.substring(0, 30) + '...');

  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bearer: token, timestamp: new Date().toISOString() })
  });

  console.log('✅ Webhook enviado com sucesso');
})();