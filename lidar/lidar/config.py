import ntpath
import fnmatch, re
import glob

src = "../data/2018/4810E_54570N.las"

print(ntpath.basename(src))

filename = ntpath.basename(src)
regex = re.compile(r'\d+')
east, north = regex.findall(filename)
