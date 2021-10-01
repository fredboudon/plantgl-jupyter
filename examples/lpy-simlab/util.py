from openalea.plantgl.all import Polyline2D, Vector2, Material

green = Material('green',(1,15,1),diffuse=10,specular=(0,0,0))

def interpolate(c1, c2, t):
    return Polyline2D([Vector2(pi1)*(1-t)+Vector2(pi2)*t for pi1,pi2 in zip(c1,c2)])

tip = 5
b = 1.5
fsize = 10

from numpy import exp

growth_logistic = lambda ttime : fsize / (1. + exp(-(ttime-tip)/b ))

def growth_rate(ttime): 
    expt = exp(-(ttime-tip)/b)
    return fsize * expt / (b* (1. + expt)**2)

