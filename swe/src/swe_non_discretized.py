#%% 
import numpy as np
import matplotlib.pyplot as plt

#%%
Xvl = 1.0
Yvl = 1.0
Tvl = 0.1

X = 200
Y = 200
T = 200

dx = Xvl / X
dy = Yvl / Y
dt = Tvl / T
print(dx, dy, dt)

f = 0.001
b = 0.0052
g = 9.8

H00   = np.ones((X, Y),  )
h     = np.ones((T, X, Y))
u     = np.ones((T, X, Y))
v     = np.ones((T, X, Y))
hImpr = np.ones((T, X, Y))
uImpr = np.ones((T, X, Y))
vImpr = np.ones((T, X, Y))


cx = int(0.6 * X)
cy = int(0.6 * Y)
cr = 5
for x in range(X):
    for y in range(Y):
        H00[x, y] = 100
        u[0, x, y] = 0.0
        v[0, x, y] = 0.0
        r = np.sqrt((x - cx)**2 + (y - cy)**2)
        if r < cr:
            h[0, x, y] = 10.0
        else: 
            h[0, x, y] = 0.0





for t, tvl in enumerate(np.arange(0, Tvl - dt, dt)):
    print("t = ", t)

    # fist pass: naive euler
    for x, xvl in enumerate(np.arange(0, Xvl, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            H_   = H00[x, y]
            h_   = h[t, x, y]
            u_   = u[t, x, y]
            v_   = v[t, x, y]
            u_xp = u[t, xp, y]
            u_xm = u[t, xm, y]
            v_yp = v[t, x, yp]
            v_ym = v[t, x, ym]
            h_xp = h[t, xp, y]
            h_xm = h[t, xm, y]
            h_yp = h[t, x, yp]
            h_ym = h[t, x, ym]

            dudx = (u_xp - u_xm) / (2.0 * dx)
            dvdy = (v_yp - v_ym) / (2.0 * dy)
            dhdx = (h_xp - h_xm) / (2.0 * dx)
            dhdy = (h_yp - h_ym) / (2.0 * dy)

            hNew =       - H_ * ( dudx + dvdy ) * dt + h_
            uNew = ( + f*v_ - b*u_ - g * dhdx ) * dt + u_
            vNew = ( - f*u_ - b*v_ - g * dhdy ) * dt + v_

            h[t+1, x, y] = hNew
            u[t+1, x, y] = uNew
            v[t+1, x, y] = vNew

    # second pass: improved euler
    for x, xvl in enumerate(np.arange(0, Xvl, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            H_     = H00[x, y]
            h_     = h[t,   x,  y ]
            u_     = u[t,   x,  y ]
            v_     = v[t,   x,  y ]
            h_d    = h[t+1, x,  y ]
            u_d    = u[t+1, x,  y ]
            v_d    = v[t+1, x,  y ]
            u_xp   = u[t,   xp, y ]
            u_xm   = u[t,   xm, y ]
            v_yp   = v[t,   x,  yp]
            v_ym   = v[t,   x,  ym]
            h_xp   = h[t,   xp, y ]
            h_xm   = h[t,   xm, y ]
            h_yp   = h[t,   x,  yp]
            h_ym   = h[t,   x,  ym]
            u_xp_d = u[t+1, xp, y ]
            u_xm_d = u[t+1, xm, y ]
            v_yp_d = v[t+1, x,  yp]
            v_ym_d = v[t+1, x,  ym]
            h_xp_d = h[t+1, xp, y ]
            h_xm_d = h[t+1, xm, y ]
            h_yp_d = h[t+1, x,  yp]
            h_ym_d = h[t+1, x,  ym]

            dhdt_t = h_d - h_
            dudt_t = u_d - u_
            dvdt_t = v_d - v_

            dudx_tdelta = (u_xp_d - u_xm_d) / (2.0 * dx)
            dvdy_tdelta = (v_yp_d - v_ym_d) / (2.0 * dy)
            dhdx_tdelta = (h_xp_d - h_xm_d) / (2.0 * dx)
            dhdy_tdelta = (h_yp_d - h_ym_d) / (2.0 * dy)

            dhdt_tdelta = - H_ * ( dudx_tdelta + dvdy_tdelta )
            dudt_tdelta =   f * v_d - b * u_d - g * dhdx_tdelta
            dvdt_tdelta = - f * u_d - b * v_d - g * dhdy_tdelta

            hNew = h_ + dt * (dhdt_t + dhdt_tdelta) / 2.0
            uNew = u_ + dt * (dudt_t + dudt_tdelta) / 2.0
            vNew = v_ + dt * (dvdt_t + dvdt_tdelta) / 2.0

            hImpr[t+1, x, y] = hNew
            uImpr[t+1, x, y] = uNew
            vImpr[t+1, x, y] = vNew

    h[t+1, :, :] = hImpr[t+1, :, :]
    u[t+1, :, :] = hImpr[t+1, :, :]
    v[t+1, :, :] = hImpr[t+1, :, :]


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
t = 1
fig, axs = plt.subplots(1, 3)
axs[0].imshow(h[t], vmin=np.min(h), vmax=np.max(h))
axs[1].imshow(u[t], vmin=np.min(u), vmax=np.max(u))
axs[2].imshow(v[t], vmin=np.min(v), vmax=np.max(v))


ani = createAnimation(h)
saveAnimation(ani, 'ani.gif')


# %%

# %%
