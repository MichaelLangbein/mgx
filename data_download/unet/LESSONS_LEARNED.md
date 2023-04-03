# LESSONS LEARNED

- Loss function 
    - categorical cross entropy for one-hot encoded output (batchsize * height * width * nrlabels) element of [0, 1]
    - sparse cce for integer-encoded output (batchsize * height * width * 1) element of N

- input should be normalized to [-1, 1]

- logits: scales a prob from [0, 1] to [-inf, inf]. Useful if model-output is an arbitrary float, not a prob.




Observations 03.04.2023

- Hypothesis 1:
    - it's easier to predict "is forest" or "is not forest" instead of many classes
        - reason: 
        - test: load only forest-part of y
    
- Hypothesis 2:
    - unet always wants to predict at least one class, it cannot deal with no class being active for a pixel.
        - reason: after 30 epochs of 30i/batch, i get predictions that are never dark
        - test: add a 4th class "none of above" in loader

- Hypothesis 3:
    - my unet needs a smaller waist
        - reason: i keep getting chessboard-shaped predictions. Maybe the smallest unit my net can observe is 20x20 pix, not 2x2 pix
        - test: add new down- and up-sampling layers to net

- Hypothesis 4: 
    - water is causing issues
        - reason: there is little water in my trainings-dataset. The net stil tries to predict water sometimes, often in the middle of forests

- Hypothesis 5:
    - a small batch size seems to help
        - reson: small batch size = can overfit to few images. actually a good thing, because there is so much variety within one class.
        - test: make batch-size extremely small and extremely large. compare.

Consequences:
    Let's simplify things.
        - only one class: forest or not  <== now requires spare cce, but worked!
        - smaller waist for unet <== did work, no longer see rects
        - small batch-size <== did work