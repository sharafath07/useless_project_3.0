const DEFAULT_LOCATION = { lat: 11.2588, lng: 75.7804, label: 'Kozhikode demo coordinates' };
const superstitions = [
    { emoji: '🐦', title: 'Crow Omen', message: 'A crow crossed the road from left to right.', action: 'reroute', reason: 'Crows know things humans do not.' },
    { emoji: '🐈', title: 'Black Cat!', message: 'A black cat has spiritually rejected this route.', action: 'reroute', reason: 'This road has suspicious energy.' },
    { emoji: '📅', title: 'Tuesday Detected', message: 'It is Tuesday. The road is physically open but spiritually closed.', action: 'block', reason: 'Mercury is probably doing something.', context: 'tuesday' },
    { emoji: '🔢', title: 'Unlucky Number 13', message: 'Today is the 13th. The calendar has personally rejected this journey.', action: 'reroute', reason: 'Mathematics has become an omen.', context: 'day13' },
    { emoji: '🪞', title: 'Broken Mirror', message: 'A broken mirror was imagined nearby.', action: 'block', reason: 'Seven years of bad navigation is too many.' },
    { emoji: '🤧', title: 'Sneeze Alert', message: 'Someone sneezed three streets away.', action: 'delay', reason: 'Bless you. Also, add five minutes.' },
    { emoji: '🐕', title: 'Dog Bark Protocol', message: 'A dog barked three times with intent.', action: 'reroute', reason: 'The neighborhood has issued a formal objection.' },
    { emoji: '🦉', title: 'Owl Witness', message: 'An owl saw your route and refused to comment.', action: 'warning', reason: 'Silence from an owl is never neutral.' },
    { emoji: '🌧️', title: 'Cosmic Rain', message: 'Rain has disturbed the cosmic energy.', action: 'delay', reason: 'The universe recommends taking the scenic puddle route.' },
    { emoji: '🦶', title: 'Left Foot First', message: 'You stepped forward with the left foot first.', action: 'warning', reason: 'The journey has started with questionable balance.' },
    { emoji: '🌕', title: 'Full Moon', message: 'The moon is full and has opinions.', action: 'reroute', reason: 'Lunar traffic is unusually intense.' },
    { emoji: '👴', title: 'Ancestor Warning', message: 'An imaginary uncle said this road should be avoided.', action: 'block', reason: 'Your ancestors have concerns.' },
    { emoji: '🔮', title: 'Bad Vibes', message: 'The vibes on this route failed a highly scientific scan.', action: 'reroute', reason: 'Vibes do not lie. Usually.' },
    { emoji: '🚪', title: 'Backwards Door', message: 'Someone opened a door backwards.', action: 'delay', reason: 'Reality needs a moment to recover.' },
    { emoji: '🍀', title: 'Lucky Charm Missing', message: 'No lucky charm was detected on your person.', action: 'warning', reason: 'Proceeding with reduced luck reserves.' },
    { emoji: '🧂', title: 'Spilled Salt', message: 'The salt has been spilled. The route must be judged.', action: 'reroute', reason: 'Seasoning the journey would be irresponsible.' },
    { emoji: '🕯️', title: 'Candle Flicker', message: 'An imaginary candle flickered when you chose this road.', action: 'warning', reason: 'Even the imaginary candle is unconvinced.' },
    { emoji: '🧿', title: 'Evil Eye Check', message: 'The evil eye has reviewed your itinerary.', action: 'continue', reason: 'Against all odds, destiny approves.' }
];
const timeSuperstitions = [
    { emoji: '🌙', title: 'Witching Hour', message: 'This journey begins after sunset. The shadows requested a longer route.', action: 'reroute', reason: 'Night navigation requires extra cosmic clearance.', context: 'night' },
    { emoji: '🌅', title: 'Dawn Omen', message: 'You are travelling before the city has finished waking up.', action: 'warning', reason: 'Even the traffic lights look sleepy.', context: 'early' },
    { emoji: '🕛', title: 'Midnight Detour', message: 'The clock struck midnight while you planned this route.', action: 'delay', reason: 'Destiny is closed for maintenance.', context: 'midnight' }
];

let map;
let currentLocation = { ...DEFAULT_LOCATION };
let destination = null;
let routeLayer;
let destinationMarker;
let locationMarker;
let baseRoute = null;
let currentRoute = null;
let history = [];
let lastRandomOmen = null;
let demoRunning = false;

const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    locationMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: pinIcon('mint', '●') }).addTo(map).bindPopup(`📍 Demo location · ${currentLocation.label}`);
}

function pinIcon(color, symbol) {
    return L.divIcon({ className: 'custom-pin', html: `<div style="background:${color === 'mint' ? '#9be8c3' : '#ed896e'};color:#10201a;border-color:#10201a">${symbol}</div>`, iconSize: [30, 30], iconAnchor: [15, 29], popupAnchor: [0, -28] });
}

function parseCoordinates(value) {
    const match = value.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;
    const lat = Number(match[1]); const lng = Number(match[2]);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng, label: value.trim() } : null;
}

async function geocode(value) {
    const coordinates = parseCoordinates(value);
    if (coordinates) return coordinates;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(value)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Place search failed');
    const results = await response.json();
    if (!results.length) throw new Error('Destination not found');
    return { lat: Number(results[0].lat), lng: Number(results[0].lon), label: results[0].display_name.split(',').slice(0, 2).join(',') };
}

function fallbackCoordinates() {
    const angle = (Math.random() * Math.PI * 2);
    return { lat: currentLocation.lat + Math.cos(angle) * 0.025, lng: currentLocation.lng + Math.sin(angle) * 0.035, label: 'Destiny fallback route' };
}

function fallbackGeometry(start, end, bend = 0.012) {
    const midLat = (start.lat + end.lat) / 2 + bend;
    const midLng = (start.lng + end.lng) / 2 - bend;
    return [[start.lat, start.lng], [midLat, midLng], [end.lat, end.lng]];
}

async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Routing failed');
        const data = await response.json();
        if (!data.routes?.length) throw new Error('No route');
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        return { coordinates, distance: route.distance, duration: route.duration / 60, fallback: false };
    } catch (error) {
        const coordinates = fallbackGeometry(start, end, alternate ? -0.018 : 0.012);
        const distance = Math.max(1200, Math.hypot((end.lat - start.lat) * 111000, (end.lng - start.lng) * 97000) * 1.3);
        return { coordinates, distance, duration: distance / 420 * 1.25, fallback: true };
    }
}

function drawRoute(route) {
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(route.coordinates, { color: '#9be8c3', weight: 7, opacity: .92, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    routeLayer.bindTooltip('🧿 Cosmic interference is being analyzed on this route.', { sticky: true, direction: 'top' });
    if (destinationMarker) map.removeLayer(destinationMarker);
    destinationMarker = L.marker([destination.lat, destination.lng], { icon: pinIcon('coral', '✦') }).addTo(map).bindPopup(`🎯 ${destination.label}`);
    map.fitBounds(routeLayer.getBounds(), { padding: [45, 45] });
}

function formatDistance(meters) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`; }
function formatMinutes(minutes) { return `${Math.max(1, Math.round(minutes))} min`; }
function setMetrics(route, extraMinutes = 0) { $('#distanceValue').textContent = formatDistance(route.distance); $('#normalEta').textContent = formatMinutes(baseRoute.duration); $('#destinyEta').textContent = formatMinutes(baseRoute.duration + extraMinutes); }
function getTravelContext() {
    const dateValue = $('#travelDate').value;
    const timeValue = $('#travelTime').value;
    const date = dateValue ? new Date(`${dateValue}T${timeValue || '12:00'}`) : new Date();
    return { isTuesday: date.getDay() === 2, dayOfMonth: date.getDate(), hour: timeValue ? Number(timeValue.split(':')[0]) : date.getHours() };
}
function setStatus(title, message, type = 'idle', icon = '✦') { const content = $('#statusContent'); content.className = `status-content ${type}`; content.innerHTML = `<div class="status-icon">${icon}</div><div><h3>${title}</h3><p>${message}</p></div>`; }
function setConfidence(value) { $('#confidenceValue').textContent = `${value}%`; $('#confidenceBar').style.width = `${value}%`; }
function toast(message) { const element = $('#toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('visible'), 3200); }

function hasUnlucky13Trigger(context) {
    const visibleValues = [
        $('#destination').value,
        destination?.label,
        formatDistance(baseRoute?.distance || 0),
        formatMinutes(baseRoute?.duration || 0),
        $('#travelDate').value,
        $('#travelTime').value
    ];
    return context.dayOfMonth === 13 || visibleValues.some((value) => String(value || '').includes('13'));
}

function selectOmen(forced, clicked = false) {
    if (forced) return superstitions.find((omen) => omen.title === forced) || superstitions[0];
    const context = getTravelContext();
    if (context.isTuesday) return superstitions.find((omen) => omen.context === 'tuesday');
    if (clicked && hasUnlucky13Trigger(context)) return superstitions.find((omen) => omen.context === 'day13');
    if (context.hour === 0) return timeSuperstitions.find((omen) => omen.context === 'midnight');
    if (context.hour >= 22) return timeSuperstitions.find((omen) => omen.context === 'night');
    if (context.hour < 6) return timeSuperstitions.find((omen) => omen.context === 'early');
    const availableSuperstitions = superstitions.filter((omen) => omen.context !== 'day13' && omen.title !== lastRandomOmen);
    const omen = availableSuperstitions[Math.floor(Math.random() * availableSuperstitions.length)];
    lastRandomOmen = omen.title;
    return omen;
}

function addHistory(omen, outcome) {
    history.unshift({ omen, outcome }); history = history.slice(0, 5);
    $('#omenCount').textContent = `${history.length} omen${history.length === 1 ? '' : 's'}`;
    $('#historyList').innerHTML = history.map(({ omen: item, outcome: result }) => `<li><strong>${item.emoji}</strong> ${item.title.replace('!', '')}<span>${result}</span></li>`).join('');
}

async function applyOmen(forcedOmen, clicked = false) {
    if (!baseRoute || !destination) return;
    setStatus('Consulting the universe…', 'Checking planetary alignment and asking nearby birds.', 'loading', '✧');
    await sleep(700);
    const omen = selectOmen(forcedOmen, clicked);
    const confidence = omen.confidence || Math.floor(58 + Math.random() * 40);
    setConfidence(confidence);
    let extra = 0; let outcome = 'Route approved'; let route = currentRoute || baseRoute;
    if (omen.action === 'reroute' || omen.action === 'block') { route = await getRoute(currentLocation, destination); currentRoute = route; drawRoute(route); extra = Math.max(7, omen.action === 'block' ? 8 : 4); outcome = omen.action === 'block' ? 'Spiritually blocked' : 'Recalculated'; setStatus(`${omen.emoji} ${omen.title}`, `${omen.message} ${omen.reason} The universe has rejected the current route. Recalculating the journey.`, 'omen', omen.emoji); $('#routeMood').textContent = 'Reconsidering'; }
    else if (omen.action === 'delay') { extra = 5 + Math.floor(Math.random() * 6); outcome = `+${extra} minutes`; setStatus(`${omen.emoji} ${omen.title}`, `${omen.message} ${omen.reason}`, 'omen', omen.emoji); $('#routeMood').textContent = 'Delayed by fate'; }
    else if (omen.action === 'warning') {
        const positive = Math.random() < 0.35;
        extra = positive ? 0 : 2;
        outcome = positive ? 'Positive interference' : 'Proceed carefully';
        if (positive) {
            setStatus('✨ Positive Cosmic Interference', `${omen.message} The universe has unexpectedly approved this route. Cosmic interference is working in your favor.`, 'success', '✨');
            $('#routeMood').textContent = 'Cosmically aligned';
        } else {
            setStatus(`${omen.emoji} ${omen.title}`, `${omen.message} ${omen.reason} Proceed, but make it weird.`, 'omen', omen.emoji);
            $('#routeMood').textContent = 'Suspicious';
        }
    }
    else { setStatus(`${omen.emoji} ${omen.title}`, `${omen.message} ${omen.reason} Destiny approves, somehow.`, 'success', omen.emoji); $('#routeMood').textContent = 'Approved-ish'; }
    setMetrics(route, extra); addHistory(omen, outcome); $('#recalculateButton').disabled = false; toast(`${omen.emoji} ${omen.title} · ${outcome}`);
}

async function navigate() {
    if (demoRunning) return;
    const value = $('#destination').value.trim();
    if (!value) { toast('Enter a destination, or start the demo.'); $('#destination').focus(); return; }
    $('#navigateButton').disabled = true; setStatus('Finding your destination…', 'Asking ordinary GPS to do its one job.', 'loading', '⌖');
    try {
        destination = await geocode(value); baseRoute = await getRoute(currentLocation, destination); currentRoute = baseRoute; drawRoute(baseRoute); setMetrics(baseRoute); $('#routeMood').textContent = 'Route found'; await applyOmen();
    } catch (error) { destination = fallbackCoordinates(); baseRoute = await getRoute(currentLocation, destination); currentRoute = baseRoute; drawRoute(baseRoute); setMetrics(baseRoute); setStatus('🧿 Destiny mode engaged', 'The universe could not find that place, so it invented one.', 'omen', '🧿'); await applyOmen(); }
    $('#navigateButton').disabled = false;
}

async function runDemo() {
    if (demoRunning) return; demoRunning = true; $('#demoButton').disabled = true; $('#navigateButton').disabled = true; history = []; $('#historyList').innerHTML = '<li class="empty-history">Demo omens incoming…</li>'; $('#omenCount').textContent = '0 omens';
    $('#destination').value = 'The universe'; destination = { lat: currentLocation.lat + .035, lng: currentLocation.lng + .04, label: 'The universe' }; baseRoute = await getRoute(currentLocation, destination); currentRoute = baseRoute; drawRoute(baseRoute); setMetrics(baseRoute); setStatus('🧭 Normal GPS engaged', `Route found. ETA: ${formatMinutes(baseRoute.duration)}. Common sense is still online.`, 'success', '✓'); setConfidence(0); await sleep(1100);
    await applyOmen('Crow Omen'); await sleep(1200); await applyOmen('Black Cat!'); await sleep(1200); await applyOmen('Tuesday Detected'); await sleep(1200);
    const extra = Math.max(18, Math.round(baseRoute.duration * .8)); setStatus('🧿 Destiny route found', `Normal GPS: ${formatMinutes(baseRoute.duration)}. Superstition GPS: ${formatMinutes(baseRoute.duration + extra)}. The universe demanded the scenic route.`, 'success', '🧿'); $('#destinyEta').textContent = formatMinutes(baseRoute.duration + extra); $('#routeMood').textContent = 'Ridiculously destined'; toast('🎭 Demo complete. Logic has left the building.'); $('#demoButton').disabled = false; $('#navigateButton').disabled = false; demoRunning = false;
}

$('#routeForm').addEventListener('submit', (event) => { event.preventDefault(); navigate(); });
$('#navigateButton').addEventListener('click', navigate);
$('#recalculateButton').addEventListener('click', () => applyOmen(undefined, true));
$('#demoButton').addEventListener('click', runDemo);
document.querySelectorAll('[data-place]').forEach((button) => button.addEventListener('click', () => { $('#destination').value = button.dataset.place; navigate(); }));

initMap();
