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

A demo is available at this location: http://mango-reports.cloudant.com/mango-apps/_design/csv2couchdb/index.html
**Warning**: the demo couch is read-only, so you will not have access to the whole application. We recommend replicating to your own couch to get all features (see next section).
    
###Installation

Simply replicate the sample couchapp to your couchdb instance:
    
    curl -X POST http://user:pass@YOURCOUCH/_replicate -d '{"source":"http://mango-reports.cloudant.com/mango-apps/","target":"YOURDB", "doc_ids":["_design/csv2couchdb"]}' -H "Content-type: application/json"
    
After you install it, the app is available from this url: 

http://yourcouch/yourdb/_design/csv2couchdb/index.html

    
### Status

csv2couchdb is a new software and certainly contains bugs. It has been tested in Firefox 5 and Google chrome 12. Large files could be inserted using Firefox, whereas their parsing caused Google Chrome tab to crash.

Consider this app as an alpha software.
    
Thanks for reporting any issue that you would find.

### Roadmap

#### Corrections and enhancements

The following changes are planned:

* Improve errors handling
* If possible, solve crash of the app in Google Chrome when parsing of large files
* Performance improvement 
* Cleanup code and improve software architecture

#### New features

Features will be added according from feedback received from users.

Thanks for telling us the features you would like to see:

* Sources
    * API: load data from APIs
    * allow entering data in a text area input
    * Support fixed-length files
    * Read Excel file format

* Document generation
    * batch mode: support loading of multiple files that all have the same structure, without having to define settings for each of them
    * Support addition of extra fields to the document, typed by the user
    * Add data type selection option

* Possible further extensions
    * support RDBMS as a source
    * allow transformation of data (joining from different sources, more advanced filtering, aggregation ...)
    * create server side version of the tool, with automated run option (scheduling)

contact: either via github message, twitter ([@mango_info](http://twitter.com/mango_info)) or via contact form in http://www.mango-is.com

### License and credits

Please refer to the LICENSE file located in the same folder as the current file