#%% 
import numpy as np
import matplotlib.pyplot as plt

#%%
Xvl = 10.0
Yvl = 10.0
Tvl = 0.3

X = 128
Y = 128
T = 80

dx = Xvl / X
dy = Yvl / Y
dt = Tvl / T


f = 0.001
b = 0.0052
g = 9.8

H00 = np.ones((X, Y)) * 10
h = np.zeros((T, X, Y))
u = np.zeros((T, X, Y))
v = np.zeros((T, X, Y))

# cx = int(X/2)
# cy = int(Y/2)
# cr = 5
# for x in range(X):
#     for y in range(Y):
#         r = np.sqrt((x - cx)**2 + (y - cy)**2)
#         if r < cr:
#             h[0, x, y] = 10.0
        
        # H00[x, y] = max(min((3 * y - 10), (-3 * y + 100)), 0)

h[0, int(0.2*X):int(0.8*X), 0:int(0.2*Y)] = 10.0


plt.imshow(h[0])
plt.imshow(H00)
print(dx, dy, dt)

#%%
for t, tvl in enumerate(np.arange(0, Tvl - 2*dt, dt)):
    print("t = ", t)

    # fist pass: naive euler
    for x, xvl in enumerate(np.arange(0, Xvl - dx, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl - dy, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            dudx = (u[t, xp, y] - u[t, xm, y]) / (2.0 * dx)
            dvdy = (v[t, x, yp] - v[t, x, ym]) / (2.0 * dy)
            dhdx = (h[t, xp, y] - h[t, xm, y]) / (2.0 * dx)
            dhdy = (h[t, x, yp] - h[t, x, ym]) / (2.0 * dy)

            hNew =                - H00[x, y] * ( dudx + dvdy ) * dt + h[t, x, y]
            uNew = ( + f*v[t, x, y] - b*u[t, x, y] - g * dhdx ) * dt + u[t, x, y]
            vNew = ( - f*u[t, x, y] - b*v[t, x, y] - g * dhdy ) * dt + v[t, x, y]

            h[t+1, x, y] = hNew
            u[t+1, x, y] = uNew
            v[t+1, x, y] = vNew

    # second pass: augmented euler
    for x, xvl in enumerate(np.arange(0, Xvl - dx, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl - dy, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            dhdt_t = h[t+1, x, y] - h[t, x, y]
            dudt_t = u[t+1, x, y] - u[t, x, y]
            dvdt_t = v[t+1, x, y] - v[t, x, y]

            dudx_tdelta = (u[t+1, xp, y] - u[t+1, xm, y]) / (2.0 * dx)
            dvdy_tdelta = (v[t+1, x, yp] - v[t+1, x, ym]) / (2.0 * dy)
            dhdx_tdelta = (h[t+1, xp, y] - h[t+1, xm, y]) / (2.0 * dx)
            dhdy_tdelta = (h[t+1, x, yp] - h[t+1, x, ym]) / (2.0 * dy)

            dhdt_tdelta = - H00[x, y] * ( dudx_tdelta + dvdy_tdelta )
            dudt_tdelta =   f * v[t+1, x, y] - b * u[t+1, x, y] - g * dhdx_tdelta
            dvdt_tdelta = - f * u[t+1, x, y] - b * v[t+1, x, y] - g * dhdy_tdelta

            h[t+1, x, y] = h[t, x, y] + dt * (dhdt_t + dhdt_tdelta) / 2
            u[t+1, x, y] = u[t, x, y] + dt * (dudt_t + dudt_tdelta) / 2
            v[t+1, x, y] = v[t, x, y] + dt * (dvdt_t + dvdt_tdelta) / 2



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

def createAnimationNonnorm(data):
    t, r, c = data.shape
    
    fig, axes = plt.subplots()

    def init():
        axes.imshow(data[0, :, :])

    def update(i):
        print(f"frame {i} = {100 * i/t}% ...")
        axes.imshow(data[i, :, :])

    ani = FuncAnimation(fig, update, frames=t, init_func=init, interval=200)

    return ani


def displayAnimationInNotebook(animation):
    HTML(animation.to_jshtml())


def saveAnimation(animation, target):
    animation.save(target, 'imagemagick', fps=10)



# %%
fig, axs = plt.subplots(1, 3)
t = 1
axs[0].imshow(h[t], vmin=np.min(h), vmax=np.max(h))
axs[1].imshow(u[t], vmin=np.min(u), vmax=np.max(u))
axs[2].imshow(v[t], vmin=np.min(v), vmax=np.max(v))


ani = createAnimation(h)
saveAnimation(ani, 'ani.gif')


# %%
