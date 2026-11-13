"""Styudent va normal kvantillarining mustaqil etalon jadvali (tests/engine/fixtures/quantiles.mpmath.json).

Mustaqil hisob: mpmath (ixtiyoriy aniqlikdagi arifmetika, 40 o'nlik xona), JavaScript dvigatelidan
butunlay alohida amalga oshirish. Ikki tomonlama t_P(nu):  I_y(1/2, nu/2) = P,  y = t^2/(nu + t^2)
(Abramowitz & Stegun 26.7.1). Normal: Phi^-1(p) = sqrt(2)*erfinv(2p - 1).
Ishga tushirish (bir marta, natija repoga yoziladi):
    python3 -m venv venv && venv/bin/pip install mpmath==1.4.1
    venv/bin/python3 tests/tools/gen-t-quantiles.py > tests/engine/fixtures/quantiles.mpmath.json
"""
import json
import mpmath as mp

mp.mp.dps = 40
PS = ['0.95', '0.9545', '0.99', '0.9973']
NUS = list(range(1, 201)) + [250, 500, 1000, 1438, 3416, 5000, 5279, 10000, 99999, 100000, 1000000, 1000000000]
FRAC = ['0.5', '1.5', '6.9307', '16.7', '1438.5755']


def t_two_sided(P, nu):
    """P(|T| < t) = I_y(1/2, nu/2), y = t^2/(nu + t^2)  (A&S 26.7.1, 26.5.27); t topiladi (sekant)."""
    P = mp.mpf(P); nu = mp.mpf(nu)
    g = lambda t: mp.betainc(mp.mpf(1) / 2, nu / 2, 0, t * t / (nu + t * t), regularized=True) - P
    z = mp.sqrt(2) * mp.erfinv(P)
    t0 = z * (1 + (z * z + 1) / (4 * nu))
    if nu < 3:  # og'ir dumlar: aniq yopiq formulalar yaxshi boshlang'ich nuqta beradi
        t0 = mp.tan(mp.pi * P / 2) if nu == 1 else (P * mp.sqrt(2 / (1 - P * P)) if nu == 2 else t0 * 1.5)
    return mp.findroot(g, t0, tol=mp.mpf(10) ** -35)


out = {
    'source': 'mpmath ' + mp.__version__ + ', dps = 40 (tests/tools/gen-t-quantiles.py) — mustaqil hisob',
    'normal': [{'p': p, 'z': mp.nstr(mp.sqrt(2) * mp.erfinv(2 * mp.mpf(p) - 1), 20)}
               for p in ['0.5', '0.6', '0.8', '0.9', '0.95', '0.97725', '0.975', '0.99', '0.995', '0.99865', '0.999',
                         '0.9999', '1e-10', '0.001', '0.02275', '0.3', '0.425', '0.075', '0.924', '1e-8']],
    't': [{'P': P, 'nu': nu, 't': mp.nstr(t_two_sided(P, nu), 20)} for P in PS for nu in NUS],
    'tFrac': [{'P': P, 'nu': nu, 't': mp.nstr(t_two_sided(P, nu), 20)} for P in PS for nu in FRAC],
}
print(json.dumps(out, indent=1))
