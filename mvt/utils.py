import os
from urllib.parse import urlparse
import requests as req
import zipfile as z


def fileExists(path):
    return os.path.exists(path)



def downloadFromUrlTo(url, targetPath):
    os.makedirs(targetPath, exist_ok=True)
    name = urlparse(url).path.split("/").pop()
    response = req.get(url)
    targetFile = os.path.join(targetPath, name)
    with open(targetFile, 'wb') as fh:
        fh.write(response.content)
    if targetFile.endswith('.zip'):
        unzippedTargetFile = targetFile.strip('.zip')
        with z.ZipFile(targetFile) as z:
            with open(unzippedTargetFile, 'wb') as f:
                f.write(z.read(unzippedTargetFile))


def doToEachFileIn(dir, action):
    for dirpath, dirs, files in os.walk(dir):  
        for fileName in files:
            action(dirpath, fileName)


def replaceInFile(file, search, replace):
    with open(file, 'r') as file:
        data = file.read()
        data = data.replace(search, replace)    
    with open(file, 'w') as file:
        file.write(data)

