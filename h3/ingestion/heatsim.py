#%%
"""
https://en.wikipedia.org/wiki/Heat_equation
    especially at subsection "Accounting for radiative loss"
https://en.wikipedia.org/wiki/Finite_difference
https://de.wikipedia.org/wiki/Runge-Kutta-Verfahren

Heat equation:
du/dt = alpha * d²u/dx²

Finite difference:
du/dt = alpha * (u_x+dx,t - 2 u_x,t + u_x-dx,t) / (dx²)

RungeKutta: 
k1 = dudt(u,                          t        )
k2 = dudt(u + dt/2 * k1,              t + dt/2 )
k3 = dudt(u - dt * k1 + 2 * dt * k2,  t + dt   )
u_t+dt = u_t + dt * (1/6 * k1 + 4/6 * k2 + 1/6 * k3)
"""


#%%
import numpy as np
import matplotlib.pyplot as plt

#%%


Distance = 0.5 # [m]
Time = 1 # [s]
timeSteps = 1000000
spaceSteps = 100
dx = Distance / spaceSteps
dt = Time / timeSteps

tRoom = 20 + 273 # [°K]
def tOutside(time):   #  = 10 + 273 # [°K]
    return 5 * np.sin(time * 3) + 10 + 273

wallStart = int(0.3 * spaceSteps)
wallEnd = int(0.7 * spaceSteps)

temp0 = np.zeros((spaceSteps))
temp0[:wallStart] = tRoom
temp0[wallStart:wallEnd] = tOutside(0)
temp0[wallEnd:] = tOutside(0)


# alpha: thermal diffusivity
# alpha = k / c / p
# k: thermal conductivity
# p: density
# c: specific heat capacity
alpha = np.zeros((spaceSteps))
alpha[:wallStart] = 1
alpha[wallStart:wallEnd] = 0.1
alpha[wallEnd:] = 1

# beta: radiative loss
# only at wall's outer surface (but maybe also in air?)
# beta = mu / c / p
# mu: depends on S.Boltzmann and emissivity
beta = np.zeros((spaceSteps))
beta[wallEnd] = 0.0000005


def dTempdt(tempBefore, time):
    
    tempShiftR      = np.zeros(tempBefore.shape)
    tempShiftR[1:]  = tempBefore[:-1]
    tempShiftR[0]   = tRoom

    tempShiftL      = np.zeros(tempBefore.shape)
    tempShiftL[:-1] = tempBefore[1:]
    tempShiftL[-1]  = tOutside(time)

    dTdt = alpha * (tempShiftL - 2 * tempBefore + tempShiftR) / (dx**2)

    # accounting for radiation
    dTdt -= beta * np.power(tempBefore, 4)

    return dTdt




#%%
temps = [temp0]
for step in range(1, timeSteps):
    if step % 100 == 0:
        print(step / timeSteps)
    
    time = step * dt
    tempLast = temps[step-1]

    # Runge Kutta 2
    k1 = dTempdt(tempLast,                  time            )
    k2 = dTempdt(tempLast + 0.5 * dt * k1,  time + 0.5 * dt )
    delta = 0.5 * k1 + 0.5 * k2

    # Runge Kutta 3
    # k1 = dTempdt(tempLast,                          time            )
    # k2 = dTempdt(tempLast + 0.5 * dt * k1,          time + 0.5 * dt )
    # k3 = dTempdt(tempLast - dt * k1 + 2 * dt * k2,  time + dt       )
    # delta = (1.0/6.0) * k1 + (4.0/6.0) * k2 + (1.0 / 6.0) * k3

    tempNew = tempLast + dt * delta
    
    temps.append(tempNew)




# %%
xs = np.arange(0, Distance, dx)
plt.plot(xs, temps[0] - 273, label="t=0")
plt.plot(xs, temps[1000] - 273, label="t=1000")
plt.plot(xs, temps[10000] - 273, label="t=10000")
plt.plot(xs, temps[100000] - 273, label="t=100000")
plt.axvline(x = wallStart * dx)
plt.axvline(x = wallEnd *dx)
plt.legend()
# <-- has numerical instability. Try

# %%
from matplotlib.animation import FuncAnimation


fig, ax = plt.subplots()
ln, = ax.plot(xs, temps[0] - 273)
ax.axvline(x = wallStart * dx)
ax.axvline(x = wallEnd * dx)

def init():
    return ln,

def update(frame):
    print(frame / timeSteps)
    ln.set_data(xs, temps[frame] - 273)
    return ln,

ani = FuncAnimation(fig, update, init_func=init, blit=True, frames=np.arange(0, timeSteps, 10000))
ani.save("movie.mp4")
plt.show()

# %%
# %%
