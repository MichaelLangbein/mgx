#%%
import keras as k
from unet import makeModel
import os
import matplotlib.pyplot as plt
import random
import numpy as np

#%%
def normalizeTo(x, xNewMin, xNewMax):
    xMin = x.min()
    xMax = x.max()
    grad = (x - xMin) / (xMax - xMin)
    xNew = xNewMin + grad * (xNewMax - xNewMin)
    return xNew


class SparseLoader(k.utils.Sequence):
    """
        Loader for data that will be used with sparse-cat-cross-entropy.
        SCCE expects 
            - yTrue to be of dimension (H, W)
            - ySim to be of dimension (H, W, C)
    """


    def __init__(self, batchSize, dataDirs, H, W, C, normalizeX=False):
        self.batchSize = batchSize
        self.dataDirs = dataDirs
        self.H = H
        self.W = W
        self.C = C
        self.normalizeX = normalizeX

    def __len__(self):
        """ Gives tf the amount of batches available """
        return len(self.dataDirs) // self.batchSize

    def __getitem__(self, idx):
        """ Returns tuple (input, target) corresponding to batch #idx """
        i = idx * self.batchSize
        
        batchDirs = self.dataDirs[i : i + self.batchSize]
        
        x = np.zeros((self.batchSize, self.H, self.W, self.C), dtype=np.float32)
        y = np.zeros((self.batchSize, self.H, self.W),      dtype=np.uint8)

        for j, path in enumerate(batchDirs):
            inputFile = os.path.join(path, "input.npy")
            inputData = np.load(inputFile, allow_pickle=True)
            inputData = np.moveaxis(inputData, 0, -1)
            if self.normalizeX:
                inputData = normalizeTo(inputData, -1.0, 1.0)
            x[j, :, :, :] = inputData
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            C, H, W = outputData.shape
            outputSparse = np.zeros((H, W))
            outputSparse = np.max([outputSparse, outputData[0, :, :] * 1], axis=0)
            outputSparse = np.max([outputSparse, outputData[1, :, :] * 2], axis=0)
            outputSparse = np.max([outputSparse, outputData[2, :, :] * 3], axis=0)
            y[j, :, :] = outputSparse

        return x, y

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
trainingLoader = SparseLoader(N_BATCH, trainingDirs, H, W, C, normalizeX=True)
validationLoader = SparseLoader(N_BATCH, validationDirs, H, W, C, normalizeX=True)

#%% verify that training-data makes sense.
def plotPred(x, ySim, yTrue):
    f, ax = plt.subplots(1, 3)    
    ax[0].imshow(x + 1.0)
    ax[1].imshow(ySim * 100)
    ax[2].imshow(x + 1.0)
    ax[2].imshow(yTrue * 100, alpha=0.7)
    return f


x, y = trainingLoader[np.random.randint(0, len(trainingLoader))]
plotPred(x[0], y[0], y[0]).show()
x.max(), x.shape, y.max(), y.shape

#%%
k.backend.clear_session()
# N_CLASSES = always one more than given; extra class stands for "none of the above"
model = makeModel(H, W, C, 4, [32, 64, 128, 256])
model.summary()

#%% verifying model works
x, y = validationLoader[0]
ySim = model.predict(x)

plotPred(x[0], ySim[0, :, :, 0:3], y[0]).show()
ySim.shape, y.shape

# %% verify that loss-function works
# SCCE is very picky:
#  - model-output in range [0:1] in default mode (otherwise set from_logits=true)
#  - if model-output.shape = (batchsize, width, height, classes) => max(yTrue) == classes - 1
cce = k.losses.SparseCategoricalCrossentropy(from_logits=False) 
cce(y, ySim).numpy()


#%%

class PredictCallback(k.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        batchNr = 10
        sampleNr = 3
        xs, ys = validationLoader[batchNr]
        x = xs[sampleNr]
        y = ys[sampleNr]
        ySim = model.predict(np.expand_dims(x, 0))[0]
        f = plotPred(x, ySim[:, :, 0:3], y)
        f.savefig(f"./predictions/prediction_{epoch}.png")



model.compile(
    optimizer = k.optimizers.RMSprop(
        learning_rate = 0.001,
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
    epochs=50,
    # steps_per_epoch=40,
    batch_size=N_BATCH,
    validation_data=validationLoader, 
    callbacks=callbacks,
    
)


#%% verifying model has learned something
x, y = validationLoader[0]
ySim = model.predict(x)

plotPred(x[0], ySim[0, :, :, 0:3], y[0]).show()
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
