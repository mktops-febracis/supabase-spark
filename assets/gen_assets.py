#!/usr/bin/env python3
"""Gera os 2 assets fixos do e-mail CIS Online (reconstrução a partir do layout).
Se tiver os arquivos originais do designer, basta substituir mantendo os nomes."""
from PIL import Image, ImageDraw
import os

HERE = os.path.dirname(os.path.abspath(__file__))
AZUL = (0, 6, 179)          # #0006B3
AZUL_CLARO = (40, 70, 220)  # onda mais clara

# ---- cis-btn-split.png : faixa que fica ATRÁS do botão (topo azul / base branca) ----
# 2x de 360x53 => 720x106. Botão ~31px sobre o azul / ~22px sobre o branco (~60/40).
w, h = 720, 106
split = Image.new("RGB", (w, h), (255, 255, 255))
d = ImageDraw.Draw(split)
d.rectangle([0, 0, w, int(h * 0.60)], fill=AZUL)
split.save(os.path.join(HERE, "cis-btn-split.png"))

# ---- cis-hero-bg.png : fundo azul do topo com textura de ondas suaves ----
w, h = 1200, 820
hero = Image.new("RGB", (w, h), AZUL)
d = ImageDraw.Draw(hero, "RGBA")
# ondas: arcos concêntricos claros translúcidos no canto inferior direito
for i, r in enumerate(range(420, 1500, 130)):
    alpha = max(8, 42 - i * 4)
    bbox = [w - r, h - int(r * 0.72), w + r, h + int(r * 0.72)]
    d.arc(bbox, start=180, end=360, fill=(*AZUL_CLARO, alpha), width=16)
# brilho radial sutil no topo
for i, r in enumerate(range(120, 640, 90)):
    alpha = max(4, 22 - i * 3)
    bbox = [w // 2 - r, -r // 2, w // 2 + r, r]
    d.ellipse(bbox, outline=(120, 150, 255, alpha), width=10)
hero.save(os.path.join(HERE, "cis-hero-bg.png"))

print("gerados:", os.listdir(HERE))
