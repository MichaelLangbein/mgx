#%%
import keras as k
from unet import makeModel
from loader import SparseLoader, OneHotLoader
import os
import matplotlib.pyplot as plt
import random
import numpy as np
from tensorflow.keras.preprocessing.image import load_img

#%%
from PIL import Image 

inputData = np.asanyarray(load_img("./Abyssinian_1.jpg").getdata())
labelData = np.asanyarray(load_img("./yorkshire_terrier_185.png").getdata())
inputData.max(), inputData.shape, labelData.max(), labelData.shape

#%%
thisDir = os.getcwd()
dataDir = os.path.join(thisDir, '..', 'assets', 'dataset')
dataSubDirs = [os.path.join(dataDir, subDir) for subDir in os.listdir(dataDir)]
random.shuffle(dataSubDirs)

H, W, C = 256, 256, 3
N_CLASSES = 3
N_BATCH = 32

cutoffPoint = int( 0.9 * len(dataSubDirs))
trainingDirs = dataSubDirs[:cutoffPoint]
validationDirs = dataSubDirs[cutoffPoint:]
trainingLoader = SparseLoader(N_BATCH, trainingDirs, H, W, C)
validationLoader = SparseLoader(N_BATCH, validationDirs, H, W, C)


x, y = trainingLoader[0]
f, ax = plt.subplots(1, 2)
ax[0].imshow(x[0] / 255.0)
ax[1].imshow(y[0])
x.max(), x.shape, y.max(), y.shape

#%%
k.backend.clear_session()
model = makeModel(H, W, C, N_CLASSES)
model.summary()

#%% verifying model works
x, y = validationLoader[0]
ySim = model.predict(x)

fig, axes = plt.subplots(3, 3)
axes[0][0].imshow(x[0])
axes[0][1].imshow(ySim[0])
axes[0][2].imshow(y[0])
axes[1][0].imshow(x[1])
axes[1][1].imshow(ySim[1])
axes[1][2].imshow(y[1])
axes[2][0].imshow(x[2])
axes[2][1].imshow(ySim[2])
axes[2][2].imshow(y[2])
ySim.shape, y.shape

# %%
# Using 'auto'/'sum_over_batch_size' reduction type.
cce = k.losses.SparseCategoricalCrossentropy()
cce(y[0], ySim[0]).numpy()


#%%
cce(y, ySim).numpy()


#%%
# Configure the model for training.
# We use the "sparse" version of categorical_crossentropy
# because our target data is integers.
model.compile(optimizer="rmsprop", loss="sparse_categorical_crossentropy")

callbacks = [
    k.callbacks.ModelCheckpoint("unet.h5", save_best_only=True)
]

# Train the model, doing validation at the end of each epoch.
epochs = 15
model.fit(trainingLoader, epochs=epochs, validation_data=validationLoader, callbacks=callbacks)


# %%
