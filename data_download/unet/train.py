#%%
import keras as k
from unet import makeModel
from loader import SparseLoader, OneHotLoader, TrueFalseLoader
import os
import matplotlib.pyplot as plt
import random
import numpy as np



#%%
thisDir = os.getcwd()
dataDir = os.path.join(thisDir, '..', 'assets', 'dataset')
dataSubDirs = [os.path.join(dataDir, subDir) for subDir in os.listdir(dataDir)]
random.shuffle(dataSubDirs)

H, W, C = 256, 256, 3
N_BATCH = 32

cutoffPoint = int( 0.9 * len(dataSubDirs))
trainingDirs = dataSubDirs[:cutoffPoint]
validationDirs = dataSubDirs[cutoffPoint:]
trainingLoader = TrueFalseLoader(N_BATCH, trainingDirs, H, W, C, normalizeX=True)
validationLoader = TrueFalseLoader(N_BATCH, validationDirs, H, W, C, normalizeX=True)
# trainingLoader = OneHotLoader(N_BATCH, trainingDirs, H, W, C, N_CLASSES, normalizeX=True)
# validationLoader = OneHotLoader(N_BATCH, validationDirs, H, W, C, N_CLASSES, normalizeX=True)
# trainingLoader = SparseLoader(N_BATCH, trainingDirs, H, W, C, normalizeX=True)
# validationLoader = SparseLoader(N_BATCH, validationDirs, H, W, C, normalizeX=True)

x, y = trainingLoader[0]
f, ax = plt.subplots(1, 3)
ax[0].imshow(x[0] + 1.0)
ax[1].imshow(y[0] * 255)
ax[2].imshow(x[0] + 1.0)
ax[2].imshow(y[0] * 255, alpha=0.3)
x.max(), x.shape, y.max(), y.shape

#%%
k.backend.clear_session()
# N_CLASSES = 2: is-forest and is-not-forest
model = makeModel(H, W, C, 2, [32, 64, 128, 256])
model.summary()

#%% verifying model works
x, y = validationLoader[0]
ySim = model.predict(x)

fig, axes = plt.subplots(3, 3)
axes[0][0].imshow(x[0] + 1.0)
axes[0][1].imshow(ySim[0, :, :, 1])
axes[0][2].imshow(y[0] * 255)
axes[1][0].imshow(x[1] + 1.0)
axes[1][1].imshow(ySim[1, :, :, 1])
axes[1][2].imshow(y[1] * 255)
axes[2][0].imshow(x[2] + 1.0)
axes[2][1].imshow(ySim[2, :, :, 1])
axes[2][2].imshow(y[2] * 255)
ySim.shape, y.shape

# %%
# Using 'auto'/'sum_over_batch_size' reduction type.
cce = k.losses.SparseCategoricalCrossentropy(from_logits=False) #ignore_class=0 ? 
cce(y[0], ySim[0]).numpy()


#%%
cce(y, ySim).numpy()


#%%

class PredictCallback(k.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        batchNr = np.random.randint(0, len(validationLoader))
        sampleNr = np.random.randint(0, N_BATCH)
        x, y = validationLoader[batchNr]
        ySim = model.predict(np.expand_dims(x[sampleNr], 0))
        plt.imshow(x[sampleNr] + 1.0)
        plt.imshow(ySim[0, :, :, 1], alpha=.4)
        plt.savefig(f"./predictions/prediction_{epoch}.png")



model.compile(
    optimizer = k.optimizers.RMSprop(
        learning_rate = 0.0001,
    ),
    # loss = k.losses.CategoricalCrossentropy()
    loss = k.losses.SparseCategoricalCrossentropy(from_logits=False)
)

callbacks = [
    k.callbacks.ModelCheckpoint("unet.h5", save_best_only=True),
    PredictCallback()
]

#%%
# Train the model, doing validation at the end of each epoch.
history = model.fit(
    trainingLoader, 
    epochs=20,
    steps_per_epoch=30,
    batch_size=N_BATCH,
    validation_data=validationLoader, 
    callbacks=callbacks,
    
)


#%% verifying model has learned something
x, y = validationLoader[0]
ySim = model.predict(x)

fig, axes = plt.subplots(3, 3)
axes[0][0].imshow(x[0] + 1.0)
axes[0][1].imshow(ySim[0, :, :, 0])
axes[0][2].imshow(y[0] * 255)
axes[1][0].imshow(x[1] + 1.0)
axes[1][1].imshow(ySim[1, :, :, 0])
axes[1][2].imshow(y[1] * 255)
axes[2][0].imshow(x[2] + 1.0)
axes[2][1].imshow(ySim[2, :, :, 0])
axes[2][2].imshow(y[2] * 255)
ySim.shape, y.shape

# %%
plt.plot(history.history['loss'])
plt.plot(history.history['val_loss'])
plt.title('model loss')
plt.ylabel('loss')
plt.xlabel('epoch')
plt.legend(['train', 'test'], loc='upper left')
plt.show()
# %%
