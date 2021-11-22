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

H00   = np.ones((X, Y),    dtype='uint8')
h     = np.ones((T, X, Y), dtype='uint8')
u     = np.ones((T, X, Y), dtype='uint8')
v     = np.ones((T, X, Y), dtype='uint8')
hImpr = np.ones((T, X, Y), dtype='uint8')
uImpr = np.ones((T, X, Y), dtype='uint8')
vImpr = np.ones((T, X, Y), dtype='uint8')


HMin = 0
HMax = 100
hMax = 10
hMin = -10
uMax = 10
uMin = -10
vMax = 10
vMin = -10

def shrink(fval, vmin, vmax):
    v = (fval - vmin) / (vmax - vmin)
    return int(255 * max(min(v, 1), 0))

def stretch(ival, vmin, vmax):
    return (vmax - vmin) * (float(ival)/255.0) + vmin


cx = int(0.6 * X)
cy = int(0.6 * Y)
cr = 5
for x in range(X):
    for y in range(Y):
        H00[x, y] = shrink(HMax, HMin, HMax)
        u[0, x, y] = shrink(0, uMin, uMax)
        v[0, x, y] = shrink(0, vMin, vMax)
        r = np.sqrt((x - cx)**2 + (y - cy)**2)
        if r < cr:
            h[0, x, y] = shrink(hMax, hMin, hMax)
        else: 
            h[0, x, y] = shrink(0, hMin, hMax)

print(dx, dy, dt)


for t, tvl in enumerate(np.arange(0, Tvl - dt, dt)):

    # fist pass: naive euler
    for x, xvl in enumerate(np.arange(0, Xvl, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            H_   = stretch(H00[x, y],   HMin, HMax)
            h_   = stretch(h[t, x, y],  hMin, hMax)
            u_   = stretch(u[t, x, y],  uMin, uMax)
            v_   = stretch(v[t, x, y],  vMin, vMax)
            u_xp = stretch(u[t, xp, y], uMin, uMax)
            u_xm = stretch(u[t, xm, y], uMin, uMax)
            v_yp = stretch(v[t, x, yp], vMin, vMax)
            v_ym = stretch(v[t, x, ym], vMin, vMax)
            h_xp = stretch(h[t, xp, y], hMin, hMax)
            h_xm = stretch(h[t, xm, y], hMin, hMax)
            h_yp = stretch(h[t, x, yp], hMin, hMax)
            h_ym = stretch(h[t, x, ym], hMin, hMax)

            dudx = (u_xp - u_xm) / (2.0 * dx)
            dvdy = (v_yp - v_ym) / (2.0 * dy)
            dhdx = (h_xp - h_xm) / (2.0 * dx)
            dhdy = (h_yp - h_ym) / (2.0 * dy)

            hNew =       - H_ * ( dudx + dvdy ) * dt + h_
            uNew = ( + f*v_ - b*u_ - g * dhdx ) * dt + u_
            vNew = ( - f*u_ - b*v_ - g * dhdy ) * dt + v_

            h[t+1, x, y] = shrink(hNew, hMin, hMax)
            u[t+1, x, y] = shrink(uNew, uMin, uMax)
            v[t+1, x, y] = shrink(vNew, vMin, vMax)

    # second pass: improved euler
    for x, xvl in enumerate(np.arange(0, Xvl, dx)):
        for y, yvl in enumerate(np.arange(0, Yvl, dy)):

            xp = min(x+1, X - 1)
            xm = max(x-1, 0    )
            yp = min(y+1, Y - 1)
            ym = max(y-1, 0    )

            H_     = stretch( H00[x, y],      HMin, HMax  )
            h_     = stretch( h[t,   x,  y ], hMin, hMax  )
            u_     = stretch( u[t,   x,  y ], uMin, uMax  )
            v_     = stretch( v[t,   x,  y ], vMin, vMax  )
            h_d    = stretch( h[t+1, x,  y ], hMin, hMax  )
            u_d    = stretch( u[t+1, x,  y ], uMin, uMax  )
            v_d    = stretch( v[t+1, x,  y ], vMin, vMax  )
            u_xp   = stretch( u[t,   xp, y ], uMin, uMax  )
            u_xm   = stretch( u[t,   xm, y ], uMin, uMax  )
            v_yp   = stretch( v[t,   x,  yp], vMin, vMax  )
            v_ym   = stretch( v[t,   x,  ym], vMin, vMax  )
            h_xp   = stretch( h[t,   xp, y ], hMin, hMax  )
            h_xm   = stretch( h[t,   xm, y ], hMin, hMax  )
            h_yp   = stretch( h[t,   x,  yp], hMin, hMax  )
            h_ym   = stretch( h[t,   x,  ym], hMin, hMax  )
            u_xp_d = stretch( u[t+1, xp, y ], uMin, uMax  )
            u_xm_d = stretch( u[t+1, xm, y ], uMin, uMax  )
            v_yp_d = stretch( v[t+1, x,  yp], vMin, vMax  )
            v_ym_d = stretch( v[t+1, x,  ym], vMin, vMax  )
            h_xp_d = stretch( h[t+1, xp, y ], hMin, hMax  )
            h_xm_d = stretch( h[t+1, xm, y ], hMin, hMax  )
            h_yp_d = stretch( h[t+1, x,  yp], hMin, hMax  )
            h_ym_d = stretch( h[t+1, x,  ym], hMin, hMax  )

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

            hImpr[t+1, x, y] = shrink(hNew, hMin, hMax)
            uImpr[t+1, x, y] = shrink(uNew, uMin, hMax)
            vImpr[t+1, x, y] = shrink(vNew, vMin, hMax)

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
fig, axs = plt.subplots(1, 3)
t = 1
axs[0].imshow(h[t], vmin=np.min(h), vmax=np.max(h))
axs[1].imshow(u[t], vmin=np.min(u), vmax=np.max(u))
axs[2].imshow(v[t], vmin=np.min(v), vmax=np.max(v))


ani = createAnimation(h)
saveAnimation(ani, 'ani.gif')


# %%

# %%
