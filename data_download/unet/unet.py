#%%
import keras as k
from tensorflow.keras import layers


def makeModel(w, h, c, numClasses):
    inputs = k.Input(shape=(w, h, c))

    ### First half of model: downsampling inputs

    # Entry block
    x = layers.Conv2D(32, 3, strides=2, padding="same")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    previousBlockActivation = x

    # Blocks 1, 2, 3 are identical apart from the feature depth
    for filters in [64, 128, 256]:
        x = layers.Activation('relu')(x)
        x = layers.SeparableConv2D(filters, 3, padding='same')(x)
        x = layers.BatchNormalization()(x)
        
        x = layers.Activation('relu')(x)
        x = layers.SeparableConv2D(filters, 3, padding='same')(x)
        x = layers.BatchNormalization()(x)

        x = layers.MaxPooling2D(3, strides=2, padding='same')(x)

        # Project residual
        residual = layers.Conv2D(filters, 1, strides=2, padding='same')(previousBlockActivation)
        x = layers.add([x, residual])
        previousBlockActivation = x  # Setting aside next residual


    ### Second half of network: upsampling inputs

    for filters in [256, 128, 64, 32]:
        x = layers.Activation('relu')(x)
        x = layers.Conv2DTranspose(filters, 3, padding='same')(x)
        x = layers.BatchNormalization()(x)

        x = layers.Activation('relu')(x)
        x = layers.Conv2DTranspose(filters, 3, padding='same')(x)
        x = layers.BatchNormalization()(x)

        x = layers.UpSampling2D(2)(x)

        # Project residual
        residual = layers.UpSampling2D(2)(previousBlockActivation)
        residual = layers.Conv2D(filters, 1, padding='same')(residual)
        x = layers.add([x, residual])
        previousBlockActivation = x

    
    outputs = layers.Conv2D(numClasses, 3, activation='softmax', padding='same')(x)

    model = k.Model(inputs, outputs)
    return model


