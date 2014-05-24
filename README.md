GUI
===
- Toggle stations visibility.
- Choose the level to inspect. Level is a integer from 0 to 9. 0 means
  no partition. 9 is the finest partition.
- Choose sample ratio. The portion of the whole stations file to view. Showing
  all 85284 stations on google map makes it realy slow.
- Shuffle colors. Shuffle the color of markers randomly.

Data File List
==============
  - stations-sampled*.csv
  - station-to-node*.csv
  - partition-tree*.csv
  - node-descriptor-length.csv

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
node-id,(lat|lon),threshold

Second field describes the dimension (either in latitude or in
longitude direction) that partition node devides its parent. Threshold
is the value of latitude or longitude.

node-descriptor-length.csv
--------------------------
node-id,k,nsamples,descriptor-length

descriptor length (dl) is calculated using:

dl = nsamples * k + (k + 1) * 730
