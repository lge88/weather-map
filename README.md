Data File List
==============
  - stations.csv
  - station-to-node.csv
  - partition-tree.csv
  - node-descriptor-length.csv

File Format Specs
=================

stations.csv
------------
station-id,latitude,longitude[,weight]

station-to-node.csv
-------------------
station-id,node-id

partition-tree.csv
------------------
node-id,(lat|lon),threshold

node-descriptor-length.csv
--------------------------
node-id,k,nsamples,descriptor-length
