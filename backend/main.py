"""
Bulanık Mantık - Diş Hekimliği Karar Destek Sistemi
FastAPI Backend

Endpoints:
  POST /api/predict  — 4 girdi al, Mamdani çıkarımı yap, sonuç döndür
  GET  /api/health   — Sunucu durumu
  GET  /api/membership-functions — Üyelik fonksiyon verilerini döndür (grafik için)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

from fuzzy_engine import predict
from membership import VARIABLES

app = FastAPI(
    title="Diş Hekimliği Bulanık Mantık Karar Destek Sistemi",
    description="Mamdani bulanık çıkarım ile dolgu/kanal tedavisi kararı",
    version="1.0.0",
)

# CORS — Next.js frontend'den gelen isteklere izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    tolerans: float = Field(..., ge=0, le=10, description="Hastanın tedaviye tolerans skoru (0-10)")
    agri: float = Field(..., ge=0, le=10, description="NRS ağrı skoru (0-10)")
    curuk: float = Field(..., ge=0, le=100, description="Çürük ilerleme yüzdesi (0-100)")
    yas: float = Field(..., ge=6, le=80, description="Hasta yaşı (6-80)")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Bulanık mantık motoru çalışıyor"}


@app.post("/api/predict")
def make_prediction(req: PredictRequest):
    try:
        result = predict(
            tolerans=req.tolerans,
            agri=req.agri,
            curuk=req.curuk,
            yas=req.yas,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/membership-functions")
def get_membership_functions():
    """
    Frontend'de üyelik fonksiyon grafiklerini çizmek için
    evren ve üyelik fonksiyon verilerini döndürür.
    """
    data = {}
    for var_name, var_data in VARIABLES.items():
        universe = var_data['universe'].tolist()
        mf_dict = {}
        for set_name, mf_values in var_data['mf'].items():
            mf_dict[set_name] = mf_values.tolist()
        data[var_name] = {
            'universe': universe,
            'mf': mf_dict,
        }
    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
