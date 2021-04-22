set -e
API_TOKEN="1df1565c-f95d-44d0-9fd8-d047fa8e6ca4"
URL="http://demo.dataverse.org"
PERSISTENT_ID="hdl:11272.1/AB2/KET75X/GUXQBT"
curl -L -O -J -H X-Dataverse-key:$API_TOKEN $URL/api/access/datafile/:persistentId/?persistentId=$PERSISTENT_ID -o test.zip

