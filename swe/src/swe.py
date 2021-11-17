#%% 
import numpy as np
import matplotlib.pyplot as plt

#%%
H00 = np.zeros((256, 256))
H00[:, 75:125] = 0.5
h = np.zeros((100, 256, 256))
u = np.zeros((100, 256, 256))
v = np.zeros((100, 256, 256))
h[0, 75:125, 75:125] = 1.0

dx = 0.1
dy = 0.1
dt = 0.01

f = 0.001
b = 0.0052
g = 9.8

#%%
for t in range(0, 99):
    print("t = ", t)
    for x in range(1, 256):
        for y in range(1, 256):
            xp = min(x+1, 255)
            yp = min(x+1, 255)
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


#%%
plt.imshow(h[0, :, :])
plt.imshow(h[10, :, :])
plt.imshow(h[20, :, :])
plt.imshow(h[30, :, :])
plt.imshow(h[40, :, :])
# %%
