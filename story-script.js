function createStoryButton() {
	let downloadBtn = document.createElement('div');
	downloadBtn.classList.add('StoryButton');
	downloadBtn.classList.add('StoryButton--download');
	/*White download icon inverted*/
	downloadBtn.innerHTML = `<img src="https://img.icons8.com/android/24/000000/download.png" style="filter:invert(100%)">`

	return downloadBtn;
}

function insertStoryButton(btn) {
	let bottomControls = document.querySelectorAll('.stories_item.active .stories_story_bottom_controls');
	let shareButtons = document.querySelectorAll('.StoryButton--share');
	/*I need to get last active story and insert my button there*/
	bottomControls[bottomControls.length - 1].insertBefore(btn, shareButtons[shareButtons.length - 1]);

	btn.addEventListener('click', () => {
		let mobileURL = 'https://m.' + location.href.slice(8);
		/*For some reason on mobile it is written through z*/
		mobileURL = mobileURL.replace('w=story', 'z=story');

		let storiesLayers = document.querySelectorAll('.stories_layer');
		/*If the user comes back from story replies to origin then url doesn't change and story display type becomes table, 
		original story's id is still in the url.*/
		if(mobileURL.includes('%2Freplies-') && storiesLayers[storiesLayers.length - 1].style.display == 'table') {
			/*Getting original story id*/
			let storyId = mobileURL.split('%2Freplies-')[1];
			mobileURL = mobileURL.split('%2Freplies-')[0].split('story')[0] + 'story-' + storyId;
		}
		else {
			/*Deleting unnecessary url part*/
			mobileURL = mobileURL.split('%2F')[0];
		}
		/*Getting author name and deleting all dots for file extension to be ok*/
		let authors = document.querySelectorAll('.stories_item.active .StoryInfo__title--author');
		let authorName = authors[authors.length - 1].innerText.replace(/\./g, "") || "Без названия";
		chrome.runtime.sendMessage({ mobileURL, authorName, message: "downloadStory" });
	});
}
function downloadStory(url, authorName) {
	fetch(url).then(res => res.blob())
			.then(blob => {
			/*Button when clicked creates a blob url because only using it download process
			starts automatically*/
			const blobURL = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = blobURL;
			a.style = "display: none";

			a.download = authorName;
			document.body.appendChild(a);
								
			a.click();
			a.remove();
		});
}
  
async function initializeStory() {
	/*If there are no active stories, if they are failed because of, for example, private settings,
	or if amount of active stories equals amount of download buttons(that means there already is a button and
	new shouldn't be created), then button isn't created.*/
	let activeStories = document.querySelectorAll('.stories_item.active');
	if(!activeStories.length || activeStories[activeStories.length - 1]?.classList?.contains('failed')
		 || activeStories.length == document.querySelectorAll('.StoryButton--download').length)
		return;
		
	let downloadBtn = createStoryButton();
	//insertStoryButton(downloadBtn);
	await waitForLoad('.stories_item.active .stories_story_bottom_controls', () => { insertStoryButton(downloadBtn); })
	
}	
