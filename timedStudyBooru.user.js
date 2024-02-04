// ==UserScript==
// @name         timedStudyBooru
// @namespace    http://tampermonkey.net/
// @version      2024-02-4
// @description  lazy random image timer tampermonkey edition
// @author       Izuthree
// @match        https://danbooru.donmai.us/posts/*
// @match        https://safebooru.donmai.us/posts/*
// @match        https://e621.net/posts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL https://update.greasyfork.org/scripts/485413/timedStudyBooru.user.js
// @updateURL https://update.greasyfork.org/scripts/485413/timedStudyBooru.meta.js
// ==/UserScript==

/*
todo:
- image set count limit
- search term switching
- day awareness/schedule
- gui overhaul
- fix behaviour when blacklisted image and not enabled
*/


let domain = window.location.hostname;
let studyTopic = GM_getValue('studyTopic');
let fullTimer = parseInt(GM_getValue('studyTimer'));
let timeout = parseInt(GM_getValue('studyTimer'));
let enabled = GM_getValue('enabled');
let toggled = GM_getValue('exerciseVisible');
let multiPart = GM_getValue('multiPart');
let improvPractice = GM_getValue('improvPractice');
let improvDelay = GM_getValue('improvDelay');
let restDelay = parseInt(GM_getValue('restDelay'));
let randomFlip = GM_getValue('randomFlip');
let setLength = parseInt(GM_getValue('setLength'));
let countdownTimer;
const $ = window.jQuery; //im lazy

$(window).ready(function(){
    //skip immediately if blacklisted, upgrade needed or removed and the script is active
    if($('.image-container [href="/upgrade').length>0 || $('#blacklist-list>li').length>0){
        if(enabled && toggled){window.location.href = "https://"+domain+"/posts/random?tags="+studyTopic;}}
    else if($('#page>p').length>0){
        if(enabled && toggled && $('#page>p').html().indexOf('takedown request.')>-1){
            window.location.href = "https://"+domain+"/posts/random?tags="+studyTopic;
    }}

    else{
    //if any undefined assume first run and get/set defaults
    if (enabled==undefined||studyTopic==undefined||fullTimer==undefined||toggled==undefined){
        studyTopic = 'order:rank'; GM_setValue('studyTopic','order:rank');
        fullTimer = 150; timeout = 150; GM_setValue('studyTimer','150');
        enabled = false; GM_setValue('enabled','false');
        toggled = false; GM_setValue('exerciseVisible','false');
    }
    if(multiPart==undefined){multiPart = false;}
    if(improvPractice==undefined){improvPractice = false;}
    if(improvDelay==undefined){improvDelay=15};
    if(restDelay==undefined){restDelay=0};
    if(randomFlip==undefined){randomFlip=false;};
    if(setLength==undefined){setLength=-1;};

    //embed stuff after you fixed for defaults not before dumbass
    embeds();

    //weird but prevents it flickering enabled then disabling
    $('body').addClass('studyModeActive');
    if(improvDelay=='0'&&improvPractice&&enabled){$('.image-container').addClass('improvToggle');}
    if(!toggled){$('.studymode').prop('disabled',true);}

    //if any properties are true, apply them immediately
    if(multiPart){$('.multiPartMode').toggleClass('dialogInactive');}
    if(improvPractice){$('.improvMode').toggleClass('dialogInactive');}
    if (enabled==true) {$('.studymode').prop('disabled',false); countdownTimer = setInterval(countdown, 1000);}
    if (randomFlip==true){
        $('.randomHorizontal').toggleClass('dialogInactive');
        if(Math.floor(Math.random()*100)>50){
            $('.horizontalFlip').toggleClass('dialogInactive');
            $('.image-container').toggleClass('horFlipped');
        }
    }
    //study button click handler
    $('.studyButton').click(function(){startStudying()});

    //skip button
    $('.skipButton').click(function(){changeImage()});

    //mode toggles
    $(".multiPartMode").click(function(){multiPart = !multiPart; $('.multiPartMode').toggleClass('dialogInactive');setValues()});
    $(".improvMode").click(function(){improvPractice = !improvPractice; $('.improvMode').toggleClass('dialogInactive');setValues()});
    $(".randomHorizontal").click(function(){$('.randomHorizontal').toggleClass('dialogInactive');randomFlip=!randomFlip;setValues()});
    $(".horizontalFlip").click(function(){
        $('.horizontalFlip').toggleClass('dialogInactive');
        $('.image-container').toggleClass('horFlipped');
    });

    //toggle study mode
    $('.showHideStudy').click(function(){$('body').toggleClass('studyModeActive'); enabled=false; setValues();
                                         $('.studymode').prop('disabled',!$('.studymode').prop('disabled'));
                                         toggled = !$('.studymode').prop('disabled'); GM_setValue('exerciseVisible',toggled);});

    $(".studyTimer").on("input", function() {fullTimer = parseInt($('.studyTimer')[0].value); $('.timer').html(fullTimer); setValues();});
    $(".restTimer").on("input", function() {restDelay = parseInt($('.restTimer')[0].value); setValues();});
    $(".improvDelay").on("input", function() {improvDelay = parseInt($('.improvDelay')[0].value); setValues();});

    }
});

function startStudying(){
    enabled = !enabled; setValues();
    if(enabled==true){ countdownTimer = setInterval(countdown, 1000); }
    else{ clearInterval(countdownTimer); timeout = parseInt($('.studyTimer')[0].value); $('.timer').html(fullTimer);
        $('.image-container').removeClass('improvToggle');$('.image-container').removeClass('multiPartToggle'); }
}

//set localstorage variables
//super lazy to set them all at once in a big function but I can't be arsed to make this more elegant
function setValues(){
    //reset timeout means you can't pause and resume but I don't care to fix this rn
    timeout = parseInt($('.studyTimer')[0].value);
    GM_setValue('exerciseVisible',toggled);
    studyTopic = $('.studyTopic')[0].value;
    fullTimer = parseInt($('.studyTimer')[0].value);
    GM_setValue('studyTopic',$('.studyTopic')[0].value);
    GM_setValue('studyTimer',$('.studyTimer')[0].value);
    GM_setValue('multiPart',multiPart);
    GM_setValue('improvDelay',$('.improvDelay')[0].value);
    GM_setValue('restDelay',$('.restTimer')[0].value);
    GM_setValue('randomFlip',randomFlip);
    GM_setValue('improvPractice',improvPractice);
    GM_setValue('enabled',enabled);
}

function changeImage(){
setValues();
window.location.href = "https://"+domain+"/posts/random?tags="+studyTopic;
}

//shitty countdown but it does its job enough:tm:
function countdown(){
    if(enabled){
        timeout--;
        if(timeout>-1){$('.timer').html(timeout);}
        else{$('.timer').html("Resting...");}

        if(timeout < 1){clearInterval(countdownTimer); setTimeout(changeImage, (restDelay*1000));}
        if(timeout<=(fullTimer/2) && multiPart==true && $('.image-container').hasClass('multiPartToggle')==false){
               $('.image-container').addClass('multiPartToggle'); $('.timer').html(timeout);
        }
        //if session length is less than 15s, disable it
        //after improvDelay elapsed, blur the image
        //only if timer is more than 15 seconds
        if(fullTimer>15 && timeout<=(fullTimer-improvDelay) && timeout>15 && improvPractice==true && $('.image-container').hasClass('improvToggle')==false){
               $('.image-container').addClass('improvToggle'); $('.timer').html(timeout);
        }
        //if timer is less than 15 seconds, unblur the image to review versus the reference
        if(timeout<=15 && improvPractice==true && improvDelay!=0){$('.image-container').removeClass('improvToggle');}
    }
}

//solely so I can collapse this mess lol
function embeds(){
$('body').append("<div class='studyContainer' style='display:none'>\
<div class='studyButton' title='Start/stop studying! (Hotkey 1)'>⏯</div>\
<input type='text' class='studyTopic' title='The search term to use for study topic.' value='"+studyTopic+"'></input>\
<input type='number' class='studyTimer' title='The duration of the timer.' min='0' value='"+fullTimer+"'></input>\
<input type='number' class='restTimer' min='0' title='The rest delay before switching to the next picture.' value='"+restDelay+"'></input>\
<div class='skipButton' title='Skip to next image (Hotkey 2)'>⏩</div>\
<div class='modeDialog dialogInactive multiPartMode' title='After half duration is elapsed, image turns greyscale (Hotkey 3)'>Multi-part mode enabled</div>\
<div class='modeDialog dialogInactive improvMode' title='After 15 seconds, image is blurred significantly (Hotkey 4)'>Improv mode enabled</div>\
<input type='number' class='improvDelay' min='0' title='The delay before blurring the picture.' value='"+improvDelay+"'></input>\
<div class='modeDialog dialogInactive randomHorizontal' title='Randomly flip image horizontally on load (Hotkey 5)'>Random Horizontal Flip</div>\
<div class='modeDialog dialogInactive horizontalFlip' title='Flip horizontally (Hotkey H)'>H</div>\
</div>");


$('body').append("<div class='timer'>"+fullTimer+"</div>");
$('body').append("<div class='showHideStudy' style='position:fixed;height:25px;background:#333;color:white;bottom:0px;right:0px;padding:5px;z-index:99;'>Toggle Study Mode</div>");
$('body').append("<style>.panicbutton{opacity:0;!important}</style>");
$('body').append("<style class='studymode'>\
.timer{position:fixed;bottom:50px;left:0;font-size:8vw;padding:10px;height:8vw;line-height:calc(10vw - 20px);color:rgba(255,255,255,1);text-shadow:0px 0px 7px black;z-index:99;}\
.image-container{position:fixed;top:0!important;left:0;width:100vw;height:100vh!important;background:black;margin:0!important;z-index:98;}\
.image-container>picture{display:flex!important;width:100vw!important;height:100vh!important;}\
.image-container>picture>img{    height:100%!important;    width:100%!important;    object-fit:contain!important;    max-width:100%!important;    max-height:100%!important;}\
.studyContainer{width:calc(100vw - 200px);height:24px;position:fixed;bottom:0px;left:0px;z-index:999999999990;display:flex!important;}\
.studyTopic{width:220px;}\
.studyTimer, .restTimer, .improvDelay{width:70px;}\
.studyButton,.skipButton{height:22px;width:30px;font-size:22px;line-height:22px;cursor:pointer;}\
.image-container.multiPartToggle>picture{filter: grayscale(100%);}\
.image-container.improvToggle>picture{filter:blur(20px);}\
.image-container.multiPartToggle.improvToggle>picture{filter: grayscale(100%) blur(20px)!important;}\
.modeDialog{cursor:pointer; padding:2px 8px;margin:0px 4px 2px 0px;color:white;background:#0078d7;}\
.dialogInactive{background:rgba(22,22,22,0.5)!important;}\
.horFlipped{transform:scaleX(-1);}\
.improvDelay{margin:0 5px 2px -5px;display:none;}\
.studyContainer:has(.modeDialog.improvMode:not(.dialogInactive)) .improvDelay{display:block;}\
</style>");

//hotkeys
$(document).bind('keyup', function(e) {
    if(e.keyCode==27){$('picture').toggleClass('panicbutton');}
    if(!$('input').is(':focus') && toggled){
       if(e.keyCode=="49"){startStudying();}
       if(e.keyCode=="39" || e.keyCode=="50"){changeImage();}
       if(e.keyCode=="51"){multiPart=!multiPart; $('.multiPartMode').toggleClass('dialogInactive');}
       if(e.keyCode=="52"){improvPractice=!improvPractice; $('.improvMode').toggleClass('dialogInactive');}
       if(e.keyCode=="72"){$('.horizontalFlip').toggleClass('dialogInactive');$('.image-container').toggleClass('horFlipped');}
    }
});
}
