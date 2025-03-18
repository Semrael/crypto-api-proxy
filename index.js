const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Sağlık kontrolü
app.get('/', (req, res) => {
  res.send('Proxy Server çalışıyor! 🚀');
});

app.get('/prices', async (req, res) => {
  try {
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
      SAR: 1 / rates.SAR,
      AED: 1 / rates.AED,
      RUB: 1 / rates.RUB,
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
    
    // Altınları burada tutacağız
    const goldPrices = {};
    
    // Her ul içinde dönüyoruz
    $('div.tBody > ul').each((index, element) => {
      const altinAdi = $(element)
        .find('li.cell010.tal')
        .text()
        .trim(); // Altın adı
    
      const alisFiyati = $(element)
        .find('li.cell009')
        .eq(0) // İlk fiyat -> alış fiyatı
        .text()
        .trim()
        .replace('.', '')
        .replace(',', '.'); // Nokta-virgül dönüşümü
      
      if (altinAdi && alisFiyati) {
        goldPrices[altinAdi] = parseFloat(alisFiyati);
      }
    });
    
    console.log('✅ Altın fiyatları:', goldPrices);
    
    
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
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,solana,ripple,cardano,dogecoin,matic-network,litecoin,avalanche-2,tron&vs_currencies=try'

      );
      console.log('✅ Kripto verileri:', cryptoResponse.data);
      
      // Dinamik oluşturulmuş kripto fiyatları
      const cryptoPrices = {};
      
      coinList.forEach((coin) => {
        const data = cryptoResponse.data[coin]; // veriyi alıyoruz
        if (data && data.try !== undefined) {
          const displayName = coin.replace(/-/g, ' ').toUpperCase(); // Key adını düzenliyoruz
          cryptoPrices[displayName] = data.try;
        } else {
          console.warn(`⚠️ Veri bulunamadı: ${coin}`);
          cryptoPrices[coin.toUpperCase()] = null;
        }
      });
      

    res.json({
      exchangeRates,
      goldPrices,
      cryptoPrices
     
    });
  } catch (error) {
    console.error('⛔️ Veri çekme hatası:', error.message);
    res.status(500).json({ error: 'Veriler alınamadı!' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
