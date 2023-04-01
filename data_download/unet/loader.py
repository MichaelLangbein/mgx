#%%
import os
import keras as k
import numpy as np
import random

#%%

class SparseLoader(k.utils.Sequence):
    """
        Loader for data that will be used with sparse-cat-cross-entropy.
        SCCE expects 
            - yTrue to be of dimension (H, W, 1)
            - ySim to be of dimension (H, W, C)
    """


    def __init__(self, batchSize, dataDirs, H, W, C):
        self.batchSize = batchSize
        self.dataDirs = dataDirs
        self.H = H
        self.W = W
        self.C = C

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
            if inputData.min() < 0:
                inputData += inputData.min()
            inputData = inputData / inputData.max()
            inputData *= 255
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

    def __init__(self, batchSize, dataDirs, H, W, C, N_CLASSES):
        self.batchSize = batchSize
        self.dataDirs = dataDirs
        self.H = H
        self.W = W
        self.C = C
        self.N_CLASSES = N_CLASSES

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
            if inputData.min() < 0:
                inputData += inputData.min()
            inputData = inputData / inputData.max()
            inputData *= 255
            x[j, :, :, :] = inputData
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            outputData = np.moveaxis(outputData, 0, -1)
            y[j, :, :, :] = outputData

        return x, y


# %%
