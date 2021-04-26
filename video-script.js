function createVideoButton() {
	let downloadBtn = document.createElement('div');
	downloadBtn.classList.add('like_btn');
	downloadBtn.setAttribute('id', 'mv_download_button');
	downloadBtn.innerHTML = `
		<div class="like_button_label" style="margin-left:0">Скачать</div>
		<span class="blind_label">Скачать</span>`;

	return downloadBtn;
}

function insertVideoButton(btn, isPrivate) {
	document.querySelector('#mv_info .like_btns').insertBefore(btn, document.querySelector('#mv_info .like_btns .ui_actions_menu_wrap'));
		
	observer.observe(document.querySelector('#mv_info'), { childList: true });

	btn.addEventListener('click', () => {
		let titleLinkElem = document.querySelector('#mv_player_box .videoplayer_title_link');

		let titleLink = {
			/*Deleting all dots in video title for it to be downloaded in adequate format*/
			title: titleLinkElem?.innerText.replace(/\./g, "") || "Без названия",
			url: 'https://m.' + titleLinkElem?.href.slice(8)
		}				


		/*If the video was sent to user in private messages and is private
		then url goes to the list of videos and then searches for it there
		because it is not possible to get direct link from this point*/
		let mobileURL = titleLink.url;

		let inMessenger = false;
		/*If the video is private then i need to know if it it was sent in private messages or
		user tries to download it from somewhere else where it is for some reason private(example: group publishing video from closed profile)*/
		if(isPrivate) {
			/*im-page-wrapper is wrapper for private messages page so it determines where user tries to download video from*/
			if (document.querySelector('.im-page-wrapper') != null) {
				inMessenger = true;
				/*Getting chat id and figuring out if this is a group chat or not*/
				let chatId = location.href.split('sel=')[1].split('&')[0];
				if(chatId[0] == 'c')
					chatId = chatId.substring(1);
				mobileURL = 'https://m.vk.com/mail?act=show_medias&' + (document.querySelector('._im_chat_members') == null ? 'peer=' : 'chat=') + chatId + '&section=video';
			}
			else {
				inMessenger = false;
				mobileURL += '?list=' + location.href.split('%2F')[1];
			}
		}
				
		createPopup(mobileURL, titleLink, inMessenger);
	});
}


const observer = new MutationObserver(function() {
	initializeVideo();	 	
});
  
async function initializeVideo() {
	/*Function returns if there is no video layer wrap or if it is invisible or if the download button already exists*/
	if(document.querySelector('#mv_layer_wrap') == null || document.querySelector('#mv_layer_wrap').style.display == 'none' 
			 || document.querySelector('#mv_download_button') != null)
		return;

	let downloadBtn = createVideoButton();

	/*Adding download button only after "like_btns" had loaded*/	
	await waitForLoad('#mv_info .like_btns', () => insertVideoButton(downloadBtn)).catch(() => {
		/*Catching situations where "like_btns" do not exist and creating it manually*/
		document.querySelector('#mv_info').style.display = 'block';
		const actionsBlock = document.createElement('div');
		actionsBlock.classList.add('mv_actions_block');
		actionsBlock.innerHTML = `
			<div class="like_wrap">
				<div class="clear_fix">
					<div class="like_cont">
						<div class="like_btns">
						</div>
					</div>
				</div>
			</div>`;
		document.querySelector('#mv_info').append(actionsBlock);

		insertVideoButton(downloadBtn, true);
	});
}

function createPopup(mobileURL, titleLink, inMessenger) {
	/*Sending message to background to open new tab and get source links*/
	chrome.runtime.sendMessage({ mobileURL, titleLink, message: "fetchSources", inMessenger });

	let popup = document.createElement('div');
	popup.classList.add('popup_box_container');
	popup.setAttribute('style', 'width:450px;height:auto;margin-top:20em');
	popup.innerHTML = `
		<div class="box_layout"">
			<div class="box_body box_no_title box_no_buttons" style="display: block; padding: 0px;">
				<div class="like_share_wrap">
					<div class="box_x_button box_x_tabs" aria-label="Закрыть" tabindex="0" role="button"></div>
				</div>
			</div>
		</div>
	`;
	/*Before obtaining source links popup is invisible, loader is visible*/			
	document.querySelector('#box_layer').append(popup);
	document.querySelector('.popup_box_container').style.display = 'none';
	document.querySelector('#box_layer_wrap').style.display = 'block';
	document.querySelector('#box_loader').style.display = 'block';
	document.querySelector('#box_loader').style.marginTop = '25em';

	document.querySelector('.popup_box_container .box_layout .box_body .like_share_wrap .box_x_button').addEventListener('click', (e) => {
		/*Closing the popup*/
		e.target.parentNode.parentNode.parentNode.parentNode.remove();
		document.querySelector('#box_layer_wrap').style.display = 'none';
		document.querySelector('#box_layer_bg').style.display = 'none';
	});
}

function getQualities(sourcesLinks, mobileURL, titleLink) {
	try {		
		if(sourcesLinks.length) { 
			let qualities = [];

			/*I have seen two types of video source links*/
			if(sourcesLinks[0].split('.')[1] == 'vkuservideo'){
				/*First one has quality in itself*/
				qualities = sourcesLinks.map(s => s.split('.')[3]);
			}
			else {
				/*Second one has a type attribute which defines a quality*/
				for(let s of sourcesLinks){
					let type = s.substring(s.indexOf('type=') + 5, s.indexOf('type=') + 6);
					switch(type){
						case '4': qualities.push('144'); break;
						case '0': qualities.push('240'); break;
						case '1': qualities.push('360'); break;
						case '2': qualities.push('480'); break;
						case '3': qualities.push('720'); break;
					}
				}
			}

			for(let qual of qualities) {
				let qualityBtn = document.createElement('button');
				qualityBtn.classList.add('flat_button');
				qualityBtn.classList.add('quality_button');
				qualityBtn.setAttribute('style', 'margin:5px');
				qualityBtn.innerText = qual + 'p';

				document.querySelector('.popup_box_container .box_layout .box_body .like_share_wrap').append(qualityBtn);
			}
			/*Once everything is ready hide loader and show container*/
			document.querySelector('.popup_box_container').style.display = 'block';
			document.querySelector('#box_loader').style.display = 'none';
			document.querySelector('#box_layer_bg').style.display = 'block';

			const qualityButtons = document.querySelectorAll('.quality_button');
			for(let i = 0; i < qualityButtons.length; i++) {
				qualityButtons[i].addEventListener('click', ()=>{
					let url = sourcesLinks[i];
					fetch(url).then(res => res.blob())
						.then(blob => {
							/*Each quality button when clicked creates a blob url because only using it download process
							starts automatically*/
							const blobURL = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = blobURL;
							a.style = "display: none";

							a.download = titleLink.title;
							document.body.appendChild(a);
								
							a.click();
							a.remove();
						});
				});
			}
		}
		else {
			console.log("EMPTY SOURCELINKS")
			createErrorPopup(mobileURL, titleLink);
		}

	}
	catch(e) {
		console.log(e);
		createErrorPopup(mobileURL, titleLink);
	}
}

function createErrorPopup(mobileURL, titleLink) {
	/*Error that appears on popup instead of quality buttons*/
	const error = document.createElement('p');
	error.innerText = 'Ошибка';
	document.querySelector('.popup_box_container .box_layout .box_body .like_share_wrap').append(error);

	document.querySelector('.popup_box_container').style.display = 'block';
	document.querySelector('#box_loader').style.display = 'none';
	document.querySelector('#box_layer_bg').style.display = 'block';

	let repeatBtn = document.createElement('button');
	repeatBtn.classList.add('flat_button');
	repeatBtn.setAttribute('id', 'repeat_button');
	repeatBtn.innerText = "Попробовать снова";

	document.querySelector('.popup_box_container .box_layout .box_body .like_share_wrap').append(repeatBtn);

	repeatBtn.addEventListener('click', (e) => {
		e.target.parentNode.parentNode.parentNode.parentNode.remove();
		document.querySelector('#box_layer_wrap').style.display = 'none';
		document.querySelector('#box_layer_bg').style.display = 'none';
		createPopup(mobileURL, titleLink);
	});
}