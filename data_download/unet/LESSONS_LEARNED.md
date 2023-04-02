# LESSONS LEARNED

- Loss function 
    - categorical cross entropy for one-hot encoded output (batchsize * height * width * nrlabels) element of [0, 1]
    - sparse cce for integer-encoded output (batchsize * height * width * 1) element of N

- input should be normalized to [-1, 1]

- 