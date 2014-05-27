GUI
===
- Toggle stations visibility.
- Toggle node merge.
- Choose the level to inspect. Level is a integer from 0 to 9. 0 means
  no partition. 9 is the finest partition.
- Choose sample ratio. The portion of the whole stations file to
  view. Showing all 85284 stations on google map makes it realy slow.
- Shuffle colors. Shuffle the color of markers randomly.

Data File List
==============
  - stations-lat-lon-weight*.csv
  - station-to-node*.csv
  - partition-tree-nid-coord-thres-k-n-dl-m*.csv

File Format Specs
=================

stations-sampled*.csv
---------------------
station-id,latitude,longitude[,weight]

Weight is number of records contains the TMIN or TMAX data.

station-to-node*.csv
--------------------
station-id,node-id

node-id can be an empty string (root node) or string of only '0's and
'1's.

partition-tree*.csv
-------------------
node-id,coord,threshold,k,n,dl,m

- coord is partitioned coordinate type, it is either 'lat' (latitude) or 'lon' (longitude).
- k is the number of eigenvectors.
- n is the number of samples
- dl is the descriptor length calculated using: dl = n * k + (k + 1) * 730
- m is a flag indicates whether the node should merged. '0' means no, '1' means yes.

node-descriptor-length.csv
--------------------------
node-id,k,nsamples,descriptor-length
