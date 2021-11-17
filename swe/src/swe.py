#%% 
import numpy as np


#%%
Xvl = 10
Yvl = 10
Tvl = 0.1

dx = Xvl / 255
dy = Yvl / 255
dt = Tvl / 30

X = int(Xvl / dx)
Y = int(Yvl / dy)
T = int(Tvl / dt)

f = 0.001
b = 0.0052
g = 9.8

H00 = np.zeros((X, Y))
H00[:, 75:125] = 100
h = np.zeros((T, X, Y))
u = np.zeros((T, X, Y))
v = np.zeros((T, X, Y))
for x in range(X):
    for y in range(Y):
        r = np.sqrt((x - 100)**2 + (y - 100)**2)
        if r < 10:
            h[0, x, y] = 3.0


#%%
for t, tvl in enumerate(np.arange(0, Tvl - dt, dt)):
    print("t = ", t)
    for x, xvl in enumerate(np.arange(0, Xvl - dx, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl - dy, dy)):

            xp = min(x+1, X - 1)
            yp = min(x+1, Y - 1)

            dudx = (u[t, xp, y] - u[t, x, y]) / dx
            dvdy = (v[t, x, yp] - v[t, x, y]) / dy
            dhdx = (h[t, xp, y] - h[t, x, y]) / dx
            dhdy = (h[t, x, yp] - h[t, x, y]) / dy

            hNew =      - H00[x, y] * ( dudx + dvdy ) * dt + h[t, x, y]
            uNew = ( + f*v[t, x, y] - b*u[t, x, y] - g * dhdx ) * dt + u[t, x, y]
            vNew = ( - f*u[t, x, y] - b*v[t, x, y] - g * dhdy ) * dt + v[t, x, y]

            h[t+1, x, y] = hNew
            u[t+1, x, y] = uNew
            v[t+1, x, y] = vNew


print('min h: ', np.min(h))
print('max h: ', np.max(h))

#%%
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from IPython.display import HTML


def createAnimation(data):
    t, r, c = data.shape
    vmin = np.min(data)
    vmax = np.max(data)
    
    fig, axes = plt.subplots()

    def init():
        axes.imshow(data[0, :, :], vmin=vmin, vmax=vmax)

    def update(i):
        print(f"frame {i} = {100 * i/t}% ...")
        axes.imshow(data[i, :, :], vmin=vmin, vmax=vmax)

    ani = FuncAnimation(fig, update, frames=t, init_func=init, interval=200)

    return ani


def displayAnimationInNotebook(animation):
    HTML(animation.to_jshtml())


def saveAnimation(animation, target):
    animation.save(target, 'imagemagick', fps=10)



# %%
plt.imshow(h[10, :, :])


ani = createAnimation(h)
saveAnimation(ani, 'ani.gif')


# %%
