# LESSONS LEARNED

- SCCE expects 
            - yTrue to be of dimension (H, W)
            - ySim to be of dimension (H, W, C)
            - C == yTrue.max() + 1 <== model must output one dimension for each class and one for "no class"
        
        Note that if instead you want to have one-hot-encoded data, use *non*-sparse-cce.
        CCE expects
            - yTrue to be of dimension (H, W, C)
            - ySim to be of dimension (H, W, C)

- input should be normalized to [-1, 1]

- logits: scales a prob from [0, 1] to [-inf, inf]. Useful if model-output is an arbitrary float, not a prob. (https://en.wikipedia.org/wiki/Logit)



- Hypothesis 1:
    - it's easier to predict "is forest" or "is not forest" instead of many classes
        - reason: 
        - test: load only forest-part of y
        - results: did indeed work. might have converged faster
    
- Hypothesis 2:
    - unet always wants to predict at least one class, it cannot deal with no class being active for a pixel.
        - reason: after 30 epochs of 30i/batch, i get predictions that are never dark
        - test: add a 4th class "none of above" in loader
        - results: that's true! Always need one extra-class in unet-output for "non of the above". 

- Hypothesis 3:
    - my unet needs a smaller waist
        - reason: i keep getting chessboard-shaped predictions. Maybe the smallest unit my net can observe is 20x20 pix, not 2x2 pix
        - test: add new down- and up-sampling layers to net
        - results: no longer seeing those squares -- might really be true

- Hypothesis 4: 
    - water is causing issues
        - reason: there is little water in my trainings-dataset. The net stil tries to predict water sometimes, often in the middle of forests


- 