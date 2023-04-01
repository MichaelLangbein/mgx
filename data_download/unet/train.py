#%%
import keras as k
from unet import makeModel
from loader import Loader
import os
import matplotlib.pyplot as plt
import random


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
trainingLoader = Loader(N_BATCH, trainingDirs, H, W, C)
validationLoader = Loader(N_BATCH, validationDirs, H, W, C)


#%%
k.backend.clear_session()
model = makeModel(H, W, C, N_CLASSES)
model.summary()




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

#%%
valPreds = model.predict(validationLoader)