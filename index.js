const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 📌 CACHE Sistemini Tanımlıyoruz
let cache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 saniye cache süresi (istediğin gibi artırılabilir)

// Sağlık kontrolü
app.get('/', (req, res) => {
  res.send('Proxy Server çalışıyor! 🚀');
});

// PRICES endpointi
app.get('/prices', async (req, res) => {
  const now = Date.now();

  // ✅ Eğer cache varsa ve süre dolmamışsa cache döndür
  if (cache && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('🔁 Cache verisi döndü');
    return res.json(cache);
  }

  try {
    console.log('➡️ Yeni veriler çekiliyor...');

    const prices = await fetchAllPrices();

    // Cache güncelle
    cache = prices;
    lastFetchTime = now;

    res.json(prices);

  } catch (error) {
    console.error('⛔️ Veri çekme hatası:', error.message);
    res.status(500).json({ error: 'Veriler alınamadı!' });
  }
});

// 🔧 TÜM VERİLERİ ÇEKEN ANA FONKSİYON
async function fetchAllPrices() {
  // ➡️ Döviz verileri çekiliyor
  console.log('➡️ Döviz verileri çekiliyor...');
  const forexResponse = await axios.get(
    'https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP,JPY,CHF,CAD,AUD,CNY,SAR,AED,RUB,KRW,INR,MXN,BRL'
  );
  console.log('✅ Döviz verileri:', forexResponse.data);

  const rates = forexResponse.data.rates;

  const exchangeRates = {
    USD: 1 / rates.USD,
    EUR: 1 / rates.EUR,
    GBP: 1 / rates.GBP,
    JPY: 1 / rates.JPY,
    CHF: 1 / rates.CHF,
    CAD: 1 / rates.CAD,
    AUD: 1 / rates.AUD,
    CNY: 1 / rates.CNY,
    SAR: rates.SAR ? 1 / rates.SAR : null,
    AED: rates.AED ? 1 / rates.AED : null,
    RUB: rates.RUB ? 1 / rates.RUB : null,
    KRW: 1 / rates.KRW,
    INR: 1 / rates.INR,
    MXN: 1 / rates.MXN,
    BRL: 1 / rates.BRL
  };

  console.log('✅ TRY bazlı döviz kurları:', exchangeRates);

  // ➡️ BigPara Altın fiyatları çekiliyor
  console.log('➡️ BigPara Altın fiyatları çekiliyor...');
  const response = await axios.get('https://bigpara.hurriyet.com.tr/altin/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('✅ BigPara HTML çekildi!');

  const $ = cheerio.load(response.data);

  const goldPrices = {};

  $('div.tBody > ul').each((index, element) => {
    const altinAdi = $(element)
      .find('li.cell010.tal')
      .text()
      .trim();

    const alisFiyati = $(element)
      .find('li.cell009')
      .eq(0)
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.');

    if (altinAdi && alisFiyati) {
      goldPrices[altinAdi] = parseFloat(alisFiyati);
    }
  });

  console.log('✅ Altın fiyatları:', goldPrices);

  // ➡️ Kripto fiyatları çekiliyor
  const coinList = [
    'bitcoin',
    'ethereum',
    'binancecoin',
    'tether',
    'solana',
    'ripple',
    'cardano',
    'dogecoin',
    'polygon',
    'litecoin',
    'avalanche-2',
    'tron'
  ];

  console.log('➡️ Kripto verileri çekiliyor...');
  const cryptoResponse = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,solana,ripple,cardano,dogecoin,polygon,litecoin,avalanche-2,tron&vs_currencies=try'
  );

  console.log('✅ Kripto verileri:', cryptoResponse.data);

  const cryptoPrices = {};

  coinList.forEach((coin) => {
    const data = cryptoResponse.data[coin];
    if (data && data.try !== undefined) {
      const displayName = coin.replace(/-/g, ' ').toUpperCase();
      cryptoPrices[displayName] = data.try;
    } else {
      console.warn(`⚠️ Veri bulunamadı: ${coin}`);
      cryptoPrices[coin.toUpperCase()] = null;
    }
  });

  return {
    exchangeRates,
    goldPrices,
    cryptoPrices
  };
}

app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
