#%%
import os
import keras as k
import numpy as np
import random

#%%

class Loader(k.utils.Sequence):
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
        
        x = np.zeros((self.batchSize, self.H, self.W, self.C), dtype='uint8')
        y = np.zeros((self.batchSize, self.H, self.W, 1),      dtype='uint8')

        for j, path in enumerate(batchDirs):
            inputFile = os.path.join(path, "input.npy")
            inputData = np.load(inputFile, allow_pickle=True)
            x[j, :, :, :] = np.moveaxis(inputData, 0, -1)
            outputFile = os.path.join(path, "output.npy")
            outputData = np.load(outputFile, allow_pickle=True)
            y[j, :, :, :] = np.reshape(outputData, outputData.shape + (1,))
            # Ground truth labels are 1, 2, 3. Subtract one to make them 0, 1, 2:
            y[j] -= 1

        return x, y




# %%
