const express = require('express')
const axios = require('axios')
const cors = require('cors')
const cheerio = require('cheerio')

const app = express()
app.use(cors())

const PORT = process.env.PORT || 3000

//cache değişkenleri
let cache = null
let lastFetchTime = 0
const CACHE_DURATION = 300000 //5dakika boyunca veriyi cache'de tutuyoruz

//sağlık kontrolü için basit endpoint
app.get('/', (req, res) => {
  res.send('Proxy server aktif')
})

//fiyatları döndüren  endpoint
app.get('/prices', async (req, res) => {
  const now = Date.now()

  //cache  kontrolü
  if (cache && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('cache verisi döndü')
    return res.json(cache)
  }

  try {
    console.log('yeni veriler çekiliyor')

    const prices = await fetchAllPrices()

    //cache güncelle
    cache = prices
    lastFetchTime = now

    res.json(prices)
  } catch (error) {
    console.error('veri çekme hatası', error.message)
    res.status(500).json({ error: 'veriler alınamadı' })
  }
})

//fiyat verilerini çeken ana fonksiyon
async function fetchAllPrices() {
  // döviz verilerini çek
  console.log('döviz verileri çekiliyor')
  const forexResponse = await axios.get(
    'https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP,JPY,CHF,CAD,AUD,CNY,SAR,AED,RUB,KRW,INR,MXN,BRL'
  )
  console.log('döviz verileri alındı', forexResponse.data)

  const rates = forexResponse.data.rates

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
  }

  console.log('try bazlı döviz kurları', exchangeRates)

  //ltın fiyatlarını çek
  console.log('bigpara altın fiyatları çekiliyor')
  const response = await axios.get('https://bigpara.hurriyet.com.tr/altin/', {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })
  console.log('bigpara html alındı')

  const $ = cheerio.load(response.data)

  const goldPrices = {}

  $('div.tBody > ul').each((index, element) => {
    const altinAdi = $(element).find('li.cell010.tal').text().trim()
    const alisFiyati = $(element)
      .find('li.cell009')
      .eq(0)
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.')

    if (altinAdi && alisFiyati) {
      goldPrices[altinAdi] = parseFloat(alisFiyati)
    }
  })

  console.log('altın fiyatları', goldPrices)

  //kripto fiyatlarını çek
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
  ]

  console.log('kripto verileri çekiliyor')
  const cryptoResponse = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,solana,ripple,cardano,dogecoin,polygon,litecoin,avalanche-2,tron&vs_currencies=try'
  )

  console.log('kripto verileri alındı', cryptoResponse.data)

  const cryptoPrices = {}

  coinList.forEach((coin) => {
    const data = cryptoResponse.data[coin]
    if (data && data.try !== undefined) {
      const displayName = coin.replace(/-/g, ' ').toUpperCase()
      cryptoPrices[displayName] = data.try
    } else {
      console.warn('veri bulunamadı', coin)
      cryptoPrices[coin.toUpperCase()] = null
    }
  })

  return {
    exchangeRates,
    goldPrices,
    cryptoPrices
  }
}

app.listen(PORT, () => {
  console.log(`sunucu çalışıyor http://localhost:${PORT}`)
})
