/*
csv2couchdb couchapp released under MIT License
(c) Mango Information Systems SPRL - 2011
version 0.2 - August, 8th 2011

todo:
	handle file not conform error (when file is not a csv)
	handle file load error: the given file should be excluded (ideally retry option) so that other files still can be loaded
*/

/* Extract data from csv files at client side then push them into couchdb
Consists in 5 steps:
1) select files (HTML5 file API)
2) define settings for each file
3) set documents and couchdb settings
4) get feedback about bulk insert and select files to overwrite in case of conflict and retry in case of error
5) (if applicable) get feedback about overwrites / retries
*/

	// fileData contains data from read files
	var filesData = [];

	// currentStepkeeps track of steps
	var currentStep = 1;

	var $db = '';

	function errorHandler(evt) {
	// handle errors occuring when reading file
		switch(evt.target.error.code) {
		  case evt.target.error.NOT_FOUND_ERR:
			alert('File Not Found!');
			break;
		  case evt.target.error.NOT_READABLE_ERR:
			console.log(evt.target.error);
			alert('File is not readable');
			break;
		  case evt.target.error.ABORT_ERR:
			break; // noop
		  default:
			alert('An error occurred reading this file.');
			console.log(evt.target.error);
		};
	}

	function updateProgress(evt, fileIndex) {
	// update the file reading progress status display
	// evt is an ProgressEvent.
		progress = $('#bar'+fileIndex);
		
		if (evt.lengthComputable) {
			var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
			// increase the progress bar length.
			if (percentLoaded < 100) {
				progress.find('.percent').width(percentLoaded+'%');
				progress.find('.percent').text( percentLoaded+'%');
			}
		}
	}

	function handleFileSelect(evt) {
		var files = evt.target.files; // FileList object

		// files is a FileList of File objects. List some properties.
		var output = [];
		
		var counter=0;

		for (var i = 0, f; f = files[i]; i++) {
			// 1. show input and processing options for each file

			var $fileDiv = $('#step2 .template')
				.clone()
				.removeClass('template')
				.attr('id','file'+i)

			// set ids for the elements of the div (necessary to have labels clickable)
			$fileDiv.find('input').each(function() {
				$(this).attr('id', $(this).attr('id')+i);
				$(this).prop('checked', false);
			});
			$fileDiv.find('label').each(function() {
				$(this).attr('for', $(this).attr('for')+i);
			});

			$fileDiv.find('.progress_bar').attr('id','bar'+i);

			$fileDiv
				.appendTo('#filesContainer')
				.fadeIn();

			var reader = new FileReader();
			// Closure to capture the file information.

			progress = $('#bar'+counter);

			// Initialize progress indicator on new file selection.
			progress.find('.percent').width('0%');
			progress.find('.percent').text('0%');

			reader.onerror = errorHandler;
			
			reader.onprogress = function(e) {
			// handle progress of the file read
				updateProgress(e,counter);
			}

			// onload event necessary so that processing starts only once the file is read
			reader.onload = (function(theFile) {
				return function(e) {
				// Send file data to csv processor.

				var $input = $('#file'+counter);
				
				// display a spinner during the file update
				$input.find('div.filePreview > div:nth-child(2)').html('<img src="images/spinner.gif" alt="loading..."/> Parsing CSV data...');

				// update file preview div title
				$input.find('div.filePreview > div:nth-child(1)').text('Preview of 5 first rows');

				// add data to the global variable storing all files
				filesData.push({"name": theFile.name, "index":counter, "data": e.target.result});
								
				// process the current file
				processCsv($input, {});

				counter++;
				};
			})(f);

			// Read in the image file as a data URL.
			reader.readAsText(f);

		}

		currentStep++;

		// 2. show output options
		//displayOutputSettings();

		// 3. hide step 1
		$('#step1').hide();

		// 4. show step 2 
		$('#step2')
			.show();

	}

	function getFileOptions ($fileDiv) {
	// return values of the csv file settings chosen by the user
	// based on the page's form
	// return an object with following hashes: delimitors, delim, headerCheck, quote, quoteMark, startLine, endLine, excludedColumns
	// delim and quote are symbols whereas delimitors and quoteMark are text values
		var result = {};
		
		result.delimitors = [];
		$fileDiv.find('input[name="delimitor"]').each(function() {
		// get selected delimitors (preset delimitors)
		// .each used instead of for loop to save three selections of same item (item, then prop, then id)
			if($(this).prop('checked') && this.value !="custom") {
				result.delimitors.push(this.value);
			}
		});
		if ($fileDiv.find('.customdelimitors').val() != "") {
		// get custom delimitor if exists
			result.delimitors.push($fileDiv.find('.customdelimitors').val());
		}
		
		delim = encodeDelimitors(result.delimitors);
		result.delim = delim.regular.join('') + delim.custom;

		// get headerCheck value
		result.headerCheck = $fileDiv.find('input[name="header"]').prop('checked');

		result.quoteMark= "";
		// get quote marker
		$fileDiv.find('input[name="quoteMark"]').each(function() {
		// get selected quoteMark
		// .each used instead of for loop to save three selections of same item (item, then prop, then id)
			if($(this).prop('checked')) {
				result.quoteMark = this.value;
			}
		});
		
		result.startLine = $fileDiv.find('[type="text"][name="startLine"]').val();

		result.endLine = $fileDiv.find('[type="text"][name="endLine"]').val();

		result.excludedColumns = [];
		
		$('span.excluded', $fileDiv).each(function() {
		// addding each excluded column to the list
			result.excludedColumns.push($(this).parent()[0].cellIndex);
		});
		
		return result;
	}

	function processCsv($fileDiv, fileOpts) {
	// step 2: show options and preview for csv file

		if (!fileOpts)
			fileOpts = {};
		// retrieving index of the file
		var fileIndex = $fileDiv.attr('id').substr(4,1);
		var file = filesData[fileIndex];

		// detect column delimitor from a standard list at first run
		if (!fileOpts.delimitors) {
			fileOpts.delimitors = [];
			
			// detect delimitor
			fileOpts.delim = $.csvIn.detectDelimitor(file.data);
			// store string form of the delimitor
			fileOpts.delimitors.push(decodeDelimitor(fileOpts.delim));
		}

		// initialize quote marker at first run
		if(!fileOpts.quoteMark) {
			fileOpts.quoteMark = 'doubleQuote';
			fileOpts.quote= encodeQuoteMarkers(fileOpts.quoteMark);
		}

		// ignore excluded columns for the preview generation
		fileOpts.excludedColumns = [];
		
		// override startLine for the preview generation (header must appear)
		fileOpts.startLine = 0;
		
		// endLine not overriden for the preview generation because full parsing is needed to display total length
		// fileOpts.endLine = 6;
		// convert the file content into a javascript array

		var currentCsvArray = $.csvIn.toArray(file.data, fileOpts);

// console.log($.csvIn.toJSON(file.data, fileOpts));

		if(typeof fileOpts.headerCheck == 'undefined')
		// detect presence of header in case of first run
			fileOpts.headerCheck = $.csvIn.isHeader(currentCsvArray[0]);

		// setting file name
		$fileDiv.find('.divTitle').eq(0).text(file.name);

		for (i in fileOpts.delimitors) {
		// check checkbox for selected delimitors		
			if ($.inArray(fileOpts.delimitors[i], ["space", "colon", "comma", "semicolon", "hyphen", "tab"]) !=-1) {
			// regular delimitor, check appropriate checkbox
				$fileDiv.find('#'+fileOpts.delimitors[i]+file.index).prop('checked', true);
			}
			else {
			// delimitor is custom one, check custom checkbox and fill value inside text input
				if (typeof fileOpts.delimitors[i]!='undefined' && fileOpts.delimitors[i] !="") {
				// check custom only if there is a defined delimitor
					$fileDiv.find('#custom'+file.index).prop('checked', true);
					$fileDiv.find('#customdelimitors'+file.index).append(fileOpts.delimitors[i]);
				}
			}
		}

		// check radio button for the selected quote marker
		$fileDiv.find('#'+fileOpts.quoteMark+file.index).prop('checked', true);

		if (fileOpts.headerCheck)
		// check header checkbox in case a header has been detected
			$fileDiv.find('[type="checkbox"][name="header"]').prop('checked',true);

		// initialize row filters at first run
		if(!fileOpts.startLine) {
			fileOpts.startLine = 1;
			if (fileOpts.headerCheck)
			// increment start line to skip header if applicable
				fileOpts.startLine++;
		}

		// initialize row filters at first run
		if(!fileOpts.endLine) {
			fileOpts.endLine = currentCsvArray.length;
		}

		$fileDiv.find('[type="text"][name="startLine"]').val(fileOpts.startLine);

		$fileDiv.find('[type="text"][name="endLine"]').val(fileOpts.endLine);
		
		$fileDiv.find('span.totalRows').text('Total file length: '+currentCsvArray.length+' lines');

		// show file preview
		var result = previewCsv(currentCsvArray, fileOpts.headerCheck);
		$fileDiv.find('div.filePreview > div:nth-child(2)').html(result);

	}

	function previewCsv(data, headerCheck) {
	// show a preview of the csv file

		var result = "<table>";
		if(headerCheck) {
			result += "<thead><tr>";
			
			for (i in data[0]) {
				result += "<th><input type='checkbox' name='columnSelector' checked='checked'/><span class='editable'>"+data[0][i]+"</span></th>";
			}
			result += "</tr></thead>";
		}
		else {
			result += "<thead><tr>";
			
			for (i in data[0]) {
				result += "<th><input type='checkbox' name='columnSelector' checked='checked'/><span class='editable'>Column "+ (parseInt(i)+1) +"</span></th>";
			}
			result += "</tr></thead>";
		}
		
		// set length of the preview according to headerCheck and length of the file
		if (headerCheck) {
			var startLine = 1;
			var endLine = data.length>6?5:data.length-1;
		}
		else {
			var startLine = 0;
			var endLine = data.length>5?4:data.length-1;
		}
		
		result += "<tbody>";
		
		for (i =startLine;i<=endLine;i++) {
			result += "<tr>";
			for (j in data[i]) {
				result += "<td>"+data[i][j]+"</td>";
			}
			result += "</tr>";
		}
		result +="</tbody></table>";
		
		return result;
	}

	function columnSelection($targetTable, columnIds) {
	// add or remove excluded class to the given columns
		
		for (i in columnIds) {
		// toggle class for all cells belonging to the column
			$targetTable.find('tr >td:nth-child('+columnIds[i]+')').toggleClass('excluded');
			$targetTable.find('tr >th:nth-child('+columnIds[i]+') >span').toggleClass('excluded');
		}

	}

	function decodeDelimitor(delim) {
	// return name corresponding to delimitor code
	// necessary because signs cannot be used in DOM element ids
		switch(delim) {
			case " ":
				return "space";
			break;
			case ",":
				return "comma";
			break;
			case ":":
				return "colon";
			break;
			case ";":
				return "semicolon";
			break;
			case "-":
				return "hyphen";
			break;
			case "\t":
				return "tab";
			break;
		}		
	}

	function encodeDelimitors(delimitors) {
	// encode delimitors
	
		var result = {};
		result.regular = [];
		result.custom = "";

		for (i in delimitors) {
		// encode delimitors
			switch (delimitors[i]) {
				case "space":
					result.regular.push(" ");
				break;
				case "tab":
					result.regular.push("\t");
				break;
				case "colon":
					result.regular.push(":");
				break;
				case "semicolon":
					result.regular.push(";");
				break;
				case "comma":
					result.regular.push(",");
				break;
				case "hyphen":
					result.regular.push("-");
				break;
				default:
					if (typeof  delimitors[i] != 'undefined' && delimitors[i] !="") {
						result.regular.push(delimitors[i]);
						result.custom = delimitors[i];
					}
				break;
			}
		}
		return result;
	}

	function encodeQuoteMarkers(mark) {
	// encode quote markers
		switch(mark) {
		// encode quote marker
			case "doubleQuote":
				result = "\"";
			break;
			case "simpleQuote":
				result = "'";
			break;
			case "none":
				result = 0;
			break;
		}
		return result;
	}

	function generateDocuments () {
	// generate JSON couchdb document
	// fileDiv is a jquery selector containing the files information, whereas opts are the optiosn applicable to all files
		var result = [];
	
		// get output format value
		var outputFormat = $('input[name="outputFormat"]:checked').val();
		
		// get ids option value
		var ids = $('#ids').val();
		
		var $filesDiv = $('div.container', '#filesContainer');

		$filesDiv.each(function() {
		//$('#step'+currentStep+' >div').each(function() {
		// process individual file
		
			$input = $(this);
			
			var fileIndex = $input.attr('id').substr(4,1);
			
			// retrieving file options
			var fileOptions = getFileOptions ($input);
			
			// update start and end lines (0-indexed)
			fileOptions.startLine--;
			fileOptions.endLine--;
			
			fileOptions.customHeaders = [];
			
			$(this).find('th > span').each(function() {
			// retrieve custom headers labels
				fileOptions.customHeaders.push($(this).text());
			});
			
			// generate JSON document
			if (outputFormat == "byRow") {
			// generate one document per data row

				// convert the file content into a javascript array of JSON objects
				JSONdoc = $.csvIn.toJSON(filesData[fileIndex].data, fileOptions);


				if (ids == 'custom') {
				// process with generation of custom _id : file name and row number
					for (i in JSONdoc) {
					// go through each row, generate id and add document
						JSONdoc[i]._id = filesData[fileIndex].name+ (parseInt(i)+1);
						result.push(JSONdoc[i]);
					}
				}
				else {
				// add document without generating id
					for (i in JSONdoc) {
					// go through each row to add document
						result.push(JSONdoc[i]);
					}
				}

			}
			else {
			// generate one document per file

				// convert the file content into a javascript array
				var fileArray = $.csvIn.toArray(filesData[fileIndex].data, fileOptions);

				JSONdoc = {};
				
				if (ids == 'custom')
				// generate custom _id : file name
						JSONdoc._id = filesData[fileIndex].name;
				
				JSONdoc.headers = fileOptions.customHeaders;

				if (fileOptions.headerCheck) {
				// store header separately 
					fileArray.shift();
				}

				JSONdoc.rows = fileArray;
				
				// add array as a document
				result.push(JSONdoc);				
			}
		});
		return result;
	
	}

	function pushToDB(docs) {
	// insert documents into couchdb

		// get output settings
		var dbName = $('#dbName').val();

		$db = $.couch.db(dbName);

		$db.bulkSave({"docs":docs},{
			success: function(result) {
			// confirm that insertion was succcessfully done

				$('#bulkLoadSpinner').hide();

				$('#successDocs, #postProcessing').fadeIn();

				// check presence of recline design document in the database
				$db.allDocs({
					keys: ['_design/recline'],
					success: function(data) {
						if(!data.rows[0].error) {
						// insert link to recline in case recline design document exists in the target DB
							$('<div id="recline"><div><img src="images/recline-logo.png" alt="go to recline"/></div><div><h3>Continue to recline</h3><p>Process the documents in recline</p></div></div>').insertAfter('#moreFiles');
							// bind click event listener
							$('#recline').live('click',function() {
							// go to recline
								reclineUrl = '../../../' + $('#dbName').val() + '/_design/recline/_rewrite';
								window.location.href = reclineUrl;
							});


						}
					}
				});

				var successCount = 0;
				for (i in result) {
					if (!result[i].error) {
					// show confirmation for successful document insert
						// show list of inserted files by Id
							successCount++;
					}
					else if (result[i].error == 'conflict') {
					// show conflict documents and provide overwrite option

						// display the failed documents div in case it is not already visible
						$('#conflictDocs').not(':visible').fadeIn();
						
						var $conflictDoc = $('.template', '#conflictDocs')
							.clone()
							.removeClass('template')
							.attr('id','doc'+i)

						$conflictDoc.find('span')
							.text(result[i].id);

						$conflictDoc.find('input')
							.attr('fileName', docs[i]._id)
							.data('doc',docs[i])
							.data('formId','doc'+i);

						$conflictDoc
							.appendTo('#conflictDocs')
							.fadeIn();

						// get revision id of existing document
							$db.allDocs({
								keys: [result[i].id],
								context: $conflictDoc.find('input'),
								success: function(data) {
									this.context
										.data('rev',data.rows[0].value.rev);
								},
								error: function(jqXHR, textStatus, errorThrown) {
								// throw appropriate error message
									console.log(jqXHR);
									console.log(textStatus);
									console.log(errorThrown);
								}
							});
					}
					else {
					// show failed document inserts and provide retry option

						// display the failed documents div in case it is not already visible
						$('#failDocs').not(':visible').fadeIn();

						var $failDoc = $('.template', '#failDocs')
							.clone()
							.removeClass('template')
							.attr('id','doc'+i)

						$failDoc.find('span').eq(1)
							.text(result[i].id);

						$failDoc.find('span').eq(2)
							.text(result[i].error + ': ' + result[i].reason);

						$failDoc.find('input')
							.attr('fileName', docs[i]._id)
							.data('doc',docs[i])
							.data('formId','doc'+i);

						$failDoc
							.appendTo('#failDocs')
							.fadeIn();

						// get revision id of existing document
							$db.allDocs({
								keys: [result[i].id],
								context: $failDoc.find('input'),
								success: function(data) {
									this.context
										.data('rev',data.rows[0].value.rev);
								},
								error: function(jqXHR, textStatus, errorThrown) {
								// throw appropriate error message
									console.log(jqXHR);
									console.log(textStatus);
									console.log(errorThrown);
								}
							});
					}
				}
				if (successCount > 1)
					$('#successDocs').find('p').html(successCount + ' new documents were successfully inserted<br/>');
				else if (successCount == 1)
					$('#successDocs').find('p').html('1 new document was successfully inserted');
				else
				// successCount == 0
					$('#successDocs').find('p').html('No new document was inserted');
			},
			error: function(jqXHR, textStatus, errorThrown) {
			// throw appropriate error message
				$('#step4').html(textStatus + ' ' + errorThrown);
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});


// code to remember:     $.couch.urlPrefix = urlPrefix;	
// code to remember 2: JSON.stringify(array,null,'\t') or JSON.stringify(array,null,4) to have 4 spaces as separator
	}

    $(document).ready(function() {

		// Check whether user is already connected
		$.couch.session({
			success: function(data) {
				if (data.userCtx.name != null)
				// show logged in user name and logout button
					$('#session').html('logged in as '+data.userCtx.name+ ' <input type="submit" name="logOut" value="sign out"/>');
				else
				// show logon form
					$('#session').html('<form action="#"><label for="username">username</label><input type="text" name="username"><label for="password">password</label><input type="password" name="password"><input type="submit" name="logIn" value="log in"/></form>');
				
			},			
			error: function(data) {
				// show logon form
				$('#session').html('<form action="#"><label for="username">username</label><input type="text" name="username"><label for="password">password</label><input type="password" name="password"><input type="submit" name="logIn" value="log in"/></form>');
			}
		});

		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			// Great success! All the File APIs are supported.
		}
		else {
			$('#techDisclaimer').css('border','3px solid red');
			$('#html5Status').html('The HTML5 File APIs are not fully supported in this browser. Please try another browser (Firefox, Google Chrome, Opera)');
		}

		// todo: check whether this UI is suitable (jqueryUI buttons)
//		$( ".fileSettings > fieldset" ).eq(0).buttonset();


		// trigger proper function at file selection
// document.getElementById('files').addEventListener('change', handleFileSelect, false);
		$('#files').live('change', function(evt) {
			handleFileSelect(evt);
		});

		$('[type="submit"][name="next"]').live('click', function(e) {
		// go to next step
// console.log($('#step'+currentStep+' >div'))
			e.preventDefault();

			// 1. hide current step
			$('#step'+currentStep)
				.hide()

			// 2. increment step
			currentStep++;

			// 3. show next step
			$('#step'+currentStep)
				.fadeIn()

			// 4. perform specific processing if applicable
			if (currentStep == 3) {
			 // step 3, load databases list inside select
				$.couch.allDbs({
					success: function(data) {
						$dbsSelect = $('#dbName');
						data.sort();
						for (i in data) {
							if (data[i][0] !='_') {
								$dbsSelect									
								  .append($("<option></option>")
								  .attr("value",data[i])
								  .text(data[i]));
							}
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
					// replace dbs list with text input in case the database list is not accessible to the loged-in user
						$('#dbName').replaceWith('<input type="text" name="dbName" id="dbName"/>');
					}
				});
			}
			else if (currentStep == 4) {
			// step 4, load documents into couchdb

				// 4.2 generate couchdb documents
				var docs = generateDocuments ();
// temporary preview of the documents:
/*			var myText = '<pre><code>'+JSON.stringify(docs, null, '\t')+'</code></pre>';
			$('#step'+currentStep)
				.html(myText)
*/
				// 4.3 push documents to couchdb
				pushToDB(docs);

				
			}

		});

		$('[type="submit"][name="back"]').live('click', function(e) {
		// go to previous step
				
			e.preventDefault();
			
			// 1. hide current step
			$('#step'+currentStep)
				.hide()

			// 2. reset appropriate elements
			if (currentStep == 2) {
				$('#step'+currentStep).find('div.container').not('div.template').remove();
				filesData = [];
				$('#files').replaceWith('<input type="file" id="files" name="files[]" multiple />');
			}

			// 3. decrement step
			currentStep--;
			
			// 4. show previous step
			$('#step'+currentStep)
				.show();
		});

		$('[type="checkbox"][name="columnSelector"]').live('click', function() {
		// toggle selected column display
			var $input = $(this);
			var fileIndex = $input.parents().filter('div')[2].id.substr(4,1);
			var columnIndex = $input.parent()[0].cellIndex+1;

			columnSelection($input.parents('table'), [columnIndex]);

		});

		$('[type="checkbox"][name="delimitor"], [type="checkbox"][name="header"], [type="radio"][name="quoteMark"]').live('click', function() {
		// re-process the file when user clicks on a delimitor checkbox

			// cache file div selector
			var $input = $(this).parents().filter('div').eq(1);

			// store file index
			var fileIndex = $input.attr('id').substr(4,1);

			if (this.value=="custom" && $(this).prop("checked") == false) {
			// empty custom delimitor text input in case user unticks custom checkbox
				$input.find('.customdelimitors').val("");
			}

			if (this.name=="header") {
				if ($(this).prop("checked") == false && $input.find('[name="startLine"]').val() == 2)
				// set start row to 1 in case user unticks header box and first row is 2
					$input.find('[name="startLine"]').val(1);
				else if ($(this).prop("checked") == true && $input.find('[name="startLine"]').val() == 1)
				// set start row to 2 in case user ticks header box and first row is 1
					$input.find('[name="startLine"]').val(2);				
			}
		
			//retrieve selected options for the file
			var opts = getFileOptions($input);
		
			// refresh file display
			processCsv($input, opts);
			
		});

		$('.customdelimitors').live('blur',function() {
		// check/uncheck custom box and trigger preview refresh when custom delimitor has been typed
		
			// cache file div selector
			var $input = $(this).parents().filter('div').eq(1);

			var opts = getFileOptions($input);

			// store file index
//			var fileIndex = $input.attr('id').substr(4,1);
			
			processCsv($input, opts);
			
			$(this).parent().find('input[value="custom"]')
				.prop("checked",this.value==""?false:true);
		});

		$('[type="radio"][name="outputFormat"]').live('change', function() {
		// update custom id generation value when user changes the output format option
			if (this.value == "byRow") {
			// custom id for one document by row
				$(this).parent().find('#ids option[value="custom"]').html('file name and row number');
			}
			else {
			// custom id for one document by file
				$(this).parent().find('#ids option[value="custom"]').html('file name');
			}			
		});

		$('[type="submit"][name="logIn"]').live('click', function(e) {
		// sign user in
			e.preventDefault();

			var username = $('input[name="username"]', '#session').val();
			var password = $('input[name="password"]', '#session').val();

			// login the user
			$.couch.login({
				'name': username, 
				'password': password, 
				success: function(data) {
/*
					// replace login form by user name
						$('#session').html('logged in as '+data.name+ ' <input type="submit" name="logOut" value="sign out"/>');
*/
					// workaround to avoid some bug in couchdb1.0.2: username is not always returned in the callback function.
					$.couch.session({
						success: function(data) {
							if (data.userCtx.name != null)
							// replace login form by user name
								$('#session').html('logged in as '+data.userCtx.name+ ' <input type="submit" name="logOut" value="log out"/>');
						}
					});
				}
			});

		});
		
		$('[type="submit"][name="logOut"]').live('click', function(e) {
		// sign user in
			e.preventDefault();
			
			// log the user out
			$.couch.logout();
			
			// restore login form
			$('#session').html('<form action="#"><label for="username">username</label><input type="text" name="username"/><label for="password">password</label><input type="password" name="password"/><input type="submit" name="logIn" value="log in"/></form>');
		});

		$('[type="submit"][name="overwrite"]').live('click', function(e) {
		// overwrite selected document
			e.preventDefault();

			// cache the overwrite button selector
			$input = $(this);

			// disable overwrite button
			$input.prop('disabled',true);

			// display a spinner during the file update
			$('<img src="images/spinner.gif" alt="loading..."/>').insertAfter($input);

			doc = $input.data('doc');
			doc._rev = $input.data('rev');
			formId = $input.data('formId');

			$db.saveDoc(
				doc,{
				success: function(data) {
				// confirm that insertion was succcessfully done
					$('#'+formId).replaceWith('<p>document ' + doc._id +' was successfully updated</p>');
				},
				error: function(jqXHR, textStatus, errorThrown) {
				// throw appropriate error message
// console.log(jqXHR, textStatus, errorThrown)
					$('#'+formId).replaceWith('<p>Error updating document ' + doc._id +': '+jqXHR + ' ' + textStatus + ' - '+ errorThrown +'</p>');
				}
			});

		});

		$('[type="submit"][name="retry"]').live('click', function(e) {
		// retry document insertion
			e.preventDefault();
			
			doc = $(this).data('doc');
			doc._rev = $(this).data('rev');
			formId = $(this).data('formId');

			$db.saveDoc(
				doc,{
				success: function(data) {
				// confirm that insertion was succcessfully done
					$('#'+formId).replaceWith('<p>document ' + doc._id +' was successfully inserted</p>');
				},
				error: function(jqXHR, textStatus, errorThrown) {
				// throw appropriate error message
console.log(jqXHR, textStatus, errorThrown)
					$('#'+formId).replaceWith('<p>Error inserting document ' + doc._id +': '+jqXHR + ' ' + textStatus + ' - '+ errorThrown +'</p>');
				}
			});
			
		});

		$('#localFiles').click(function() {
		// trigger local files selection
			$('#files')[0].click();
		});

		$('#moreFiles').click(function() {
		// reset data and trigger local files selection
			// reset currentStep variable
			currentStep = 1;
			
			// reset data related to previous processing
			$('#step4').hide();
			$('#step1').show();
			$('#step2').find('div.container').not('.template').remove();
			$('#conflictDocs, #failDocs').find('form').not('.template').remove();
			$('#conflictDocs, #failDocs').find('p').remove();
			filesData = [];
			$('#files').replaceWith('<input type="file" id="files" name="files[]" multiple/>');
			$('#bulkLoadSpinner').show();
			$('#successDocs, #conflictDocs, #postProcessing').hide();
			
			// trigger file selection
			$('#files')[0].click();
		});

		$('.editable')
			.live('click', function() {
			// start inline editing
				var $editable = $(this);
				if ($editable.hasClass('active-inline')) {
					return;
				}
				var contents = $.trim($editable.html());
				$editable
					.addClass("active-inline")
					.empty();

				$('<input type="text" />')
					.val(contents)
					.appendTo($editable)
					.focus()
					.blur(function(e) {
						$editable.trigger('blur');
					});
			})
			.live('blur', function() {
			// end inline editing
				var $editable = $(this);
				var contents = $editable.find(':first-child:input').val();
				$editable
				.removeClass('active-inline')
				.contents()
				.replaceWith(contents);				
			});
    });
