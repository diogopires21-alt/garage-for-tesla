"""Lettering "TESLA" desenhado com traços simples (no estilo das letras da Tesla, sem copiar nenhum ficheiro de imagem):
T com a barra separada do pé, E de três barras, S em degraus, L, e A em "Λ" sem a barra do meio.
Usado por wallconnector.py e supercharger.py: as letras ficam coladas à superfície (raio a partir da frente, −Y)."""
import bmesh
from mathutils import Vector

def glyphs(ST):
    """traços de cada letra numa caixa 1×1; ST = grossura do traço (fração da altura)"""
    return {
        'T': [('r', 0, 1 - ST, 1, 1), ('r', .5 - ST / 2, 0, .5 + ST / 2, 1 - ST * 1.6)],
        'E': [('r', 0, 1 - ST, 1, 1), ('r', 0, .5 - ST / 2, 1, .5 + ST / 2), ('r', 0, 0, 1, ST)],
        'S': [('r', 0, 1 - ST, 1, 1), ('r', 0, .5, ST, 1 - ST), ('r', 0, .5 - ST / 2, 1, .5 + ST / 2), ('r', 1 - ST, ST, 1, .5), ('r', 0, 0, 1, ST)],
        'L': [('r', 0, 0, ST, 1), ('r', 0, 0, 1, ST)],
        'A': [('q', (0, 0), (ST * 1.15, 0), (.5 + ST * .58, 1), (.5 - ST * .58, 1)), ('q', (1 - ST * 1.15, 0), (1, 0), (.5 + ST * .58, 1), (.5 - ST * .58, 1))],
    }

def build(bm, text, cx, z0, h, wl, gap, surf_y, out=0.0007, seg=4, stroke=0.16):
    """Junta ao bmesh as letras de `text`, centradas em x=cx, com a base a z0, altura h, largura de cada letra wl e
    espaço gap. surf_y(x, z) dá o y da superfície (frente virada para −Y); as letras ficam `out` à frente dela."""
    G = glyphs(stroke)
    total = len(text) * wl + (len(text) - 1) * gap
    x0 = cx - total / 2
    for k, ch in enumerate(text):
        lx = x0 + k * (wl + gap)
        for g in G[ch]:
            if g[0] == 'r':
                _, a, b, c, d = g
                quad = [(a, b), (c, b), (c, d), (a, d)]
            else:
                quad = list(g[1:])
            # subdivide para seguir a curva da superfície
            P = lambda u, v: (quad[0][0] + (quad[1][0] - quad[0][0]) * u + (quad[3][0] - quad[0][0]) * v + (quad[0][0] - quad[1][0] + quad[2][0] - quad[3][0]) * u * v,
                              quad[0][1] + (quad[1][1] - quad[0][1]) * u + (quad[3][1] - quad[0][1]) * v + (quad[0][1] - quad[1][1] + quad[2][1] - quad[3][1]) * u * v)
            grid = []
            for i in range(seg + 1):
                row = []
                for j in range(2):
                    px, pz = P(i / seg, j)
                    x, z = lx + px * wl, z0 + pz * h
                    row.append(bm.verts.new((x, surf_y(x, z) - out, z)))
                grid.append(row)
            for i in range(seg):
                bm.faces.new((grid[i][0], grid[i + 1][0], grid[i + 1][1], grid[i][1]))
    return bm
