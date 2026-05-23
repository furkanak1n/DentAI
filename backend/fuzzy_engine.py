"""
Bulanık Mantık - Diş Hekimliği Karar Destek Sistemi
Mamdani Bulanık Çıkarım Motoru

Mamdani'nin 4 Adımı:
  1. Fuzzification — crisp girdileri üyelik derecelerine dönüştür
  2. Rule Evaluation — her kuralın ateşleme gücünü (w) bul (T-norm: min)
  3. Implication — w'yu çıkış kümesine uygula (min-kırpma)
  4. Aggregation — tüm kural çıktılarını birleştir (max)
  + Defuzzification — centroid yöntemiyle crisp çıkış üret
"""

import numpy as np
import skfuzzy as fuzz

from membership import VARIABLES
from rules import FOURTH_ORDER_RULES


def fuzzify(variable_name: str, crisp_value: float) -> dict[str, float]:
    """
    ADIM 1: Fuzzification
    Crisp bir girdi değerini, ilgili değişkenin tüm bulanık kümelerindeki
    üyelik derecelerine dönüştürür.

    Örnek: fuzzify('agri', 7.5) -> {'yok': 0.0, 'kisa': 0.0, 'uzun': 0.3, 'spontan': 0.7}
    """
    var = VARIABLES[variable_name]
    universe = var['universe']
    memberships = {}

    for set_name, mf_values in var['mf'].items():
        # interp_membership: evren üzerindeki üyelik fonksiyonundan
        # verilen crisp değerin üyelik derecesini interpole eder
        degree = float(fuzz.interp_membership(universe, mf_values, crisp_value))
        memberships[set_name] = degree

    return memberships


def evaluate_rules(fuzzified_inputs: dict[str, dict[str, float]]) -> list[dict]:
    """
    ADIM 2: Rule Evaluation
    Her kuralın ateşleme gücünü (firing strength, w) hesaplar.

    - Tekli kurallar: w = ilgili kümenin üyelik derecesi
    - Çoklu kurallar (AND): w = min(tüm antecedent üyelik dereceleri) [T-norm: min]
    """
    fired_rules = []

    for rule in FOURTH_ORDER_RULES:
        antecedent = rule['antecedent']
        operator = rule['operator']
        consequent = rule['consequent']

        # Her antecedent'in üyelik derecesini topla
        degrees = []
        for var_name, set_name in antecedent:
            degree = fuzzified_inputs[var_name][set_name]
            degrees.append(degree)

        # Ateşleme gücünü hesapla
        if operator is None or operator == 'AND':
            # T-norm: min
            w = min(degrees)
        else:
            # OR durumu (bu projede kullanılmıyor ama genişletilebilir)
            w = max(degrees)

        if w > 0:  # Sadece ateşlenen kuralları kaydet
            fired_rules.append({
                'id': rule['id'],
                'w': w,
                'antecedent': antecedent,  # [(var, set), ...]
                'consequent_set': consequent[1],  # 'dolgu', 'belirsiz', veya 'kanal'
                'aciklama': rule.get('aciklama'),  # Adım 5'te eklenecek
            })

    return fired_rules


def implicate_and_aggregate(fired_rules: list[dict]) -> np.ndarray:
    """
    ADIM 3 + 4: Implication (min-kırpma) + Aggregation (max)

    Adım 3 - Implication:
      Her ateşlenen kural için, kuralın ateşleme gücü (w) ile
      çıkış kümesinin üyelik fonksiyonunu min ile kırpar.
      Yani: implied(x) = min(w, mf_çıkış(x))

    Adım 4 - Aggregation:
      Tüm kırpılmış çıkış kümelerini max operatörü ile birleştirir.
      Yani: aggregated(x) = max(tüm implied çıkışlar)
    """
    karar_universe = VARIABLES['karar']['universe']
    karar_mf = VARIABLES['karar']['mf']

    # Başlangıçta sıfır agregasyon
    aggregated = np.zeros_like(karar_universe)

    for rule in fired_rules:
        w = rule['w']
        output_set = rule['consequent_set']

        # ADIM 3: Min-kırpma (Implication)
        # Çıkış kümesinin üyelik fonksiyonunu w ile kırp
        implied = np.fmin(w, karar_mf[output_set])

        # ADIM 4: Max ile birleştir (Aggregation)
        aggregated = np.fmax(aggregated, implied)

    return aggregated


def defuzzify(aggregated: np.ndarray) -> float:
    """
    Defuzzification — Centroid (Ağırlık Merkezi) Yöntemi

    Agregasyon sonucu oluşan birleşik bulanık kümenin ağırlık merkezini hesaplar.
    Bu, crisp (kesin) çıkış değerini verir: Kanal Tedavisi Gereklilik Yüzdesi (0-100)
    """
    karar_universe = VARIABLES['karar']['universe']

    # Eğer hiçbir kural ateşlenmediyse (tüm agregasyon sıfır)
    if np.sum(aggregated) == 0:
        return 50.0  # Belirsiz döndür

    return float(fuzz.defuzz(karar_universe, aggregated, 'centroid'))


def compute_dominance(fired_rules: list[dict]) -> dict:
    """
    Sonucu en çok hangi kuralın belirlediğini ve ateşlenen kuralların
    çıkış kümelerine (dolgu/belirsiz/kanal) göre w-ağırlıklı dağılımını döndürür.

    - dominant_rule: en yüksek ateşleme gücüne (w) sahip kural
    - distribution: her çıkış kümesinin toplam w'ya oranı (%)
    """
    if not fired_rules:
        return {
            'dominant_rule': None,
            'distribution': {'dolgu': 0.0, 'belirsiz': 0.0, 'kanal': 0.0},
        }

    dominant = max(fired_rules, key=lambda r: r['w'])

    total_w = sum(r['w'] for r in fired_rules)
    distribution = {'dolgu': 0.0, 'belirsiz': 0.0, 'kanal': 0.0}
    for r in fired_rules:
        distribution[r['consequent_set']] += r['w']

    if total_w > 0:
        distribution = {k: round(v / total_w * 100, 2) for k, v in distribution.items()}

    return {
        'dominant_rule': {
            'id': dominant['id'],
            'w': round(dominant['w'], 4),
            'antecedent': dominant['antecedent'],
            'consequent_set': dominant['consequent_set'],
            'aciklama': dominant.get('aciklama'),
        },
        'distribution': distribution,
    }


def interpret_result(crisp_output: float) -> dict:
    """
    Crisp çıkış değerini klinik yoruma dönüştürür.
    """
    if crisp_output <= 30:
        category = "Dolgu"
        message = "Dolgu Tedavisi Önerilir"
        severity = "low"
    elif crisp_output <= 70:
        category = "Belirsiz"
        message = "Sınırda Vaka — Klinik Değerlendirme Gerekli (Kuafaj / Ortak Karar)"
        severity = "medium"
    else:
        category = "Kanal"
        message = "Kanal Tedavisi Önerilir"
        severity = "high"

    return {
        "category": category,
        "message": message,
        "severity": severity,
    }


def predict(tolerans: float, agri: float, curuk: float, yas: float) -> dict:
    """
    Ana tahmin fonksiyonu. 4 crisp girdi alır, Mamdani çıkarımı yapar,
    sonucu döndürür.

    Args:
        tolerans: 0-10 arası (hastanın tedaviye tolerans skoru)
        agri: 0-10 arası (NRS ağrı skoru)
        curuk: 0-100 arası (çürük ilerleme yüzdesi)
        yas: 6-80 arası (hasta yaşı)

    Returns:
        dict: Tüm adımların detayları ve nihai karar
    """
    # ADIM 1: Fuzzification
    fuzzified = {
        'tolerans': fuzzify('tolerans', tolerans),
        'agri': fuzzify('agri', agri),
        'curuk': fuzzify('curuk', curuk),
        'yas': fuzzify('yas', yas),
    }

    # ADIM 2: Rule Evaluation
    fired_rules = evaluate_rules(fuzzified)

    # ADIM 3 + 4: Implication + Aggregation
    aggregated = implicate_and_aggregate(fired_rules)

    # Defuzzification
    crisp_output = defuzzify(aggregated)

    # Yorumlama
    interpretation = interpret_result(crisp_output)

    # Dominant kural + ateşleme dağılımı
    dominance = compute_dominance(fired_rules)

    return {
        "inputs": {
            "tolerans": tolerans,
            "agri": agri,
            "curuk": curuk,
            "yas": yas,
        },
        "fuzzified": fuzzified,
        "fired_rules_count": len(fired_rules),
        "fired_rules": fired_rules,
        "crisp_output": round(crisp_output, 2),
        "interpretation": interpretation,
        "dominant_rule": dominance['dominant_rule'],
        "distribution": dominance['distribution'],
    }
