##csv2couchdb - populate couchdb from delimited files

csv2couchdb is a couchapp allowing to populate couchdb using data from CSV files. It takes advantage of the HTML5 file API to process files at client side before the upload to couchdb.

### Features:

* Read local files
    * Select multiple files at a time
    * Automatic detection of CSV format
    * Preview loaded files to adjust settings
* Customize document to generate
    * Filter rows and columns
    * Customize header labels
    * Generate either one doc per file or one doc per row
    * Generate ids based on file name or use couchdb random ids
* Bulk load to couchdb
    * Select target database
    * Overwrite existing documents in case of conflict (optional)

### Usage examples:

Consider the following CSV file that would be stored in your computer:

    color;popularity
    blue;5
    green;4.5
    red;3
    orange;4

1. Generate one document per file

    You would insert the following document to couchdb:

    ````javascript
    {
        "headers": ["color", "popularity"],
        "rows":[
         ["blue","5"],
         ["green","4.5"],
         ["red","3"],
         ["orange","4"]
        ]
    }
    ````

2. Generate one document per row

    You would insert the following documents to couchdb:

    ````javascript
    {
    "color" : "blue",
    "popularity" : "5"
    },
    {
    "color" : "green",
    "popularity": "4.5"
    },
    {
    "color" : "red",
    "popularity" : "3"
    },
    {
    "color" : "orange",
    "popularity" : "4"
    }
    ````

3. Filter rows

    Setting option `Get lines from 1 to 2` would generate a document containing only the first two lines (`blue` and `green` data)
    
4. Filter columns

    Untick the column header `popularity` to insert only colors.

5. Customize properties names:

    Click on `popularity` in the preview and replace it by another label you want, eg `rating`
    
### Demo

~~A demo is available at this location: http://mango-reports.cloudant.com/mango-apps/_design/csv2couchdb/index.html
**Warning**: the demo couch is read-only, so you will not have access to the whole application. We recommend replicating to your own couch to get all features (see next section).~~
    
###Installation

~~Simply replicate the sample couchapp to your couchdb instance:
    
    curl -X POST http://user:pass@YOURCOUCH/_replicate -d '{"source":"http://mango-reports.cloudant.com/mango-apps/","target":"YOURDB", "doc_ids":["_design/csv2couchdb"]}' -H "Content-type: application/json"~~

Clone this repository into the right folder, and you should be good to go.

After you install it, the app is available from this url: 

http://yourcouch/yourdb/_design/csv2couchdb/index.html

    
### Status

csv2couchdb is a new software and certainly contains bugs. It has been tested in Firefox 5 and Google chrome 12. Large files could be inserted using Firefox, whereas their parsing caused Google Chrome tab to crash.

Consider this app as an alpha software.
    
Thanks for reporting any issue that you would find.

### Roadmap

This app is not maintained anymore. Compatibility with newer versions of couchdb has not been checked.

contact: either via github message, twitter ([@mango_info](http://twitter.com/mango_info)) or via contact form in http://www.mango-is.com

### License and credits

Please refer to the LICENSE file located in the same folder as the current file
