// ==UserScript==
// @name         pinterest sucks
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Iz
// @match        https://www.pinterest.com/*
// @match        https://www.pinterest.co.uk/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @run-at      document-start
// ==/UserScript==

/*
 HERE BE DRAGONS
 THIS IS NOT HEAVILY TESTED AND SHITS ALL OVER PINTEREST'S BANDWIDTH
 YOU MAY GET 403s OR OTHER THINGS
 DO NOT USE IF YOU'RE WORRIED FOR YOUR ACCOUNT
 THIS IS NOT DESIGNED FOR REGULAR PINTEREST USE
*/

const $ = window.jQuery;

waitForKeyElements (
    "#__PWS_ROOT__",
    obsv
);

$(window).ready(function(){
    $('html').append('<style id="replacementCSS">#credential_picker_container{display:none}#replacementFeed{position:absolute!important;top:0!important;display:flex;flex-wrap:wrap;gap:10px;width:calc(100% - 20px);margin-left:0;justify-content:space-between;background:#fff!important}.overridenImage{display:flex;width:calc(20vw - 20px)!important;max-width:25vw!important}.overridenImage>img{display:block;object-fit:contain}</style>')
})

function obsv(){
// Select the node that will be observed for mutations
const targetNode = document.getElementById('__PWS_ROOT__');

// Options for the observer (which mutations to observe)
const config = { attributes: false, childList: true, subtree: true };

// Callback function to execute when mutations are observed
const callback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === 'childList') {
      replaceImages();
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);
}

function replaceImages(){
     $('[data-test-id="suggested-interests"]').remove();
    var container = $('#replacementFeed');
    if (container.length==0){$('[data-layout-shift-boundary-id="BoardPageContainer"]').append('<div id="replacementFeed"></div>')}
    var pins = $('[role="listitem"]');
    for(var i=0;i<pins.length;i++){
     if($(pins[i]).hasClass('addedButton')==false){
         $(pins[i]).toggleClass('addedButton');
         var imageID = $(pins[i]).find('[data-test-id="pin"]').attr('data-test-pin-id');
         if ( $('[imgid="'+imageID+'"]').length<1){
             var image = $(pins[i]).find('img');
             image = image.attr('src');
             image = image.replace('236x','originals');
             $(pins[i]).empty();
             var req = new XMLHttpRequest();
             req.open('GET', image, false);
             req.send();
             if (req.status === 400 || req.status === 403 || req.status === 404) {
                 image = image.replace('jpg','png');
                 $("#replacementFeed").append('<div class="overridenImage" imgID="'+imageID+'"><img class="buttonOverride" src="'+image+'"></img><div>');
             }
             else{
                 $("#replacementFeed").append('<div class="overridenImage" imgID="'+imageID+'"><img class="buttonOverride" src="'+image+'"></img><div>');
     }}}
    }
};
