window.onload = function() {
	initializeStory();
    initializeVideo();
}

chrome.runtime.onMessage.addListener(function(req){
	if(req.message === 'urlChange') {
		initializeStory();
        initializeVideo();
	}
	else if(req.message === 'storyNewTabLoaded') {
		downloadStory(req.result, req.authorName);
	}
    else if(req.message === 'videoNewTabLoaded') {
		/*Getting all available video qualities from the mobile version tab*/
		getQualities(req.result, req.url, req.titleLink);
	}
	else if(req.message === 'error') {
		createErrorPopup(req.url, req.titleLink);
	}
});

function waitForLoad(query, callback){
	/*Function that waits for certain element to load and then performs callback function*/
	let promise = new Promise((res, rej) => {
		let count = 0;
		let timer = setInterval(()=>{
			if(document.querySelector(query) != null){
				clearInterval(timer);
				callback();

				res(true);
			}
			/*If element isn't loaded for long enough interval will be cleared
			This condition exists in order for interval not to last forever if something has gone wrong*/
			if(count >= 30){
				clearInterval(timer);

				rej(false);
			}
			count++;
		}, 20);
	});
	return promise;
}