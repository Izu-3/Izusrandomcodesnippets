// ==UserScript==
// @name         timedStudyBooru
// @namespace    http://tampermonkey.net/
// @version      2024-02-15.6
// @description  lazy random image timer tampermonkey edition
// @author       Izuthree
// @match        https://danbooru.donmai.us/posts/*
// @match        https://safebooru.donmai.us/posts/*
// @match        https://e621.net/posts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL https://github.com/Izu-3/Izusrandomcodesnippets/raw/main/timedStudyBooru.user.js
// @updateURL https://github.com/Izu-3/Izusrandomcodesnippets/raw/main/timedStudyBooru.user.js
// ==/UserScript==

/*
THIS IS AN ONLY MILDLY TESTED NEW VERSION AND THINGS MIGHT BREAK
*/

/*
todo:
- make a date-driven timer instead of a shitty setinterval
- day awareness/schedule
*/


let domain = window.location.hostname;
//temp overhaul var
let studyTopics = GM_getValue('studyTopics');
let fullTimer = GM_getValue('studyTimer');
let timeout = GM_getValue('studyTimer');
let enabled = GM_getValue('enabled');
let toggled = GM_getValue('exerciseVisible');
let multiPart = GM_getValue('multiPart');
let improvPractice = GM_getValue('improvPractice');
let improvDelay = GM_getValue('improvDelay');
let restDelay = GM_getValue('restDelay');
let randomFlip = GM_getValue('randomFlip');
let setLength = GM_getValue('setLength');
let countupMode = GM_getValue('countupMode');
let splitTimer = GM_getValue('splitTimer');
let minimalUI = GM_getValue('minimalUI');
let history = GM_getValue('history');
let historyToggle = GM_getValue('historyToggle');
let historyLimit = GM_getValue('historyLimit');
let extraBlacklist = GM_getValue('extraBlacklist');
let countdownTimer;
let countupTimer;
let countupTime = 0;
let imgContainer;
let skipMe = [false,false];

const $ = window.jQuery; //im lazy

$(window).ready(function(){
    //some sites have image-container as an id, some have it as a class
    //easiest way to fix this is just have the element as a jquery variable
    if($('#image-container').length>0){imgContainer=$('#image-container');}
    else{imgContainer=$('.image-container');}

    //skip immediately if blacklisted, upgrade needed or removed and the script is active
    let params = [$(imgContainer).find("[href*='/upgrade']").length,$('#blacklist-list>li').length,$('#page>p').length,$('#page>p').find('takedown request.').length];
    for(let i=0;i<params.length;i++){
        if(params[i]>0){
            skipMe[1]=true;
            if(enabled){skipMe[0]=true;}
        }
    }
    if(skipMe[0]){changeImage(true);}
    else{
    //if any undefined assume first run and get/set defaults
    if(enabled==undefined){enabled = false;}
    if(studyTopics==undefined){studyTopics = [['order:rank',true]];}
    if(fullTimer==undefined || fullTimer==NaN){fullTimer = 150; timeout = 150;}
    if(toggled==undefined){toggled = false;}
    if(multiPart==undefined){multiPart = false;}
    if(improvPractice==undefined){improvPractice = false;}
    if(improvDelay==undefined || improvDelay==NaN){improvDelay=15};
    if(restDelay==undefined || restDelay==NaN){restDelay=0};
    if(randomFlip==undefined){randomFlip=false;};
    if(setLength==undefined || setLength==NaN){setLength=-1;};
    if(countupMode==undefined){countupMode=false};
    if(splitTimer==undefined){splitTimer=false};
    if(minimalUI==undefined){minimalUI=true};
    if(history==undefined){history = []};
    if(historyLimit==undefined || historyLimit==NaN){historyLimit=10}
    if(historyToggle==undefined){historyToggle=false}
    //embed stuff after you fixed for defaults not before dumbass
    embeds();

    //weird but prevents it flickering enabled then disabling
    $('body').addClass('studyModeActive');
    if(improvDelay=='0'&&improvPractice&&enabled){$(imgContainer).addClass('improvToggle');}
    if(!toggled){$('.studymode').prop('disabled',true);}

    //if any properties are true, apply them immediately
    if(multiPart){$('.multiPartMode').toggleClass('dialogInactive');}
    if(minimalUI){$('.minimalUI').toggleClass('dialogInactive');$('.studyContainer').toggleClass('lessUI');}
    if(improvPractice){$('.improvMode').toggleClass('dialogInactive');}
    if(countupMode){$('.countupToggle').toggleClass('dialogInactive');updateTimer(countupTime);}
    if(historyToggle){$('.addSkips').toggleClass('dialogInactive');}
    if (randomFlip==true){
        $('.randomHorizontal').toggleClass('dialogInactive');
        if(Math.floor(Math.random()*100)>50){
            $('.horizontalFlip').toggleClass('dialogInactive');
            $(imgContainer).toggleClass('horFlipped');
        }
    }
console.log(historyLimit);
    //click and input handlers
    //study button click handler
    $('.studyButton').click(function(){startStudying()});
    $('.skipButton').click(function(){changeImage(true)});
    $(".multiPartMode").click(function(){multiPart = !multiPart; $('.multiPartMode').toggleClass('dialogInactive');setValues()});
    $(".minimalUI").click(function(){minimalUI = !minimalUI; $('.studyContainer').toggleClass('lessUI'); $('.minimalUI').toggleClass('dialogInactive');setValues()});
    $(".improvMode").click(function(){improvPractice = !improvPractice; $('.improvMode').toggleClass('dialogInactive');setValues()});
    $(".randomHorizontal").click(function(){$('.randomHorizontal').toggleClass('dialogInactive');randomFlip=!randomFlip;setValues()});
    $(".horizontalFlip").click(function(){$('.horizontalFlip').toggleClass('dialogInactive');$(imgContainer).toggleClass('horFlipped');});
    $(".grayscaleToggle").click(function(){$('.grayscaleToggle').toggleClass('dialogInactive');$(imgContainer).toggleClass('multiPartToggle');});
    $(".countupToggle").click(function(){if(!enabled){countupLazy()}});
    $(".timer").click(function() {splitTimer=!splitTimer;if(countupTimer){updateTimer(countupTime)};if(!countupTimer){updateTimer(timeout)}});
    $('.showHideStudy').click(function(){$('body').toggleClass('studyModeActive'); enabled=false; setValues();$('.studymode').prop('disabled',!$('.studymode').prop('disabled'));toggled = !$('.studymode').prop('disabled'); GM_setValue('exerciseVisible',toggled);});
    $('.searchTermSave').click(function(){setValues();})
    $('.showSearchTerms').click(function(){$('.searchTermMenus').toggleClass('searchTermsInvisible');$('.showSearchTerms').toggleClass('dialogInactive');});
    $('.searchTermAddOption').click(function(){addStudyOption('Study Option','true');})
    $('.showHistory').click(function(){$('.historyContainer').toggleClass('historyVisible');
                                       if($('.historyVisible').length>0){parseHistory();}
                                       else{$('.historyItems').empty();}})
    $('.addSkips').click(function(){historyToggle=!historyToggle; $('.addSkips').toggleClass('dialogInactive');setValues();})
    $('.historyClear').click(function(){history = []; $('.historyItems').empty();setValues()});
    $('.removeInput').click(function(){$(this).parent().remove()});
    $('.disableInput').click(function(){let setting = $(this).parent().children('.studyTopicOption').attr('enabled') == 'true';;$(this).parent().children('.studyTopicOption').attr('enabled',!setting)});

    $(".studyTimer").on("input", function() {fullTimer = parseInt($('.studyTimer')[0].value); if(!enabled){updateTimer(fullTimer);} setValues();});
    $(".restTimer").on("input", function() {restDelay = parseInt($('.restTimer')[0].value); let aa = $('.restTimer')[0]; $(aa).attr('value',restDelay); setValues();});
    $(".improvDelay").on("input", function() {improvDelay = parseInt($('.improvDelay')[0].value); let aa = $('.improvDelay')[0]; $(aa).attr('value',improvDelay); setValues();});
    $(".setLength").on("input", function() {setLength = parseInt($('.setLength')[0].value); let aa = $('.setLength')[0];$(aa).attr('value',setLength); setValues();});
    $('.historySize').on('input',function(){historyLimit = parseInt($('.historySize')[0].value); let aa = $('.historySize')[0];$(aa).attr('value',historyLimit); setValues();})
    }
    //

});

//Run when all images/contents are loaded
$(window).on("load", function() {
    console.log(enabled);
    if (enabled==true) {
       $('.studyContainer').addClass('timerRunning');
       enabled = !enabled;startStudying();
    }
});

//lol lmao
function countupLazy(){
        $('.countupToggle').toggleClass('dialogInactive');
        countupMode = !countupMode;
        if(countupMode==false){updateTimer(fullTimer);}
        if(countupMode==true){updateTimer(countupTime);}
}

function startStudying(){
    enabled = !enabled;
    if(enabled==true){
        console.log(enabled);
        if(countupMode==false){countdownTimer = setInterval(countdown, 1000); }
        if(countupMode==true){countupTime=0; updateTimer(countupTime); countupTimer = setInterval(countup, 1000);}
        $('.studyContainer').addClass('timerRunning');
    }
    else{
         if(countupMode==false){updateTimer(fullTimer);clearInterval(countdownTimer); timeout = parseInt($('.studyTimer')[0].value);}
         if(countupMode==true){updateTimer(countupTime);clearInterval(countupTimer); countupTime=0;}
        $('.studyContainer').removeClass('timerRunning');
        $(imgContainer).removeClass('improvToggle');$(imgContainer).removeClass('multiPartToggle'); }
}

function parseHistory(){
for(let i=history.length-1;i>=0;i--){
    $('.historyItems').append('<a href="'+history[i][0]+'" style="background-image:url('+history[i][1]+')" /a>');
}
}

//set localstorage variables
//super lazy to set them all at once in a big function but I can't be arsed to make this more elegant
function setValues(){
    //reset timeout means you can't pause and resume but I don't care to fix this rn
    timeout = parseInt($('.studyTimer')[0].value);
    GM_setValue('exerciseVisible',toggled);
    studyTopics = [];
    let searchTerms = $('.searchTermOption');
    let delList = [];
    for(let i=0;i<searchTerms.length;i++){
    if($(searchTerms[i]).children('.studyTopicOption').val()!=''){studyTopics.push(new Array($(searchTerms[i]).children('.studyTopicOption').val(),$(searchTerms[i]).children('.studyTopicOption').attr('enabled')));}}

    GM_setValue('studyTopics',studyTopics);
    fullTimer = parseInt($('.studyTimer')[0].value);
    GM_setValue('studyTimer',$('.studyTimer')[0].value);
    GM_setValue('multiPart',multiPart);
    GM_setValue('improvDelay',$('.improvDelay')[0].value);
    GM_setValue('restDelay',$('.restTimer')[0].value);
    GM_setValue('setLength',$('.setLength')[0].value);
    GM_setValue('randomFlip',randomFlip);
    GM_setValue('countupMode',countupMode);
    GM_setValue('improvPractice',improvPractice);
    GM_setValue('splitTimer',splitTimer);
    GM_setValue('enabled',enabled);
    GM_setValue('minimalUI',minimalUI);
    GM_setValue('history',history);
    GM_setValue('historyLimit',historyLimit);
    GM_setValue('historyToggle',historyToggle);
}

function changeImage(skipped){
    if(skipped && historyToggle && !skipMe[1]){addHistory();}
    else if(!skipped){addHistory();}
    setValues();
    let tempSearchTerm = $('.studyTopicOption:not([enabled="false"])');
    window.location.href = "https://"+domain+"/posts/random?tags="+$(tempSearchTerm[Math.floor(Math.random()*tempSearchTerm.length)]).val();
}

function addHistory(){
    if(history.length==(historyLimit) && historyLimit!=-1){history.shift()};
    let sampleLink; if($('.image-view-large-link').length>0){sampleLink=$('.image-view-large-link').attr('href');}
    else{sampleLink=$(imgContainer).attr('data-large-file-url');}
    history.push([window.location.href,sampleLink]);
}

function countup(){
    countupTime++;
    updateTimer(countupTime);
}

function updateTimer(time){
    if(splitTimer){
    let splitTime = Math.floor(time / 60);
    let seconds = time - Math.floor(time / 60) * 60;
    if(seconds<10){seconds = "0"+seconds;}
    splitTime = splitTime+":"+seconds;
    $('.timer').html(splitTime);}
    else{$('.timer').html(time);}
}

//shitty countdown but it does its job enough:tm:
function countdown(){
    if(enabled){
        timeout--;
        if(timeout>-1){updateTimer(timeout);}
        if(timeout < 1){
            $('.timer').html("Resting...");
            $('.timer').addClass('timerRest');
            clearInterval(countdownTimer);
            if(setLength>0){setLength--; ($('.setLength')[0].value) = setLength}
            if(setLength!=0){setTimeout(changeImage, (restDelay*1000));}
                       }
        if(timeout<=(fullTimer/2) && multiPart==true && $(imgContainer).hasClass('multiPartToggle')==false){
               $(imgContainer).addClass('multiPartToggle'); updateTimer(timeout);
        }
        //if session length is less than 15s, disable it
        //after improvDelay elapsed, blur the image
        //only if timer is more than 15 seconds
        if(fullTimer>15 && timeout<=(fullTimer-improvDelay) && timeout>15 && improvPractice==true && $(imgContainer).hasClass('improvToggle')==false){
               $(imgContainer).addClass('improvToggle'); updateTimer(timeout);
        }
        //if timer is less than 15 seconds, unblur the image to review versus the reference
        if(timeout<=15 && improvPractice==true && improvDelay!=0){$(imgContainer).removeClass('improvToggle');}
    }
}
function addStudyOption(studyName,isEnabled){
     $('.searchTermOptionContainer').append("<div class='searchTermOption'><input type='text' class='studyTopicOption' value='"+studyName+"' enabled='"+isEnabled+"'></input><div class='removeInput' title='Click to remove entry.'><p>-</p></div><div class='disableInput' title='Click to enable/disable entry.'><p>=</p></div></div>")
}
//solely so I can collapse this mess lol
function embeds(){
    let splitTime;
    if(splitTimer){
    splitTime = Math.floor(fullTimer / 60);
    let seconds = fullTimer - Math.floor(fullTimer / 60) * 60;
    if(seconds<10){seconds = "0"+seconds;}
    splitTime = splitTime+":"+seconds;
    }else{splitTime=fullTimer};
    let screaming;if(enabled){screaming='timerRunning'};
$('body').append("<div class='timedBooruStudy'>\
<div class='studyContainer "+screaming+"'>\
<div class='timerContainer'>\
<div class='timer'>"+splitTime+"</div>\
<div class='timerButtons'>\
<div class='studyButton' title='Start/stop studying! (Hotkey 1)'></div>\
<div class='skipButton' title='Skip to next image (Hotkey 2)'></div>\
</div>\
<div class='timersContainer'>\
<div class='stTim'><input type='number' class='studyTimer' title='The duration of the timer.' min='0' value='"+fullTimer+"'></input></div>\
<div class='rstTim'><input type='number' class='restTimer' min='0' title='The rest delay before switching to the next picture.' value='"+restDelay+"'></input></div></div>\
<div class='setNo'><input type='number' class='setLength' min='-1' title='Number of images to automatically advance to before disabling. -1 disables the feature, 0 stops the timer advancing to next image.' value='"+setLength+"'></input></div>\
</div>\
<div class='preferencesContainer'>\
<div class='showHideStudy'>Disable Study Mode</div>\
<div class='showSearchTerms dialogInactive'>Show/Hide Search Terms</div>\
<div class='searchTermMenus searchTermsInvisible'>\
<div class='searchTermOptionContainer'></div>\
<div class='searchTermAddOption' title='Add new search option'><p>Add New</p></div><div class='searchTermSave' title='Save changes (this shouldnt be necessary but just in case!)'><p>Save List</p></div></div>\
<div class='improvContainer'>\
<div class='modeDialog dialogInactive improvMode' title='After 15 seconds, image is blurred significantly (Hotkey 4)'><p>Improv mode</p></div>\
<div class='improvInput'><input type='number' class='improvDelay' min='0' title='The delay before blurring the picture.' value='"+improvDelay+"'></input></div>\
</div>\
<div class='modeToggles'>\
<div class='modeDialog dialogInactive multiPartMode' title='After half duration is elapsed, image turns greyscale (Hotkey 3)'><p>Multi-Part Mode</p></div>\
<div class='modeDialog dialogInactive countupToggle' title='Increase timer instead of decreasing it, to see how long it takes to finish things (Hotkey 8)'><p>Count Up</p></div>\
<div class='modeDialog dialogInactive randomHorizontal' title='Randomly flip image horizontally on load (Hotkey 5)'><p>Random Flip</p></div>\
<div class='modeDialog dialogInactive minimalUI' title='Hide more UI while studying'><p>Hide Running UI</p></div>\
</div>\
<div class='displayToggles'>\
<div class='modeDialog dialogInactive horizontalFlip' title='Flip horizontally (Hotkey 6)'>H</div>\
<div class='modeDialog dialogInactive grayscaleToggle' title='Grayscale filter (Hotkey 7)'>G</div>\
<div class='modeDialog dialogInactive showHistory' title='Show History'>Show History</div>\
</div></div>\
</div></div>");
for(let i=0;i<studyTopics.length;i++){addStudyOption(studyTopics[i][0],studyTopics[i][1]);}

$('.timedBooruStudy').append("<div class='historyContainer'><div class='historyHeader'>\
<div class='modeDialog dialogInactive addSkips'>Add Skips to History</div><div class='hisSize'><input type='number' class='historySize' min='-1' value='"+historyLimit+"'></input></div><div class='historyClear dialogInactive'>Clear History</div></div>\
<div class='historyItems'></div></div>");

    $('head').append('<link rel="preconnect" href="https://fonts.googleapis.com">\
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\
<link href="https://fonts.googleapis.com/css2?family=Righteous&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">\
                     ');
$('body').append("<div class='showHideStudy'><p>Enable Study Mode</p></div>");
$('body').append("<style>.panicbutton{opacity:0;!important}</style>");
$('body').append("<style class=''>\
@import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');\
.studyModeActive .image-container{position:fixed;top:0!important;left:0;width:100vw;height:100vh!important;background:black;margin:0!important;z-index:100;}\
.studyModeActive .image-container>picture{display:flex!important;width:100vw!important;height:100vh!important;}\
.studyModeActive .image-container>picture>img{height:100%!important;width:100%!important;object-fit:contain!important;max-width:100%!important;max-height:100%!important;}\
.studyModeActive #image-container.multiPartToggle>img, .image-container.multiPartToggle>picture{filter: grayscale(100%);}\
.studyModeActive #image-container.improvToggle>img, .image-container.improvToggle>picture{filter:blur(20px);}\
.studyModeActive #image-container.multiPartToggle.improvToggle>img, .image-container.multiPartToggle.improvToggle>picture{filter: grayscale(100%) blur(20px)!important;}\
.horFlipped{transform:scaleX(-1);}\
.timedBooruStudy{color:white;}\
.studyModeActive #image-container{position:fixed;top:0;left:0;display:flex;width:100vw;height:100vh;background:black;justify-content:center;z-index:2;}\
.image-container>img{max-height:100%;object-fit:contain;}\
#image-container>img{max-height:100%;object-fit:contain;}\
.studyModeActive .timedBooruStudy{font-family:Righteous!important;}\
.timedBooruStudy *{box-sizing:border-box;}.timerRest{font-size:30pt!important;}\
.showSearchTerms,.studyContainer .showHideStudy{width:calc(100% - 20px);height:40px;cursor:pointer;padding:10px;border-radius:10px;margin:10px 10px;font-size:15pt;text-align:center;border:1px solid #ffffff55;user-select: none;transition:opacity 0.2s ease-in-out;}.studyModeActive picture img{padding-right:0px;padding-left:0px;}.studyModeActive:not(:has(.timerRunning)) section:not(.horFlipped)>picture>img{padding-left:clamp(300px,20%,20%);}.studyModeActive:has(.historyVisible) section:not(.horFlipped)>picture>img{padding-right:clamp(300px,20%,20%);}.studyModeActive:not(:has(.timerRunning)) .horFlipped>picture>img{padding-right:clamp(300px,20%,20%);}.studyModeActive:has(.historyVisible) .horFlipped>picture>img{padding-left:clamp(300px,20%,20%);}.studyContainer .showHideStudy{opacity:0.5;font-size:10pt;height:20px;line-height:0px;}.studyContainer .showHideStudy:hover{opacity:0.8}.timedBooruStudy{position:fixed;z-index:100;opacity:0;pointer-events:none;transition:opacity 0.2s ease-in-out}.studyModeActive .timedBooruStudy{opacity:1;pointer-events:auto;transition:opacity 0.2s ease-in-out;}.searchTermMenus{top:0;left:0;width:100%;height:auto;padding:0px 10px 80px 10px;margin:0 0 10px 0 ;text-align:center;position:relative;overflow-y:auto;transition:opacity 0.2s ease-in-out, height 0.2s ease-in-out, padding 0.2s ease-in-out;max-height:calc(44vh);border-bottom:1px solid #ffffff40;}input{background:#1a1a24;}.searchTermOptionContainer{max-height:600px;overflow-y:auto;}.searchTermOptionContainer>div{display:flex;width:100%;flex-wrap:wrap;}.searchTermOptionContainer>div>input{background:#1a1a24;flex-grow:1;padding-left:10px;border-top-left-radius:10px;border-bottom-left-radius:10px;}.searchTermOptionContainer>div>div{width:40px;height:40px;cursor:pointer;}.searchTermOption{width:100%;height:40px;margin-bottom:5px;}.studyTopicOption[enabled='false']{opacity:0.5;}.historyClear,.searchTermAddOption,.searchTermSave{user-select: none;border-radius:10px;position:absolute;bottom:30px;width:calc(50% - 20px);height:40px;left:10px;border:1px solid #ffffff55;box-sizing:border-box;padding:10px;background:#ffffff11;cursor:pointer;text-align:center;}.searchTermSave{left:unset!important;right:10px;}.searchTermsInvisible{transform:scaleY(0);transform-origin:top;pointer-events:none;padding:0px 10px 0px 10px;overflow:hidden;opacity:0;height:0;transition:opacity 0.2s ease-in-out, transform 0.2s ease-in-out, padding 0.2s ease-in-out;}.studyModeActive .image-container.blacklisted-active{display:flex!important;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:black;height:calc(100vh + 20px);width:100vw;z-index:3;margin:0!important;}.studyModeActive .image-container.blacklisted-active picture{width:100%;height:100%;display:flex;justify-content:center;}.studyModeActive .image-container.blacklisted-active img{filter:blur(40px) brightness(30%);margin:auto;display:block;}.studyModeActive .image-container.blacklisted-active:after{content:'Blacklisted Image';position:fixed;top:0;left:0;right:0;bottom:0;width:400px;height:max-content;color:white;background:#9C1D1Dcf;margin:auto;font-size:40pt;line-height:40pt;text-align:center;padding:20px;border-radius:20px;}.removeInput,.disableInput,.modeDialog{user-select: none;border:1px solid #ffffff55;display:flex;justify-content:center;align-items:center;background:#ffffff11}.disableInput{border-top-right-radius:10px;border-bottom-right-radius:10px;border-left:none;}.historyClear:hover,.removeInput:hover,.disableInput:hover,.searchTermAddOption:hover,.searchTermSave:hover,.modeDialog:hover{background:#ffffff33;transition:background 0.2s ease-in-out;}.studyContainer,.historyContainer{position:fixed;background:#3f4058dc;backdrop-filter: blur(10px);display:flex;flex-direction:column-reverse;z-index:101;left:0;top:0;width:clamp(300px,20%,20%);height:100vh;font-family: 'Righteous', sans-serif;justify-content:space-between;max-height:100vh;flex-wrap:nowrap;transition:background 0.2s ease-in-out, backdrop-filter 0.2s ease-in-out;}.timersContainer,.setNo,.improvContainer{display:flex;width:100%;padding:10px;}.timersContainer>div{position:relative;}.stTim{flex-grow:2;flex-shrink:1;}.stTim>input{border-top-left-radius:10px;border-bottom-left-radius:10px;text-align:right;}.rstTim{flex-grow:1;flex-shrink:2}.rstTim>input{border-top-right-radius:10px;border-bottom-right-radius:10px;}.rstTim:has([value='0']){opacity:0.5}.timersContainer input,.setNo input{width:100%;}.studyTimer,.restTimer,.setLength{height:50px;font-size:24pt;position:relative;}.hisSize:after,.stTim:after,.rstTim:after,.setNo:after,.improvContainer:after{content:'Timer';position:absolute;top:-8px;left:7px;font-size:18pt;pointer-events:none;transform:rotate(-2deg);text-shadow:0 0 4px black;}.rstTim:after{content:'Rest';right:7px;left:unset;transform:rotate(2deg)}.setNo:after{content:'Set Count';top:-2px;left:16px;}.setNo:has([value='-1']){opacity:0.5;}.setNo{position:relative;}.setLength{border-radius:10px;font-size:18pt;height:40px;}.modeToggles,.displayToggles{user-select: none;width:100%;display:flex;flex-wrap:wrap;padding:10px;gap:10px;}.modeToggles>div{width:30%;flex-grow:1;text-align:center;height:50px;display:flex;justify-content:center;}.modeDialog{display:flex;padding:5px;border-radius:10px;box-sizing:border-box;justify-content:center;align-items:center;opacity:1;transition:opacity 0.2s ease-in-out;gap:10px;cursor:pointer;}.showSearchTerms:not(.dialogInactive), .modeDialog:not(.dialogInactive){background:#ffffffcc;color:#3f4058}.modeDialog p,.searchTermOption p{margin:0;}.showSearchTerms.dialogInactive, .modeDialog.dialogInactive{opacity:0.5;}.showSearchTerms.dialogInactive:hover, .modeDialog.dialogInactive:hover{opacity:0.8;}.improvContainer{display:flex;width:100%;gap:0;position:relative;}.improvContainer>*{margin:0;}.improvContainer:has(.dialogInactive):after,.improvContainer:has(.dialogInactive) input{opacity:0.5;}.improvContainer:after{content:'Blur Delay';font-size:10pt;right:15px;left:unset;top:0;}.improvMode{width:70%;border-top-right-radius:0;border-bottom-right-radius:0;}.improvInput{width:30%;}.improvContainer input{width:100%;height:40px;border-top-right-radius:10px;border-bottom-right-radius:10px;}.displayToggles>*{flex-grow:1;}.preferencesContainer{position:relative;flex-grow:1;flex-shrink:1;overflow-y:auto;}.timerContainer{display:flex;flex-wrap:wrap;align-self:flex-end;width:100%;flex-shrink:0;}.timer{font-size:98pt;text-align:center;height:130px;width:100%;padding:10px;cursor:pointer;line-height:110px;text-shadow:0 0 4px #00000066;}.timerButtons{display:flex;width:100%;padding:10px;gap:10px;}.studyButton,.skipButton{cursor:pointer;border:1px solid #ffffff55;height:90px;padding:10px;border-radius:20px;position:relative;}.studyButton{background:#4A964455;flex-grow:1;transition:background 0.2s ease-in-out;}.skipButton{background:#49449655;aspect-ratio:1;min-width:90px;}.studyContainer.timerRunning .studyButton{background:#9C1D1D55;}.studyButton:hover{background:#4A9644cf;}.skipButton:hover{background:#494496cf;}.studyContainer.timerRunning .studyButton{background:#9C1D1Dcf;}.studyButton:after,.skipButton:after{content:'Start';display:block;font-size:24pt;margin:auto;position:absolute;top:0;left:0;right:0;bottom:0;width:max-content;height:max-content;}.studyContainer.timerRunning .studyButton:after{content:'Stop';width:max-content;}.skipButton:after{content:'Skip'}.preferencesContainer,.timerContainer{}.preferencesContainer{padding-bottom:0px;opacity:1;transition:padding-bottom 0.2s ease-in-out,opacity 0.2s ease-in-out;}.studyContainer.timerRunning .preferencesContainer{opacity:0;transition:opacity 0.2s ease-in-out;}.lessUI.timerRunning .preferencesContainer{padding-bottom:130px;transition:padding-bottom 0.2s ease-in-out,opacity 0.2s ease-in-out;}.studyContainer.timerRunning{background:#3f405800;backdrop-filter: blur(0px);transition:background 0.2s ease-in-out, backdrop-filter 0.2s ease-in-out;}.timerRunning .timerContainer{background:#3f40589c;transition:background 0.2s ease-in-out;}.timerContainer{position:relative;bottom:0px;transition:bottom 0.2s ease-in-out;}.lessUI.timerRunning .timerContainer{bottom:-130px;background:#3f40585c;backdrop-filter: blur(10px);transition:bottom 0.2s ease-in-out, opacity 0.2s ease-in-out;}.timersContainer{opacity:1;transition:opacity 0.2s ease-in-out}.lessUI.timerRunning .timersContainer{opacity:0;transition:opacity 0.2s ease-in-out}.historyContainer{left:unset;right:0;top:0;background:#3f4058dc;backdrop-filter: blur(10px);flex-direction:column;justify-content:flex-start;opacity:0;transition:opacity 0.2s ease-in-out;}.historyContainer.historyVisible{opacity:1;transition:opacity 0.2s ease-in-out;}.historyHeader{padding:10px;display:flex;gap:10px;width:100%;text-align:center;box-sizing:border-box;flex-wrap:wrap;}.historyHeader>*{flex-shrink:1;flex-grow:1;}.hisSize{position:relative;width:45%;flex-grow:1;flex-shrink:1;opacity:1;transition:opacity 0.2s ease-in-out;}.addSkips{width:45%;flex-shrink:1;}.hisSize:after{content:'History Length';font-size:12pt;left:unset;right:5px;transform:rotate(2deg)}.historySize{height:100%;width:100%;border-radius:10px;text-align:right;}.hisSize:has([value='-1']){opacity:0.5;transition:opacity 0.2s ease-in-out;}.historyClear{position:static;width:100%;}.historyContainer.historyHidden{}.historyItems{display:flex;background:#1a1a24;overflow-y:auto;flex-wrap:wrap;padding:10px;flex-shrink:1;gap:10px;width:calc(100% - 20px);box-sizing:border-box;margin:0 auto;border-radius:10px;transition:height 0.2s ease-in-out;}.historyItems>a{display:block;width:40%;aspect-ratio:1;flex-grow:1;max-width:calc(50% - 10px);background-size:cover;background-position:50% 50%;border-radius:5px;background-repeat:no-repeat;}.studyModeActive>.showHideStudy{opacity:0;pointer-events:none;}body>.showHideStudy{position:fixed;height:75px;color:white;width:80px;bottom:0px;right:0px;padding:5px;z-index:120;padding:10px;pointer-events:auto;opacity:1;background:#3f40585c;border-left:1px solid #ffffff55;border-top:1px solid #ffffff55;border-top-left-radius:10px;backdrop-filter: blur(10px);text-align:center;cursor:pointer;}body>.showHideStudy:hover{background:#3f4058fc}\
input,textarea,select{color:#fff!important;}</style>");

//hotkeys
$(document).bind('keydown', function(e) {
    if(e.keyCode==27){$('img').toggleClass('panicbutton');}
    if(!$('input').is(':focus') && toggled){
       if(e.keyCode=="49"){startStudying();}
       if(e.keyCode=="50"){changeImage(true);}
       if(!enabled){
       if(e.keyCode=="51"){multiPart=!multiPart; $('.multiPartMode').toggleClass('dialogInactive');}
       if(e.keyCode=="52"){improvPractice=!improvPractice; $('.improvMode').toggleClass('dialogInactive');}
       if(e.keyCode=="53"){randomFlip=!improvPractice; $('.randomHorizontal').toggleClass('dialogInactive');}
       if(e.keyCode=="54"){$('.horizontalFlip').toggleClass('dialogInactive');$(imgContainer).toggleClass('horFlipped');}
       if(e.keyCode=="55"){$('.grayscaleToggle').toggleClass('dialogInactive');$(imgContainer).toggleClass('multiPartToggle');}
       if(e.keyCode=="56"){countupLazy();}
    }
    }
});
}
