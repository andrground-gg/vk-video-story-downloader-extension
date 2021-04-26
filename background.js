let url, senderId, titleLink, inMessenger, authorName, msg;

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        chrome.tabs.sendMessage(tabId, {
		    message: 'urlChange',
		    url: changeInfo.url,
	    });
    }
    /*Listener for new mobile tab to be opened and completely loaded*/
    if (tab.url.indexOf(url) != -1 && changeInfo.status == 'complete') {  
        if(msg == 'fetchSources') {
            if(inMessenger) {
                /*This code is being executed in video list, so i need to scroll it
                all the way down and find video with certain url and then send new message here*/
                chrome.tabs.executeScript(tabId, {
                    code : `
                        let scrollInterval = setInterval(() => {
                            let videoLinks = Array.from(document.querySelectorAll('.video_href'));
                            let video = videoLinks.find(vid => vid.href.includes("${titleLink.url}"));
                            if(document.querySelector('.show_more') == null || video) {
                                clearTimeout(scrollInterval);                           
                                chrome.runtime.sendMessage({ href: video?.href || false });
                            }
                            document.querySelector('.show_more').click();
                        }, 200);
                        `
                }, () => {
                    new Promise(resolve => {
                        chrome.runtime.onMessage.addListener(function listener(result) {
                            /*Adding a listener because executed code is asynchronous and then deleting it 
                            and resolving returned result*/
                            chrome.runtime.onMessage.removeListener(listener);
                            resolve(result);
                        });
                    }).then(result => {
                        /*If the video was not found or a different error occured*/
                        if (chrome.runtime.lastError || result.href == false) {
                            chrome.tabs.sendMessage(senderId, {
                                message: 'error',
                                url,
                                titleLink
                            });
                            chrome.tabs.remove(tabId);
                        }

                        /*After getting correct video link i am creating a new tab ans making 
                        inMessenger false to get source links of the video*/
                        url = result.href;
                        inMessenger = false;
                        console.log(url);
                        chrome.tabs.create({ url });
                        //Immediately focusing on sender, not on new tab
                        chrome.tabs.update(senderId, { 'active': true });
            
                        chrome.tabs.remove(tabId);
                    }).catch(() => {
                        chrome.tabs.remove(tabId);
                    });
                });
            }
            else {
                chrome.tabs.executeScript(tabId, {
                    code: `Array.from(document.querySelectorAll('source[type="video/mp4"]')).map(s => s.src)`
                }, (result) => {
                    if (chrome.runtime.lastError) {
                        chrome.tabs.sendMessage(senderId, {
                            message: 'error',
                            url,
                            titleLink
                        });
                        chrome.tabs.remove(tabId);
                    }
                    //Sending source links back to the content script
                    chrome.tabs.sendMessage(senderId, {
                        message: 'videoNewTabLoaded',
                        result: result[0],
                        url,
                        titleLink
                    });
                    chrome.tabs.remove(tabId);
                    url = undefined;
                });
            }
        }
        else if(msg == 'downloadStory') {
            chrome.tabs.executeScript(tabId, {
                /*If the story is video it doesn't have content image, so just searching for a video src
                If the story is a photo, then searching for content image background and getting rid of unwanted string parts*/
                code: `
                    if(document.querySelector('.Story__content_image')) { 
                        let imgUrl = document.querySelector('.Story__content_image').style.backgroundImage;
                        result = imgUrl.substring(5, imgUrl.length - 2);
                    }
                    else 
                        result = document.querySelector('video').src;
                    result;
                `
            }, (result) => {
                /*Sending result back to the content script*/
                chrome.tabs.sendMessage(senderId, {
                    message: 'storyNewTabLoaded',
                    result: result[0],
                    authorName
                });
                chrome.tabs.remove(tabId);
                url = undefined;
            });
        }
    };
});

chrome.runtime.onMessage.addListener(function(req, sender){
    /*Downloadig either video or a story*/
    if(req.message === 'fetchSources') {
        url = req.mobileURL;
        senderId = sender.tab.id;
        msg = req.message;
        titleLink = req.titleLink;
        inMessenger = req.inMessenger;

        chrome.tabs.create({ url });
        
        /*Immediately focusing on sender, not on new tab*/
        chrome.tabs.update(senderId, { 'active': true });	
    }
    else if(req.message === 'downloadStory') {
        url = req.mobileURL;
        senderId = sender.tab.id;
        authorName = req.authorName;
        msg = req.message;

        chrome.tabs.create({ url });
        chrome.tabs.update(senderId, { 'active': true });	
    }
    
});