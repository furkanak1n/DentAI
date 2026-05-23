# DentAI — Bulanık Mantık Tabanlı Diş Hekimliği Karar Destek Sistemi

DentAI, diş hekimlerine **dolgu** mu yoksa **kanal tedavisi** mi yapılacağı kararında yardımcı olan, **Mamdani bulanık çıkarım** yöntemini kullanan bir klinik karar destek sistemidir. Sistem tanı koymaz; yalnızca hekim kararını desteklemek amacıyla tasarlanmıştır.

---

## İçindekiler

- [Proje Genel Bakış](#proje-genel-bakış)
- [Mimari](#mimari)
- [Bulanık Mantık Motoru](#bulanık-mantık-motoru)
  - [Giriş Değişkenleri ve Üyelik Fonksiyonları](#giriş-değişkenleri-ve-üyelik-fonksiyonları)
  - [Çıkış Değişkeni](#çıkış-değişkeni)
  - [Kural Tabanı](#kural-tabanı)
  - [Mamdani Çıkarım Adımları](#mamdani-çıkarım-adımları)
- [API](#api)
- [Frontend](#frontend)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
  - [Backend](#backend-kurulum)
  - [Frontend](#frontend-kurulum)
- [Proje Yapısı](#proje-yapısı)
- [Teknoloji Yığını](#teknoloji-yığını)

---

## Proje Genel Bakış

DentAI, 4 hasta parametresini alarak:

| Parametre | Aralık | Açıklama |
|---|---|---|
| **Tolerans** | 0 – 10 | Hastanın tedaviye tolerans skoru |
| **Ağrı (NRS)** | 0 – 10 | Sayısal Derecelendirme Skalası ağrı skoru |
| **Çürük Derinliği** | 0 – 100% | Radyografik ilerleme yüzdesi |
| **Yaş** | 6 – 80 | Hasta yaşı |

Bu 4 girdiyi **599 bulanık kural** ile işleyip "Kanal Tedavisi Gereklilik Yüzdesi" (0-100) üretir ve aşağıdaki klinik kategoriye dönüştürür:

| Çıkış Aralığı | Kategori | Öneri |
|---|---|---|
| 0 – 30 | **Dolgu** | Dolgu tedavisi önerilir |
| 31 – 70 | **Belirsiz** | Sınırda vaka — klinik değerlendirme gerekli (Kuafaj / Ortak karar) |
| 71 – 100 | **Kanal** | Kanal tedavisi önerilir |

---

## Mimari

```
DentAI/
├── backend/          # Python · FastAPI · scikit-fuzzy
└── frontend/         # Next.js · React · TypeScript · Tailwind CSS
```

Sistem istemci-sunucu mimarisi üzerine kuruludur. Frontend, REST API üzerinden backend'e istek gönderir; backend Mamdani çıkarım motorunu çalıştırarak sonucu JSON formatında döndürür.

```
Kullanıcı Arayüzü (Next.js)
        │
        │  POST /api/predict  →  {tolerans, agri, curuk, yas}
        ▼
   FastAPI Backend
        │
        ├── Fuzzification (membership.py)
        ├── Rule Evaluation (rules.py)
        ├── Implication + Aggregation (fuzzy_engine.py)
        └── Defuzzification → crisp_output (0-100)
```

---

## Bulanık Mantık Motoru

### Giriş Değişkenleri ve Üyelik Fonksiyonları

#### Tolerans (0 – 10)
Hastanın uzun süreli bir tedaviyi tolere edip edemeyeceği değerlendirmesi.

| Küme | Tip | Parametreler |
|---|---|---|
| `edemez` | Yamuk (trapmf) | [0, 0, 2, 4] |
| `belirsiz` | Üçgen (trimf) | [3, 5, 7] |
| `edebilir` | Yamuk (trapmf) | [6, 8, 10, 10] |

#### Ağrı Profili (0 – 10, VAS/NRS)
Hastanın bildirdiği ağrı tipi ve şiddeti.

| Küme | Tip | Parametreler | Klinik Anlam |
|---|---|---|---|
| `yok` | Yamuk | [0, 0, 1, 3] | Asemptomatik |
| `kisa` | Üçgen | [2, 4, 6] | Kısa süreli uyaran ağrısı |
| `uzun` | Üçgen | [4, 6, 8] | Uzun süreli uyaran ağrısı |
| `spontan` | Yamuk | [7, 9, 10, 10] | Spontan / gece ağrısı |

#### Çürük Derinliği (0 – 100%)
Radyografik görüntüden elde edilen çürük ilerleme yüzdesi.

| Küme | Tip | Parametreler | Klinik Anlam |
|---|---|---|---|
| `mine` | Yamuk | [0, 0, 10, 25] | E1-E2 mine tabakası |
| `d1` | Üçgen | [15, 30, 50] | Yüzeysel dentin |
| `d2` | Üçgen | [40, 55, 75] | Orta dentin |
| `d3` | Üçgen | [65, 80, 95] | Derin dentin |
| `d4` | Yamuk | [85, 95, 100, 100] | Pulpa ekspozürü |

#### Yaş (6 – 80)
İyileşme potansiyeli ve kök olgunluğu değerlendirmesi için kullanılır.

| Küme | Tip | Parametreler |
|---|---|---|
| `cocuk` | Yamuk | [6, 6, 12, 20] |
| `genc` | Üçgen | [18, 27, 36] |
| `orta` | Üçgen | [34, 42, 52] |
| `ileri` | Yamuk | [48, 55, 80, 80] |

### Çıkış Değişkeni

**Karar — Kanal Tedavisi Gereklilik Yüzdesi (0 – 100)**

| Küme | Tip | Parametreler |
|---|---|---|
| `dolgu` | Yamuk | [0, 0, 15, 35] |
| `belirsiz` | Üçgen | [25, 50, 75] |
| `kanal` | Yamuk | [65, 85, 100, 100] |

### Kural Tabanı

Toplam **599 kural** klinik literatüre dayalı olarak belirlenmiştir:

| Kural Tipi | Kural Sayısı | Örnek Kural |
|---|---|---|
| Tekli (1 değişken) | 16 | `IF ağrı = spontan THEN karar = kanal` |
| İkili AND | 95 | `IF tolerans = edemez AND ağrı = uzun THEN karar = kanal` |
| Üçlü AND | 248 | `IF tolerans = edebilir AND ağrı = uzun AND çürük = d2 THEN karar = kanal` |
| Dörtlü AND | 240 | `IF tolerans = edemez AND ağrı = spontan AND çürük = d4 AND yaş = ileri THEN karar = kanal` |

Motor aktif olarak yalnızca **dörtlü kuralları** (`FOURTH_ORDER_RULES`) değerlendirir. Kural kombinasyonları şu değişken çiftlerini kapsar: TA, TC, TY, AC, AY, CY (ikili), TAC, TAY, TCY, ACY (üçlü), TACY (dörtlü).

### Mamdani Çıkarım Adımları

```
Crisp Girdiler  →  [1] Fuzzification  →  Üyelik Dereceleri
                →  [2] Rule Evaluation (T-norm: min, w = min(antecedents))
                →  [3] Implication (min-kırpma: implied = min(w, mf_output))
                →  [4] Aggregation (max birleştirme: agg = max(tüm implied))
                →  [5] Defuzzification (Centroid / Ağırlık Merkezi)
                →  Crisp Çıkış (0-100)
```

**Ateşleme gücü (w):** Her kuralın antecedent'lerinin minimum üyelik derecesi alınarak hesaplanır (T-norm: min).

**Defuzzification:** Centroid (ağırlık merkezi) yöntemi kullanılır. Hiçbir kural ateşlenmezse sistem %50 (Belirsiz) döndürür.

---

## API

Backend varsayılan olarak `http://localhost:8000` adresinde çalışır.

### `GET /api/health`
Sunucu durumunu kontrol eder.

**Yanıt:**
```json
{
  "status": "ok",
  "message": "Bulanık mantık motoru çalışıyor"
}
```

---

### `POST /api/predict`
Mamdani çıkarımını çalıştırır ve tedavi kararı döndürür.

**İstek Gövdesi:**
```json
{
  "tolerans": 7.5,
  "agri": 3.0,
  "curuk": 45.0,
  "yas": 28
}
```

| Alan | Tip | Aralık | Açıklama |
|---|---|---|---|
| `tolerans` | float | 0 – 10 | Tedaviye tolerans skoru |
| `agri` | float | 0 – 10 | NRS ağrı skoru |
| `curuk` | float | 0 – 100 | Çürük ilerleme yüzdesi |
| `yas` | float | 6 – 80 | Hasta yaşı |

**Yanıt:**
```json
{
  "inputs": { "tolerans": 7.5, "agri": 3.0, "curuk": 45.0, "yas": 28 },
  "fuzzified": {
    "tolerans": { "edemez": 0.0, "belirsiz": 0.0, "edebilir": 0.75 },
    "agri": { "yok": 0.0, "kisa": 0.5, "uzun": 0.5, "spontan": 0.0 },
    "curuk": { "mine": 0.0, "d1": 0.0, "d2": 1.0, "d3": 0.0, "d4": 0.0 },
    "yas": { "cocuk": 0.0, "genc": 0.9, "orta": 0.1, "ileri": 0.0 }
  },
  "fired_rules_count": 12,
  "fired_rules": [ ... ],
  "crisp_output": 24.57,
  "interpretation": {
    "category": "Dolgu",
    "message": "Dolgu Tedavisi Önerilir",
    "severity": "low"
  },
  "dominant_rule": {
    "id": "TACY001",
    "w": 0.5,
    "antecedent": [["tolerans","edebilir"],["agri","kisa"],["curuk","d2"],["yas","genc"]],
    "consequent_set": "dolgu",
    "aciklama": null
  },
  "distribution": {
    "dolgu": 82.5,
    "belirsiz": 17.5,
    "kanal": 0.0
  }
}
```

---

### `GET /api/membership-functions`
Tüm değişkenlerin evren ve üyelik fonksiyon verilerini döndürür (grafik çizimi için).

---

## Frontend

Next.js ile geliştirilmiş tek sayfalık uygulama aşağıdaki bileşenleri içerir:

- **Slider Girdi Paneli** — 4 parametre için kaydırmalı giriş çubukları; her slider boş başlar ve tüm değerler girilmeden analiz başlatılamaz.
- **Üyelik Derecesi Badge'leri** — Analiz sonrası her slider altında, girilen değerin ilgili bulanık kümelerdeki üyelik dereceleri görüntülenir.
- **Sonuç Kartı** — Kanal tedavisi gereklilik yüzdesi, renk kodlu ilerleme çubuğu ve klinik öneri mesajı.
- **Dominant Kural Paneli** — En yüksek ateşleme gücüne sahip kural ve w-ağırlıklı dolgu/belirsiz/kanal dağılım grafikleri.
- **Ateşlenen Kurallar Tablosu** — Tüm ateşlenen kurallar ID, antecedent, ateşleme gücü (w) ve çıkış kümesiyle sıralı olarak listelenir.

**Renk Kodlaması:**

| Sonuç | Renk |
|---|---|
| Dolgu (low) | Yeşil (Emerald) |
| Belirsiz (medium) | Turuncu (Amber) |
| Kanal (high) | Kırmızı (Red) |

---

## Kurulum ve Çalıştırma

### Backend Kurulum

Python 3.10+ gereklidir.

```bash
cd backend

# Sanal ortam oluştur (önerilir)
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# Bağımlılıkları yükle
pip install -r requirements.txt

# Sunucuyu başlat
python main.py
# veya
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Sunucu `http://localhost:8000` adresinde çalışmaya başlar.  
Swagger UI: `http://localhost:8000/docs`

### Frontend Kurulum

Node.js 18+ gereklidir.

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

**Ortam Değişkeni (isteğe bağlı):**

Farklı bir backend adresi kullanmak için `.env.local` dosyası oluşturun:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Proje Yapısı

```
DentAI/
│
├── backend/
│   ├── main.py            # FastAPI uygulaması ve API endpoint'leri
│   ├── fuzzy_engine.py    # Mamdani çıkarım motoru (fuzzify, evaluate, aggregate, defuzzify)
│   ├── membership.py      # Tüm üyelik fonksiyonları ve VARIABLES sözlüğü
│   ├── rules.py           # 599 kuraldan oluşan kural tabanı (FOURTH_ORDER_RULES)
│   └── requirements.txt   # Python bağımlılıkları
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx       # Ana uygulama sayfası (slider, analiz, sonuç, kural tablosu)
│   │   ├── layout.tsx     # Header, footer ve genel sayfa düzeni
│   │   └── globals.css    # Tailwind CSS ve özel animasyonlar (float, slide-up, pulse)
│   ├── package.json
│   ├── next.config.mjs
│   └── tsconfig.json
│
└── Rapor ve Sunum/
    ├── DentAI - Karar Destek Sistemi.pdf
    └── DentAI - Karar Destek Sistemi.pptx
```

---

## Teknoloji Yığını

### Backend
| Teknoloji | Versiyon | Kullanım |
|---|---|---|
| Python | 3.10+ | Temel dil |
| FastAPI | güncel | REST API çerçevesi |
| scikit-fuzzy | güncel | Bulanık mantık kütüphanesi |
| NumPy | güncel | Sayısal hesaplama |
| Pydantic | güncel | Veri doğrulama |
| Uvicorn | güncel | ASGI sunucu |

### Frontend
| Teknoloji | Versiyon | Kullanım |
|---|---|---|
| Next.js | 16.2.3 | React çerçevesi |
| React | 19.2.4 | UI kütüphanesi |
| TypeScript | 5+ | Tip güvenliği |
| Tailwind CSS | 4 | Stillendirme |
| Geist | güncel | Tipografi |

---

> **Uyarı:** Bu sistem tanı koyma amacı taşımaz. Yalnızca klinik karar destek aracı olarak tasarlanmıştır. Nihai tedavi kararı her zaman yetkili bir diş hekimine aittir.

---

**Geliştirici: Furkan AKIN**
