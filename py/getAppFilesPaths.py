import re
import os, os.path, sys, shutil, time, subprocess
from subprocess import call

rootPath = sys.argv[1]
# jsRelPath = sys.argv[2]
jsRelPath = 'src/js'
# partialRelPath = 'src/partial'

jsFilesPath = rootPath + "/" + jsRelPath
# partialFilesPath = rootPath + "/" + partialRelPath

allPathStr = "{"

# JS
for root, dirs, files in os.walk(jsFilesPath):
    for file in files:
        if file.endswith(".js"):
            path = root.replace(rootPath, "")
            filename = file.replace(".js", "")
            fPath = "." + path + "/" + filename
            str = '"' + filename + '": "' + fPath + '",'
            allPathStr += str
        elif file.endswith(".hbs") and os.path.isfile(os.path.join(root, file)):
            path = root.replace(rootPath, "")
            filename = file.replace(".hbs", "")
            fPath = "." + path + "/" + filename
            str = '"' + filename + '_hbs' + '": "' + fPath + '.hbs' + '",'
            allPathStr += str

# # SVG
# for root, dirs, files in os.walk(partialFilesPath):
#     for file in files:
#         if file.endswith(".hbs"):
#             path = root.replace(rootPath, "")
#             filename = file.replace(".hbs", "")
#             fPath = "." + path + "/" + filename
#             str = '"' + filename + "HBS" + '": "' + fPath  + '",'
#             allPathStr += str

allPathStr = allPathStr[:-1]
allPathStr += "}"
print allPathStr

