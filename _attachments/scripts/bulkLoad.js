onmessage = function(event) {

	var url = event.data.url;
	var docs = event.data.docs;
	
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
		if (req.readyState == 4) {
			result = {};
			result.response=JSON.parse(req.responseText);
			if(req.status == 201) {
				result.success = true;
				postMessage(JSON.stringify(result));
			}
			else {
				postMessage(JSON.stringify(result));				
			}			
			close();
		}
	};
	req.open('POST', url);
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(JSON.stringify({docs: docs}));


}