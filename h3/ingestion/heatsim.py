"""
https://en.wikipedia.org/wiki/Heat_equation
https://en.wikipedia.org/wiki/Finite_difference

Heat equation:
du/dt = alpha * d²u/dx²

Finite difference, solved:
u_x,t+dt = u_x,t - dt * alpha * (u_x+dx,t - 2 u_x,t + u_x-dx,t) / (dx²)
"""


#%%
import numpy as np
import matplotlib.pyplot as plt

#%%

dx = 0.01
dt = 0.01

tRoom = 20
def tOutside(t):
    return np.sin(0.05 * t) * 5 + 10

timeSteps = 500
spaceSteps = 1000

wallStart = 300
wallEnd = 700

temp0 = np.zeros((spaceSteps))
temp0[:wallStart] = tRoom
temp0[wallStart:wallEnd] = tOutside(0)
temp0[wallEnd:] = tOutside(0)

alpha = np.zeros((spaceSteps))
alpha[:wallStart] = 1
alpha[wallStart:wallEnd] = 0.1
alpha[wallEnd:] = 1


def temp(tempBefore, timeStepNew):
    
    tempShiftR      = np.zeros(tempBefore.shape)
    tempShiftR[1:]  = tempBefore[:-1]
    tempShiftR[0]   = tRoom

    tempShiftL      = np.zeros(tempBefore.shape)
    tempShiftL[:-1] = tempBefore[1:]
    tempShiftL[-1]  = tOutside(timeStepNew - 1)

    tempNew = tempBefore - dt * alpha * (tempShiftL - 2 * tempBefore + tempShiftR) / (dx**2)

    tempNew[0]  = tRoom
    tempNew[-1] = tOutside(timeStepNew)

    return tempNew


temps = [temp0]
for t in range(1, timeSteps):
    tempLast = temps[t-1]
    tempNew = temp(tempLast, t)
    temps.append(tempNew)




# %%
tempsClipped = np.clip(temps, tOutside(0), tRoom)
plt.imshow(temps)
# %%
plt.plot(tempsClipped[1])
# <-- has numerical instability. Try

# %%
