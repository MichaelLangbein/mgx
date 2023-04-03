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
            - yTrue.max() == C - 1
        
        Note that if instead you want to have one-hot-encoded data, use *non*-sparse-cce.
        CCE expects
            - yTrue to be of dimension (H, W, C)
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
            outputSparse = np.max([outputSparse, outputData[0, :, :] * 1], axis=0) # I think this also works: outputSparse[np.where(outputData[0] == 1)] = 1
            outputSparse = np.max([outputSparse, outputData[1, :, :] * 2], axis=0) # I think this also works: outputSparse[np.where(outputData[1] == 1)] = 2
            outputSparse = np.max([outputSparse, outputData[2, :, :] * 3], axis=0) # I think this also works: outputSparse[np.where(outputData[2] == 1)] = 3
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

x, y = trainingLoader[np.random.randint(0, len(trainingLoader))]
x.max(), x.shape, y.max(), y.shape

#%%
def plotPred(x, ySim, yTrue):
    fig, axes = plt.subplots(1, 3)

    axes[0].imshow(x + 1.0)
    axes[0].set_title("input")

    axes[1].imshow(ySim[:, :, 1:4])
    axes[1].set_title("prediction")

    truth = np.asarray([(yTrue == 1) * 255, (yTrue == 2) * 255, (yTrue == 3) * 255])
    axes[2].imshow(np.moveaxis(truth, 0, -1))
    axes[2].set_title("truth")

    return fig

#%%
k.backend.clear_session()
# N_CLASSES = always one more than given; extra class stands for "none of the above"
model = makeModel(H, W, C, 4, [32, 64, 128, 256])
model.summary()

#%% verifying model works
x, y = validationLoader[0]
ySim = model.predict(x)

plotPred(x[0], ySim[0], y[0]).show()
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
        f = plotPred(x, ySim, y)
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
    epochs=15,
    # steps_per_epoch=40,
    batch_size=N_BATCH,
    validation_data=validationLoader, 
    callbacks=callbacks,
    
)


#%% verifying model has learned something
batchNr = np.random.randint(0, len(validationLoader))
sampleNr = np.random.randint(0, N_BATCH)

x, y = validationLoader[batchNr]
ySim = model.predict(x)

plotPred(x[sampleNr], ySim[sampleNr], y[sampleNr]).show()
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
