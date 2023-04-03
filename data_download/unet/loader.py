#%%
import os
import keras as k
import numpy as np
import random

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
            - yTrue to be of dimension (H, W, 1)
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
        y = np.zeros((self.batchSize, self.H, self.W, 1),      dtype=np.uint8)

        for j, path in enumerate(batchDirs):
            inputFile = os.path.join(path, "input.npy")
            inputData = np.load(inputFile, allow_pickle=True)
            inputData = np.moveaxis(inputData, 0, -1)
            if self.normalizeX:
                inputData = normalizeTo(inputData, -1.0, 1.0)
            x[j, :, :, :] = inputData
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            outputData = np.expand_dims(np.sum(outputData, axis=0), axis=2)
            y[j, :, :, :] = outputData

        return x, y


class OneHotLoader(k.utils.Sequence):
    """
        Loads data such that it can be used
        with the CategoricalCrossEntropy loss function.
    """

    def __init__(self, batchSize, dataDirs, H, W, C, N_CLASSES, normalizeX=False):
        self.batchSize = batchSize
        self.dataDirs = dataDirs
        self.H = H
        self.W = W
        self.C = C
        self.N_CLASSES = N_CLASSES
        self.normalizeX = normalizeX

    def __len__(self):
        """ Gives tf the amount of batches available """
        return len(self.dataDirs) // self.batchSize

    def __getitem__(self, idx):
        """ Returns tuple (input, target) corresponding to batch #idx """
        i = idx * self.batchSize
        
        batchDirs = self.dataDirs[i : i + self.batchSize]
        
        x = np.zeros((self.batchSize, self.H, self.W, self.C),          dtype=np.float32)
        y = np.zeros((self.batchSize, self.H, self.W, self.N_CLASSES),  dtype=np.uint8)

        for j, path in enumerate(batchDirs):
            inputFile = os.path.join(path, "input.npy")
            inputData = np.load(inputFile, allow_pickle=True)
            inputData = np.moveaxis(inputData, 0, -1)
            if self.normalizeX:
                inputData = normalizeTo(inputData, -1.0, 1.0)
            x[j, :, :, :] = inputData
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            outputData = np.moveaxis(outputData, 0, -1)
            y[j, :, :, :] = outputData

        return x, y


# %%
class TrueFalseLoader(k.utils.Sequence):
    """
        Loads data such that it can be used
        with the CategoricalCrossEntropy loss function.
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
        y = np.zeros((self.batchSize, self.H, self.W),  dtype=np.uint8)

        for j, path in enumerate(batchDirs):
            inputFile = os.path.join(path, "input.npy")
            inputData = np.load(inputFile, allow_pickle=True)
            inputData = np.moveaxis(inputData, 0, -1)
            if self.normalizeX:
                inputData = normalizeTo(inputData, -1.0, 1.0)
            x[j, :, :, :] = inputData
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            outputData = np.moveaxis(outputData, 0, -1)
            outputDataForest = outputData[:, :, 1]
            y[j, :, :] = outputDataForest

        return x, y