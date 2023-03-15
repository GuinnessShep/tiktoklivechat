// Get DOM elements
const connectButton = document.getElementById('connectButton');
const uniqueIdInput = document.getElementById('uniqueIdInput');
const stateText = document.getElementById('stateText');
const chatContainer = document.querySelector('.chatcontainer');
const giftContainer = document.querySelector('.giftcontainer');
const eventContainer = document.querySelector('.eventcontainer');
const roomStats = document.getElementById('roomStats');

// Counter
let viewerCount = 0;
let likeCount = 0;
let diamondsCount = 0;
let giftCount = 0;
let giftCost = 0;

// These settings are defined by obs.html
const settings = window.settings || {};

// Create a TikTokIOConnection instance
const backendUrl = location.protocol === 'file:' ? "https://tiklivechat.herokuapp.com" : undefined;
const connection = new TikTokIOConnection(backendUrl);

// Connect to the TikTokIO websocket
connectButton.addEventListener('click', connect);
uniqueIdInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    connect();
  }
});

if (settings.username) {
  connect();
}

function connect() {
  const uniqueId = settings.username || uniqueIdInput.value;
  if (uniqueId !== '') {
    stateText.innerText = 'Connecting...';

    connection.connect(uniqueId, {
      enableExtendedGiftInfo: true,
    })
    .then((state) => {
      stateText.innerText = `Connected to roomId ${state.roomId}`;

      // Reset stats
      viewerCount = 0;
      likeCount = 0;
      diamondsCount = 0;
      giftCount = 0;
      giftCost = 0;
      updateRoomStats();
    })
    .catch((errorMessage) => {
      stateText.innerText = errorMessage;

      // Schedule next try if obs username set
      if (settings.username) {
        setTimeout(() => {
          connect(settings.username);
        }, 30000);
      }
    });
  } else {
    alert('no username entered');
  }
}

// Prevent Cross site scripting (XSS)
function sanitize(text) {
  return text.replace(/</g, '&lt;');
}

function updateRoomStats() {
  roomStats.innerHTML = `Viewers: <b>${viewerCount.toLocaleString()}</b> Likes: <b>${likeCount.toLocaleString()}</b> Earned Diamonds: <b>${diamondsCount.toLocaleString()}</b>`;
}

function generateUsernameLink(data) {
  return `<a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.uniqueId}</a>`;
}

function isPendingStreak(data) {
  return data.giftType === 1 && !data.repeatEnd;
}

function addChatItem(color, data, text, summarize) {
  const container = eventContainer.contains(chatContainer) ? eventContainer : chatContainer;

  // Summarize repeating messages
  if (summarize) {
    const lastMessage = container.lastElement

// Add the message to the existing summary if it matches
if (lastMessage && lastMessage.dataset.type === 'chat' && lastMessage.dataset.color === color && lastMessage.dataset.sender === data.uniqueId && lastMessage.dataset.message === text) {
lastMessage.dataset.count = parseInt(lastMessage.dataset.count) + 1;
lastMessage.querySelector('.chatcount').innerText = x${lastMessage.dataset.count};
return;
}
}

// Otherwise, create a new chat item
const chatItem = document.createElement('div');
chatItem.classList.add('chatitem');
chatItem.dataset.type = 'chat';
chatItem.dataset.color = color;
chatItem.dataset.sender = data.uniqueId;
chatItem.dataset.message = text;

const usernameLink = generateUsernameLink(data);
const chatMessage = sanitize(text);
chatItem.innerHTML = <span class="chattime">${new Date().toLocaleTimeString()}</span> ${usernameLink}: ${chatMessage};
if (summarize) {
chatItem.dataset.count = 1;
chatItem.innerHTML += <span class="chatcount">x1</span>;
}
chatItem.style.color = color;

container.appendChild(chatItem);
container.scrollTop = container.scrollHeight - container.clientHeight;
}

function addGiftItem(data, cost) {
const giftItem = document.createElement('div');
giftItem.classList.add('giftitem');
giftItem.dataset.type = 'gift';
giftItem.dataset.giftId = data.giftId;

const usernameLink = generateUsernameLink(data);
const giftName = sanitize(data.giftName);
giftItem.innerHTML = <span class="gifttime">${new Date().toLocaleTimeString()}</span> ${usernameLink} sent a ${giftName} for ${cost} diamonds.;

giftContainer.appendChild(giftItem);
giftContainer.scrollTop = giftContainer.scrollHeight - giftContainer.clientHeight;
}

// Listen for TikTokIO events
connection.on('ViewerCount', (data) => {
viewerCount = data.count;
updateRoomStats();
});

connection.on('LikeCount', (data) => {
likeCount = data.count;
updateRoomStats();
});

connection.on('GiftCount', (data) => {
giftCount += data.count;
giftCost += data.diamondsCount;
diamondsCount += data.diamondsCount;
updateRoomStats();

if (data.giftType === 2) {
const giftName = sanitize(data.giftName);
addChatItem(data.color, data, just sent a ${giftName}!, false);
} else {
addGiftItem(data, data.diamondsCount);
if (isPendingStreak(data)) {
const usernameLink = generateUsernameLink(data);
const giftName = sanitize(data.giftName);
addChatItem(data.color, data, is on a ${giftName} streak! (${data.repeatCount}/${data.repeatTotal}), false);
}
}
});

connection.on('Chat', (data) => {
addChatItem(data.color, data, data.text, true);
});

connection.on('Event', (data) => {
addChatItem(data.color, data, data.text, false);
});

connection.on('ChatMessage', (data) => {
addChatItem(data.color, data, data.message, true);
});

connection.on('EventMessage', (data) => {
const messageType = data.messageType;
const color = data.color;
const message = data.message;

switch (messageType) {
case 'enter':
addChatItem(color, data, 'just joined the live stream!', false);
break;
case 'leave':
addChatItem(color, data, 'just left the live stream!', false);
break;
case 'follow':
addChatItem(color, data, 'just followed!', false);
break;
case 'firstLike':
addChatItem(color, data, 'is the first to like this stream!', false);
break;
case 'guestJoin':
addChatItem(color, data, 'joined as a guest!', false);
break;
case 'guestLeave':
addChatItem(color, data, 'left as a guest!', false);
break;
case 'memberJoin':
addChatItem(color, data, 'just joined as a member!', false);
break;
case 'memberLeave':
addChatItem(color, data, 'just left as a member!', false);
break;
case 'share':
addChatItem(color, data, 'just shared this stream!', false);
break;
case 'system':
addChatItem(color, data, message, false);
break;
default:
console.warn(Unhandled message type: ${messageType});
}
});

// Send chat messages
const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('keyup', (event) => {
if (event.key === 'Enter') {
const message = chatInput.value;
if (message !== '') {
connection.sendChatMessage(message);
chatInput.value = '';
}
}
});

// Send gifts
const giftSelect = document.getElementById('giftSelect');
giftSelect.addEventListener('change', () => {
giftCost = parseInt(giftSelect.value);
});

const giftButton = document.getElementById('giftButton');
giftButton.addEventListener('click', () => {
connection.sendGift(giftSelect.value);
});

// Load gift images
const giftImageMap = new Map();
for (const [name, image] of Object.entries(giftImages)) {
const img = new Image();
img.src = image;
giftImageMap.set(name, img);
}

// Display selected gift image
giftSelect.addEventListener('change', () => {
const selectedGift = giftSelect.value;
const selectedImage = giftImageMap.get(selectedGift);
const previewImage = document.getElementById('giftPreviewImage');
previewImage.src = selectedImage.src;
});

// Initialize UI
const roomIdSpan = document.getElementById('roomIdSpan');
roomIdSpan.innerText = settings.roomId;
uniqueIdInput.value = settings.username || '';

// Show/hide containers
const chatToggle = document.getElementById('chatToggle');
const giftToggle = document.getElementById('giftToggle');
const eventToggle = document.getElementById('eventToggle');

chatToggle.addEventListener('click', () => {
chatContainer.classList.toggle('hidden');
});

giftToggle.addEventListener('click', () => {
giftContainer.classList.toggle('hidden');
});

eventToggle.addEventListener('click', () => {
eventContainer.classList.toggle('hidden');
});

// Listen for TikTokIO events
connection.on('ViewerCount', (data) => {
viewerCount = data.count;
updateRoomStats();
});

connection.on('LikeCount', (data) => {
likeCount = data.count;
updateRoomStats();
});

connection.on('GiftCount', (data) => {
giftCount += data.count;
giftCost += data.diamondsCount;
diamondsCount += data.diamondsCount;
updateRoomStats();

if (data.giftType === 2) {
const giftName = sanitize(data.giftName);
addChatItem(data.color, data, just sent a ${giftName}!, false);
} else {
addGiftItem(data, data.diamondsCount);
if (isPendingStreak(data)) {
const usernameLink = generateUsernameLink(data);
const giftName = sanitize(data.giftName);
addChatItem(data.color, data, is on a ${giftName} streak! (${data.repeatCount}/${data.repeatTotal}), false);
}
}
});

connection.on('Chat', (data) => {
addChatItem(data.color, data, data.content, true);
});

connection.on('Follow', (data) => {
addChatItem(data.color, data, is now following!, false);
});

connection.on('Share', (data) => {
addChatItem(data.color, data, just shared the stream!, false);
});

connection.on('Other', (data) => {
addChatItem(data.color, data, data.content, false);
});

connection.on('Error', (error) => {
console.error('TikTokIOConnection error:', error);
stateText.innerText = 'Connection error. Retrying in 30 seconds...';
setTimeout(connect, 30000);
});

// Update viewer count and stats every minute
setInterval(() => {
connection.requestViewerCount()
.then((data) => {
viewerCount = data.count;
updateRoomStats();
})
.catch((error) => {
console.error('Failed to update viewer count:', error);
});
}, 60000);
