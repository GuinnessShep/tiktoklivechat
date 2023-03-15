// Get the backend URL
const backendUrl = location.protocol === 'file:' ? "https://tiklivechat.herokuapp.com" : undefined;

// Initialize the TikTokIOConnection
const connection = new TikTokIOConnection(backendUrl);

// Counter variables
let viewerCount = 0;
let likeCount = 0;
let diamondsCount = 0;

// Check if settings exist, and set them if they don't
window.settings ??= {};

// Wait for the document to be ready before binding event handlers
$(document).ready(() => {
$('#connectButton').click(connect);
$('#uniqueIdInput').on('keyup', (e) => {
if (e.key === 'Enter') connect();
});

if (window.settings.username) connect();
});

// Connect to the chat server
function connect() {
const uniqueId = window.settings.username || $('#uniqueIdInput').val().trim();

if (!uniqueId) return alert('Please enter a username.');

$('#stateText').text('Connecting...');

connection
.connect(uniqueId, { enableExtendedGiftInfo: true })
.then((state) => {
$('#stateText').text(Connected to roomId ${state.roomId});

  // Reset the stats
  viewerCount = 0;
  likeCount = 0;
  diamondsCount = 0;
  updateRoomStats();
})
.catch((errorMessage) => {
  $('#stateText').text(errorMessage);

  // Schedule the next try if the OBS username is set
  if (window.settings.username) {
    setTimeout(() => {
      connect(window.settings.username);
    }, 30000);
  }
});
}

// Sanitize a string to prevent XSS attacks
function sanitize(text) {
return text.replace(/</g, '<');
}

// Update the room statistics display
function updateRoomStats() {
$('#roomStats').html(Viewers: <b>${viewerCount.toLocaleString()}</b> Likes: <b>${likeCount.toLocaleString()}</b> Earned Diamonds: <b>${diamondsCount.toLocaleString()}</b>);
}

// Generate a link to the user's TikTok profile
function generateUsernameLink(data) {
return <a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.uniqueId}</a>;
}

// Check if a gift is part of a pending streak
function isPendingStreak(data) {
return data.giftType === 1 && !data.repeatEnd;
}

// Add a new item to the chat container
function addChatItem(color, data, text, summarize) {
const container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.chatcontainer');

if (container.find('div').length > 500) {
container.find('div').slice(0, 200).remove();
}

container.find('.temporary').remove();

container.append( <div class=${summarize ? 'temporary' : 'static'}> <img class="miniprofilepicture" src="${data.profilePictureUrl}"> <span> <b>${generateUsernameLink(data)}:</b> <span style="color:${color}">${sanitize(text)}</span> </span> </div> );

container.stop().animate({ scrollTop: container[0].scrollHeight }, 400);
}

// Add a new gift to the gift container
function addGiftItem(data) {
const container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.giftcontainer');

if (container.find('div').length >

{
container.find('div').slice(0, 200).remove();
}
container.append(`

<div class="giftitem">
<img class="giftimage" src="${data.giftImageUrl}">
<div class="giftinfo">
<div class="giftusername">${generateUsernameLink(data)}</div>
<div class="giftname">${data.giftName}</div>
<div class="giftcount">x ${data.giftCount}</div>
</div>
</div>
`);
container.stop().animate({ scrollTop: container[0].scrollHeight }, 400);

// Update the diamonds count
if (data.giftType === 3) {
diamondsCount += data.giftCount;
updateRoomStats();
}
}

// Bind event handlers for incoming chat and gift messages
connection.on('chat', (data) => {
const { color, text, summarize } = data;
addChatItem(color, data, text, summarize);
});

connection.on('gift', (data) => {
addGiftItem(data);
});

// Bind event handlers for incoming room stats updates
connection.on('viewerCount', (count) => {
viewerCount = count;
updateRoomStats();
});

connection.on('likeCount', (count) => {
likeCount = count;
updateRoomStats();
});

// Periodically check the connection and attempt to reconnect if necessary
setInterval(() => {
if (connection.getState() === 'CLOSED') {
connect();
}
}, 30000);
