# RSynthesis küresel ağırlıklandırma deneyi

Hedef, EC JRC/UNEP yıllık tablosundaki **ölçülen kalıcı ve mevsimsel yüzey suyu alanının toplamı**. Kaynak 1984–2018 arasında 266 ülke/bölge ve 292 HydroBASIN seviye 3 havzası içeriyor. Test, pozitif gözlem ve yeterli geçmiş olan satırları kullanıyor. Projenin mevcut kapsam eşiği uygulanıyor. Ülke sonuçlarında gözlenmemiş su alanı tahmininin ölçülen alana oranı %5 ile sınırlanınca sonuçlar ayrıca raporlanıyor. [EC JRC/UNEP veri indirmeleri](https://www.sdg661.app/data-products/data-downloads)

## Model

Yeni panel modeli, son güvenilir alanı alıp logaritmik bir değişim uygular. Değişimi bütün uygun ülkelerin geçmiş örneklerinden Ridge regresyonu öğrenir. Girdiler yakın yıllardaki su değişimi, mevsimsel su payı, gözlem kapsamı, son ölçümün yaşı ve iklimli sürümde tahmin kesiminden önceki ERA5 yağış/sıcaklık ile NOAA ONI. İklim göstergelerinin yerel normalleri de yalnız geçmişten hesaplanır. Eksik yerel iklim için eksik değer göstergesi kullanılır. Havzalarda ayrı bir panel eğitilir. Mevcut Bayesçi karşılaştırma yalnız havzada mevcut olan trend ve ENSO'yu kullanabilir. [Copernicus ERA5](https://climate.copernicus.eu/about-data-and-methods) · [NOAA ONI](https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v5/)

| Çıktı sütunu | Yöntem |
| --- | --- |
| `persistence`, `median3`, `dampedTrend` | Son alan, son üç geçerli alanın medyanı, sönümlü eğilim |
| `bayesian` | Mevcut Bayesçi motor. İklim örnekleme havuzu ve uydu serisi her test yılının kesiminde durur. |
| `waterPanel`, `climatePanel` | Ortak panel modeli, iklim girdileri kapalı ve açık |
| `equal`, `equalSelected` | Bütün adaylar eşit ağırlıklı veya geçmişte ilk üçe giren aynı adaylar eşit ağırlıklı |
| `learned` | Bölgenin ve aynı ölçekteki diğer bölgelerin önceki yüzde hatalarına göre ilk üç aday seçilir. Ağırlıklar geçmiş hata ile ters orantılıdır. |
| `wapeBlend` | Son sekiz yıldaki doğrulama tahminlerinde WAPE en düşük olacak şekilde %25'lik adımlarla aranan ağırlıklar |

## 2013–2018 sonucu

| Ölçek | Ufuk | Son alan WAPE | Geçmiş yüzde hatasına göre karışım | En düşük WAPE veren aday |
| --- | ---: | ---: | ---: | --- |
| Dünya toplamı, 6 yıl | 1 yıl | %2,41 | %2,27 | İklim paneli, %2,16 |
| 200 ülke/bölge, 1.127 satır | 1 yıl | %3,81 | %3,80 | İklim paneli, %3,77 |
| 251 havza, 1.460 satır | 1 yıl | %4,07 | %4,05 | Eşit ağırlık, %3,90 |
| Dünya toplamı, 6 yıl | 2 yıl | %2,98 | %2,87 | Geçmiş yüzde hatasına göre karışım, %2,87 |
| 194 ülke/bölge, 1.104 satır | 2 yıl | %5,18 | %5,02 | Geçmiş yüzde hatasına göre karışım, %5,02 |
| 248 havza, 1.444 satır | 2 yıl | %5,30 | %5,03 | Eşit ağırlık, %4,96 |

WAPE, toplam mutlak hatanın toplam gözlenen alana oranıdır. Dünya toplamında farklı bölgelerin sapmaları birbirini dengeleyebilir. Ülkelerde en düşük WAPE'yi veren iklim panelinin MAPE'si %6,41 ve satırların %44,45'i %3 hata sınırında. Bu panelin %5 kapsam eşiğiyle WAPE'si %3,72. Geçmiş WAPE'yi doğrudan en aza indiren karışım ülke testinde %3,94 verdi.

Her yeni test yılı için eğitim, geçmiş hata hesapları ve girdi ölçeklemesi yalnız tahmin kesimine kadar ilerler. Bir yıllık ufuk önceki yılın tamamlanmış gözlem ve iklim verilerinin hazır olduğunu varsayar. İki yıllık ufuk bunları bir yıl daha geriden alır. Bugün eldeki veri ürünleriyle geriye dönük testtir. Yılların tek tek ilk yayımlandıkları sürümler yeniden kurulmadı. Komşu bölgeler ve yıllar istatistiksel olarak bağımsız kabul edilmedi. Okavango deneyi farklı alan ve ölçüm tanımı kullandığı için bu yüzdelerle doğrudan karşılaştırılamaz. Havza ölçeğinde debi, yukarı havza yağışı, buharlaşma, kar erimesi, baraj işletimi ve su çekimi için eşlenmiş tarihsel girdiler bu sürümde mevcut değil.

## Tekrar çalıştırma

```powershell
node experiments/global-water/backtest.mjs
```

`observatory` klasöründen Node.js 24 ile çalıştırılır. İlk çalıştırma HydroBASIN CSV'sini yerel önbelleğe indirir. Program ülke ve havza tahminlerini, kullanılan ağırlıkları ve her satırın veri kesimini `results/predictions.csv` dosyasına yazar. `results/report.json` giriş dosyalarının SHA-256 değerlerini, WAPE/MAE/RMSE/MAPE sonuçlarını ve %3 sınırını karşılayan satır oranlarını içerir. Betik kontrol amacıyla gelecekteki uydu ve iklim verilerini değiştirerek geçmiş tahminlerin aynı kaldığını denetler.
