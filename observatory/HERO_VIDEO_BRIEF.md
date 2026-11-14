# Hero Video Brief: "From Orbit to the Okavango" (15 s)

Bu dosya, ana sayfanın sağındaki üç boyutlu kürenin yerine geçecek 15 saniyelik videonun prodüksiyon dosyasıdır. Video üretim araçlarına verilecek promptlar İngilizcedir, çünkü bu araçlar İngilizce talimatı daha iyi uyguluyor. Sitedeki tüm yazılar da zaten İngilizce.

Oynatma kodu hazır: [components/HeroVideo.tsx](components/HeroVideo.tsx). Dosyalar `public/assets/hero/` klasörüne konup `HERO_VIDEO_READY = true` yapılana kadar sitede mevcut küre gösterilmeye devam eder.

---

## 1. Kare ve sahne düzeni (sayfa ile eşleşme)

**Master format:** 1920×1080, 16:9, 30 fps, 15.0 s (450 kare), sessiz. Bütün koordinatlar bu karedeki piksellerdir.

Video, masaüstünde hero bölümünün **tamamını** kaplar (`object-fit: cover`). Sol taraf CSS maskesiyle karartılır, çünkü büyük başlık orada durur. Bu yüzden kare üç bölgeye ayrılır:

| Bölge | x aralığı | İçerik | Kural |
|---|---|---|---|
| **A. Başlık bölgesi** | 0–960 px | Sayfadaki "Today Okavango / Tomorrow Earth." başlığı, açıklama ve buton | Neredeyse boş, koyu uzay. Parlak yıldız, bulut veya parlama yok. Maske bu bölgeyi zaten gizler. |
| **B. Geçiş bölgesi** | 960–1250 px | Maskenin yumuşak kenarı | Düşük kontrast. Kürenin sol kenarı buraya taşabilir. |
| **C. Sahne bölgesi** | 1250–1920 px | Küre, parlama, Okavango, kırmızı sınır | Bütün hikâye burada anlatılır. |

Kareyi sayfanın öteki öğeleri de kesiyor:

- **Header:** y 0–100. Bu bandı koyu ve sakin tutun, menü yazıları üstünde durur.
- **Alt bar:** y 1040–1080. Koordinat şeridi (`01 / OKAVANGO DELTA` … `19.3° S 22.9° E`).
- **Sağ alt açıklama:** yaklaşık x 1500–1790, y 830–900 ("FIELD OF VIEW / SOUTHERN AFRICA"). Bu alanda ince detay olmasın.
- **Mobil kırpma:** 1000×1000 kare, x 880–1880, y 40–1040. Küre ve son kare bu kutudan taşmamalı.

**Renk paleti (sitenin değişkenleri):**

- Uzay arka planı: `#050d0c` (siyah değil, çok koyu yeşil-siyah)
- Atmosfer kenar ışığı: `#4ca5b1` (teal)
- Vurgu: `#c9e6a0` (lime)
- Okavango ışığı: saf beyaz `#FFFFFF`, hafif soğuk hale
- Sınır: kırmızı `#FF4436` (videoya gömülmez, kod çizer, bkz. §4)

**Işık yönü:** Güneş sol üst önden gelir. Sitedeki üç boyutlu sahnenin ışığı da aynı yönde (`directionalLight [-3,3,5]`). Gece tarafı sağ altta, çok koyu ama tamamen siyah değil.

---

## 2. Bölge

- **Okavango Deltası, Botsvana.** Hedef nokta 19.3° S, 22.9° E.
- **Bizim analiz alanımız (AOI):** 22.0–23.8° E, 18.3–20.0° S. Kaynak: `edev-data/data/meta.json`. Kırmızı sınır bu dikdörtgendir; 45° perspektifte yamuk görünür.
- **Mevsim görüntüsü:** Taşkın zirvesi (Temmuz–Eylül). Koyu, parlak su kanalları; yeşil papirüs ve sazlık; adalarda ağaç kümeleri; deltanın dışında kum rengi Kalahari.

---

## 3. Saniye saniye çekim listesi

Kamera hareketi tek, kesintisiz bir plan gibi hissettirmeli. Kesme yok, flaş geçiş yok.

### Çekim 1 — Yörünge (00.0 – 03.0 s)
- **Kare 0, sayfa açılır açılmaz görünen poster karedir.** Bu kare tek başına da güzel durmalı.
- Küre merkezi (1400, 540), çapı 700 px. Kürenin tamamı karede ve üstte, altta en az 150 px boşluk var.
- Kamera 12° G enleminin üstünde; güney Afrika rahat görünüyor.
- Küre gerçek yönünde, batıdan doğuya yavaşça döner. Ekranda yüzey soldan sağa kayar. Ekran merkezindeki boylam 0–3 s arasında 55° D'den 35° D'ye iner. Botsvana sol yarıdan merkeze doğru gelir.
- İnce teal atmosfer halkası, gerçekçi bulut örtüsü, seyrek ve **sabit** yıldızlar. Yıldız titreşimi ve film greni yok, çünkü sıkıştırmayı bozuyor.

### Çekim 2 — Sinyal (03.0 – 04.2 s)
- 3.0 s'de Okavango, gündüz tarafında iyi aydınlanmış bir konuma gelir. Kare içinde yaklaşık (1330, 600).
- **3.2 s:** O noktadan beyaz bir ışık doğar. 0.4 s içinde küçük, keskin bir çekirdeğe ve yumuşak bir haleye ulaşır. Halenin çapı küre çapının en fazla %12'si olsun.
- **3.6 s:** Noktadan tek bir ince radar halkası dışa yayılır ve 0.6 s'de söner. Bu halka sitedeki radar motifine bağlanır.
- **4.2 s:** Işık sakin, sabit bir işaret ışığına iner ve sona kadar Okavango'yu işaretler.

### Çekim 3 — Yaklaşma (04.2 – 07.5 s)
- Kamera yumuşak bir ivmeyle (ease-in) küreye doğru ilerler. Küre büyür ve kare kenarlarından taşmaya başlar.
- Büyürken dönüş de sürer. Dönüş, işaret ışığını kare içinde **(1390, 600)** noktasına taşıyacak şekilde ayarlanır ve ışık bu noktada kilitli kalır. Bütün zoom bu noktaya yapılır.
- 7.5 s'de küre kenarı artık görünmez. Ekranda Afrika'nın güneyi, ufukta atmosfer kavisi var.

### Çekim 4 — Bulutlar (07.5 – 09.8 s)
- Kamera atmosfere girer. Önce ince sirrus katmanları, sonra kümülüs bulutları kameranın yanından hızla geçer (paralaks).
- Bulutların en yoğun anı 8.6 s'dir ve sahne bölgesinin (C) yaklaşık %70'ini kaplar. **Ekran tamamen beyaza dönmemeli.** Bulutların parlaklığı %70'i geçmemeli ve sol üçte bir gölgede kalmalı; aksi halde beyaz başlık yazısı okunmaz.
- Bulutların arasından beyaz işaret ışığı sezilir; konumu yine (1390, 600).

### Çekim 5 — Ortaya çıkış (09.8 – 12.6 s)
- Bulutlar açılır. Kamera yavaşlar (ease-out) ve dik bakıştan **45° eğik bakışa** döner.
- Kamera kuzeye bakar. Deltanın yelpazesi önde, besleyici kol (Panhandle) sol üstte ufka doğru uzanır.
- İşaret ışığı yere yaklaştıkça sönerek araziye karışır. 11.5 s'de tamamen biter.
- **12.6 s:** Kamera tamamen durur. AOI alanı sahne bölgesini doldurur. Hedef köşe noktaları:
  - uzak sol (1110, 300), uzak sağ (1680, 300)
  - yakın sağ (1800, 900), yakın sol (980, 900)
- Ufuk çizgisi y ≈ 170 civarında, hafif pusla. Header bandı (y 0–100) gökyüzü ve pus olarak sakin kalır.

### Çekim 6 — Sınır ve yazı (12.6 – 15.0 s)
- **Videoda hiçbir şey hareket etmez; görüntü sabit durur.** Bunu kurgu aşamasında son kareyi uzatarak yapın (§6, `tpad`).
- Kod üstüne şunları çizer:
  - 12.6–13.8 s: kırmızı AOI sınırı uzak sol köşeden başlayıp saat yönünde kendini çizer. Hafif kırmızı parlama ve %7 kırmızı dolgu.
  - 13.6–14.4 s: sınırın üst kenarının ortasında, y ≈ 262'de **"LET'S EXPLORE"** yazısı aşağıdan yukarı belirir.
- **15.0 s:** Video biter ve son karede kalır. Sınır ve yazı da ekranda kalır.

---

## 4. Neden sınır ve yazı videoya gömülmüyor?

- **Yapay zekâ video araçları yazıyı bozuyor.** Harfler kayıyor, "LETS EXPOLRE" gibi hatalar çıkıyor.
- **Kırmızı çizgi gerçek koordinata oturmuyor.** Araç sınırı "yaklaşık" bir yere çizer. Bizim AOI'miz ise jüriye gösterdiğimiz gerçek veri alanı.
- **Kodla çizim her ekranda keskin kalır.** SVG'nin koordinat sistemi videoyla aynı (1920×1080, `slice` = `cover`), bu yüzden her ekran oranında üst üste oturur.
- Video bitmeden kullanıcı aşağı kaydırırsa sınır ve yazı hiç görünmez. Bu, istenen davranışla uyumlu.

**Video çıktıktan sonra yapılacak tek iş:** Son kareyi açın, AOI'nin 4 köşesinin piksel koordinatlarını okuyun ve `HeroVideo.tsx` içindeki `AOI` ile `LABEL` değerlerini güncelleyin.

AOI köşelerini kendiniz yerleştirmek için Google Earth'ta 22.0/23.8° D ve 18.3/20.0° G çizgilerini kullanın. Ya da sınırı kurgu programında son karenin üstüne çizip koordinatları oradan alın.

---

## 5. Video üretim promptları

Yapay zekâ video araçları çoğunlukla tek seferde 5–10 s üretir. Bu yüzden 15 s'lik video **iki üretim + bir sabit bekleme** olarak kurgulanır. Profesyonel yöntem **anahtar kare (keyframe)** kullanmaktır: önce durağan görselleri üretip onaylayın, sonra aralarını videoyla doldurun.

### Adım 0 — Anahtar kareler (görsel üretimi)

**K0 — açılış karesi, aynı zamanda poster:**
```
Photorealistic NASA-style view of planet Earth from space, 16:9, 1920x1080. The globe is placed right of center, its center at 73% of frame width and 50% of height, diameter about 65% of frame height. The left 50% of the frame is empty deep space with color #050d0c (very dark green-black), with only a few tiny, sparse, dim stars and no bright objects. Camera above 12 degrees south latitude, centered on 50 degrees east longitude, so southern Africa and Madagascar are visible on the left-center of the disc, with the Indian Ocean on the right. Sunlight from the upper left; soft night terminator on the lower right. Thin teal atmospheric rim glow (#4ca5b1). Realistic cloud cover, true-color land: Kalahari ochre, green Zambezi basin. Calm, premium, cinematic, high dynamic range, no lens flare, no text, no grain.
```

**K2 — kapanış karesi:**
```
Photorealistic oblique aerial view at a 45-degree angle of the Okavango Delta, Botswana, at peak flood season, 16:9, 1920x1080. Camera looks north; the fan-shaped delta fills the right 60% of the frame, the panhandle river channel extends toward the upper-left horizon. Dark, mirror-like meandering water channels and lagoons, lush green papyrus and reed beds, island tree clusters, sandy ochre Kalahari outside the wetland. Horizon at about 16% from the top with soft atmospheric haze and a calm pale sky. The left 40% of the frame is darker and lower in contrast (shadowed terrain, haze). Late-morning light from the left. Realistic satellite-photo texture, no text, no borders, no markers, no grain.
```
K2 için bir öneri: Gerçek uydu görüntüsünü (NASA GIBS MODIS/Sentinel-2 true color) referans görsel olarak verin. Böylece son kare gerçek deltaya benzer, bu da projenin doğruluk ilkesiyle uyumlu.

### Adım 1 — Video A (0 – 7.5 s): başlangıç karesi K0
```
Cinematic space shot, locked-off camera for the first 3 seconds. The Earth rotates slowly and realistically west to east, so the surface drifts from left to right. Southern Africa moves toward the center of the disc. At second 3, a single small, pure-white point of light ignites on the Okavango Delta in northern Botswana (19.3 S, 22.9 E): it swells into a crisp core with a soft halo, one thin radar ring ripples outward and fades, then it settles into a steady glowing beacon. From second 4, the camera smoothly accelerates toward the beacon while the globe keeps turning, keeping the beacon locked at the same screen position, right of center and slightly below the middle. The globe grows until its edge leaves the frame, revealing the curved horizon of southern Africa. Left side of the frame stays dark empty space throughout. Smooth, weighty, documentary-grade camera move, no shake, no lens flare, no text, no film grain, stable sparse stars.
```

### Adım 2 — Video B (7.5 – 12.6 s): başlangıç karesi A'nın son karesi, bitiş karesi K2
```
Continuous dive from orbit down toward the white beacon over the Okavango Delta. The camera passes through thin cirrus layers and then fast-moving cumulus clouds with strong parallax. The clouds are softly lit and never fill the frame completely white, and the left third stays shadowed. The clouds part, the camera decelerates and tilts from looking straight down to a 45-degree oblique view looking north, and the white beacon fades into the landscape. The flooded Okavango Delta is revealed: dark winding channels, green papyrus, island tree clusters, ochre Kalahari sand. The camera comes to a complete, gentle stop exactly on the final frame. Photorealistic, smooth ease-out, no shake, no text, no borders, no grain.
```

### Negatif prompt (destekleyen araçlarda)
```
text, letters, watermark, logo, borders, map lines, UI, lens flare, film grain, noise, flicker, camera shake, fisheye, cartoon, oversaturated, neon, blown-out white frame, hard cuts, morphing continents, wrong geography
```

### Kalite kontrol listesi
- [ ] Kare 0 tek başına poster olarak güzel mi, küre (1400, 540) civarında mı?
- [ ] Sol yarı her saniyede koyu mu? Başlık okunuyor mu?
- [ ] Beyaz ışık doğru yerde mi (güney Afrika iç kesimi, Namibya sınırına yakın kuzey Botsvana)?
- [ ] A ile B arasındaki geçiş fark ediliyor mu? Fark ediliyorsa 6–8 kare çapraz geçiş (crossfade) yapın.
- [ ] Bulut anında ekran beyaza dönüyor mu?
- [ ] Son karede delta tanınabilir mi? Kanallar ve yelpaze şekli doğru mu?
- [ ] Kıtalarda bükülme veya şekil değişimi var mı?

---

## 6. Dosya boyutu, format ve anlık yükleme

**Hedef:** Sayfa açılır açılmaz poster görünsün (≈50 KB), video arkadan insin ve sayfanın ilk yüklenmesini yavaşlatmasın.

| Dosya | Boyut | Kullanıldığı yer | Hedef ağırlık |
|---|---|---|---|
| `hero-1080.webm` (VP9) / `.mp4` (H.264) | 1920×1080 | Geniş / retina ekranlar | ≤ 2.5 MB / ≤ 3.5 MB |
| `hero-720.webm` / `.mp4` | 1280×720 | Laptoplar | ≤ 1.3 MB / ≤ 1.8 MB |
| `hero-m.webm` / `.mp4` | 720×720 (kırpılmış) | Telefon (≤720 px) | ≤ 1.0 MB / ≤ 1.3 MB |
| `hero-poster.webp` | 1920×1080 | İlk kare, anında görünür | ≤ 60 KB |
| `hero-poster-m.webp` | 720×720 | Mobil ilk kare | ≤ 35 KB |

Kodun yükleme sırası:

1. Poster `<img fetchpriority="high">` olarak sayfanın HTML'inde gelir ve anında görünür.
2. Video kaynağı sayfa yüklendikten **sonra** eklenir. Tarayıcı WebM/VP9 destekliyorsa WebM'i, desteklemiyorsa MP4'ü seçer. Ekran genişliğine göre en hafif dosyayı alır.
3. Hareket azaltma tercihi açıksa, Veri Tasarrufu açıksa ya da bağlantı 2G ise video hiç indirilmez; sadece poster gösterilir.

Videonun ilk karesi posterle aynı olduğu için geçiş görünmez.

### ffmpeg komutları (master: `master.mp4`, 12.6 s'de biten kurgu)

Son kareyi 2.4 s dondurup 15 s'ye tamamlamak ve ses izini atmak için hepsinde aynı filtre kullanılır:
```bash
HOLD="tpad=stop_mode=clone:stop_duration=2.4,fps=30"

# Masaüstü 1080
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1920:1080:flags=lanczos" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -g 30 -pix_fmt yuv420p hero-1080.webm
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1920:1080:flags=lanczos" -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -g 30 -movflags +faststart hero-1080.mp4

# Laptop 720
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1280:720:flags=lanczos" -c:v libvpx-vp9 -crf 37 -b:v 0 -row-mt 1 -g 30 -pix_fmt yuv420p hero-720.webm
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1280:720:flags=lanczos" -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -g 30 -movflags +faststart hero-720.mp4

# Mobil (kırpma, HeroVideo.tsx'teki VIEW_MOBILE ile aynı olmalı)
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1920:1080,crop=1000:1000:880:40,scale=720:720:flags=lanczos" -c:v libvpx-vp9 -crf 37 -b:v 0 -row-mt 1 -g 30 -pix_fmt yuv420p hero-m.webm
ffmpeg -i master.mp4 -an -vf "$HOLD,scale=1920:1080,crop=1000:1000:880:40,scale=720:720:flags=lanczos" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -g 30 -movflags +faststart hero-m.mp4

# Posterler (kare 0)
ffmpeg -i master.mp4 -frames:v 1 -vf "scale=1920:1080" -c:v libwebp -quality 72 hero-poster.webp
ffmpeg -i master.mp4 -frames:v 1 -vf "scale=1920:1080,crop=1000:1000:880:40,scale=720:720" -c:v libwebp -quality 72 hero-poster-m.webp

# AOI köşelerini ölçmek için son kare
ffmpeg -sseof -0.1 -i hero-1080.mp4 -frames:v 1 last-frame.png
```

Ayar notları:

- **`+faststart`:** MP4'ün dizin bilgisini dosyanın başına koyar. Video, dosyanın tamamı inmeden oynamaya başlar.
- **`-g 30`:** Her saniyede bir anahtar kare koyar. Daha hızlı başlar, dosya boyutu biraz artar.
- Hedef ağırlık aşılırsa: önce `-crf` değerini 2 artırın, sonra bulut bölümünü sadeleştirin. Bulut ve gren, sıkıştırmanın en pahalı kısmıdır.

---

## 7. Oynatma kuralları (HeroVideo.tsx'te uygulandı)

| Durum | Davranış |
|---|---|
| Sayfa açılır, hero görünür | Poster anında görünür, video sessiz başlar. Başlık, açıklama, buton, alt bar ve sağ alt açıklama bulanıklaşarak çekilir; video tam kare oynar (sol karartma da kalkar). |
| Kullanıcı biraz kaydırır, hero'nun bir kısmı hâlâ görünür | Video oynamaya devam eder, yazılar gizli kalır. |
| Video bitmeden hero ekrandan **tamamen** çıkar | Video o karede **duraklar** (indirilen kısım korunur), yazılar ve sol karartma geri gelir. Yukarı dönüldüğünde yazılar duran karenin üstünde okunur; sağ altta "▶ Resume the flight" düğmesi videoyu kaldığı yerden sürdürür. |
| Video sonuna kadar izlenir | 12.6 s'den itibaren kırmızı AOI sınırı ve "LET'S EXPLORE" çizilir. Video bitince karartma soldan süzülerek gelir, ardından yazılar sırayla (üst etiket → bilgi şeridi → başlığın iki satırı → açıklama/buton → alt bar) aşağıdan yükselip bulanıktan netleşerek döner. |
| Sayfa doğrudan `#observatory` adresiyle açılır | Hero hiç görünmediği için video hiç oynamaz, yazılar posterin üstünde durur. |
| Video 4 saniyede başlayamazsa (yavaş bağlantı) | Vazgeçilir; poster ve yazılar gösterilir. |
| Hareket azaltma / Veri Tasarrufu / 2G | Video indirilmez, sadece duran küre görünür. |
| Tarayıcı otomatik oynatmayı engeller (iOS Düşük Güç Modu) | Duran küre görünür. |
| Video dosyası bulunamaz veya bozuk | Otomatik olarak eski üç boyutlu küreye dönülür. |

"İlk açılış" şu an **her sayfa yüklemesi** olarak sayılıyor. Videonun her ziyaretçiye ömründe bir kez gösterilmesi istenirse, `localStorage`'a tek bir kayıt eklemek yeterli.

## 8. Devreye alma

1. §6'daki 8 dosyayı `observatory/public/assets/hero/` klasörüne koyun.
2. Son kareden AOI köşelerini ölçüp `HeroVideo.tsx` içindeki `AOI` ve `LABEL` değerlerine yazın.
3. `HERO_VIDEO_READY = true` yapın.
4. `npm run dev` ile şu senaryoları deneyin:
   - Videoyu izleyin.
   - Yarıya kadar kaydırın.
   - Tamamen aşağı kaydırıp geri gelin.
   - Telefon genişliğinde açın.
