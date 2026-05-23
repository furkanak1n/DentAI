"""
Bulanık Mantık - Diş Hekimliği Karar Destek Sistemi
Üyelik Fonksiyonları (Membership Functions)

4 Giriş Değişkeni + 1 Çıkış Değişkeni
Tüm parametreler klinik literatüre dayalı olarak belirlenmiştir.
"""

import numpy as np
import skfuzzy as fuzz

# ============================================
# EVREN TANIMLARI (Universe of Discourse)
# ============================================

# Tolerans: 0-10 arası slider (Hastanın tedaviye tolerans skoru)
tolerans_universe = np.arange(0, 10.01, 0.1)

# Ağrı Profili: 0-10 NRS (Sayısal Derecelendirme Skalası)
agri_universe = np.arange(0, 10.01, 0.1)

# Çürük Derinliği: 0-100 (Radyografik ilerleme yüzdesi)
curuk_universe = np.arange(0, 100.01, 0.5)

# Yaş: 6-80 (Hasta yaşı)
yas_universe = np.arange(6, 80.01, 0.5)

# Karar (Çıkış): 0-100 (Kanal Tedavisi Gereklilik Yüzdesi)
karar_universe = np.arange(0, 100.01, 0.5)


# ============================================
# GİRİŞ 1: TOLERANS (0-10)
# ============================================
# Edemez (Düşük Tolerans): Sol uç yamuk
# Belirsiz (Orta Tolerans): Orta üçgen
# Edebilir (Yüksek Tolerans): Sağ uç yamuk

tolerans_mf = {
    'edemez':   fuzz.trapmf(tolerans_universe, [0, 0, 2, 4]),
    'belirsiz': fuzz.trimf(tolerans_universe, [3, 5, 7]),
    'edebilir': fuzz.trapmf(tolerans_universe, [6, 8, 10, 10]),
}


# ============================================
# GİRİŞ 2: AĞRI PROFİLİ (0-10, VAS/NRS)
# ============================================
# Yok (Asemptomatik): Sol uç yamuk
# Kısa Süreli Uyaran Ağrısı: Üçgen
# Uzun Süreli Uyaran Ağrısı: Üçgen
# Spontan / Gece Ağrısı: Sağ uç yamuk

agri_mf = {
    'yok':     fuzz.trapmf(agri_universe, [0, 0, 1, 3]),
    'kisa':    fuzz.trimf(agri_universe, [2, 4, 6]),
    'uzun':    fuzz.trimf(agri_universe, [4, 6, 8]),
    'spontan': fuzz.trapmf(agri_universe, [7, 9, 10, 10]),
}


# ============================================
# GİRİŞ 3: ÇÜRÜK DERİNLİĞİ (0-100, %)
# ============================================
# Mine (E1-E2): Sol uç yamuk - Sadece mine tabakası
# D1 (Yüzeysel Dentin): Üçgen
# D2 (Orta Dentin): Üçgen
# D3 (Derin Dentin): Üçgen
# D4 (Pulpa Ekspozürü): Sağ uç yamuk

curuk_mf = {
    'mine': fuzz.trapmf(curuk_universe, [0, 0, 10, 25]),
    'd1':   fuzz.trimf(curuk_universe, [15, 30, 50]),
    'd2':   fuzz.trimf(curuk_universe, [40, 55, 75]),
    'd3':   fuzz.trimf(curuk_universe, [65, 80, 95]),
    'd4':   fuzz.trapmf(curuk_universe, [85, 95, 100, 100]),
}


# ============================================
# GİRİŞ 4: YAŞ (6-80)
# ============================================
# Çocuk/Ergen: Sol uç yamuk (6-18)
# Genç Yetişkin: Üçgen (19-35)
# Orta Yaş: Üçgen (35-50)
# İleri Yaş: Sağ uç yamuk (50+)

yas_mf = {
    'cocuk': fuzz.trapmf(yas_universe, [6, 6, 12, 20]),
    'genc':  fuzz.trimf(yas_universe, [18, 27, 36]),
    'orta':  fuzz.trimf(yas_universe, [34, 42, 52]),
    'ileri': fuzz.trapmf(yas_universe, [48, 55, 80, 80]),
}


# ============================================
# ÇIKIŞ: KARAR (0-100, Kanal Gereklilik %)
# ============================================
# Dolgu: Sol uç yamuk (Düşük yüzde - sinir güvende)
# Belirsiz/Sınırda: Üçgen (Orta yüzde - kuafaj/ortak karar)
# Kanal: Sağ uç yamuk (Yüksek yüzde - sinir enfekte)

karar_mf = {
    'dolgu':    fuzz.trapmf(karar_universe, [0, 0, 15, 35]),
    'belirsiz': fuzz.trimf(karar_universe, [25, 50, 75]),
    'kanal':    fuzz.trapmf(karar_universe, [65, 85, 100, 100]),
}


# ============================================
# YARDIMCI: Tüm değişkenleri tek dict'te topla
# ============================================

VARIABLES = {
    'tolerans': {
        'universe': tolerans_universe,
        'mf': tolerans_mf,
    },
    'agri': {
        'universe': agri_universe,
        'mf': agri_mf,
    },
    'curuk': {
        'universe': curuk_universe,
        'mf': curuk_mf,
    },
    'yas': {
        'universe': yas_universe,
        'mf': yas_mf,
    },
    'karar': {
        'universe': karar_universe,
        'mf': karar_mf,
    },
}
