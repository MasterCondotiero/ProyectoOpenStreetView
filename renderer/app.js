// Variables
const fs = require('fs');
const path = require('path');
const { dialog } = require('@electron/remote');

let mapMarkers = [];
let lastMarker = null;
let markers = [];
let editIndex = null;

let map = L.map('map').setView([38.7926, 0.1631], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 👇 ICONOS DEFINIDOS
const iconoNormal = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
const iconoEdicion = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  if (lastMarker) map.removeLayer(lastMarker);
  lastMarker = L.marker([lat, lng], { icon: iconoNormal }).addTo(map);
  document.getElementById('coords').textContent =
    `Coordenadas seleccionadas: Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
});

// Funciones
function resetFormFields() {
  const form = document.getElementById('markerForm');
  form.reset();
  document.getElementById('coords').textContent =
    'Haz clic en el mapa para seleccionar una ubicación.';
  editIndex = null;
}

function updateMarkerList() {
  const list = document.getElementById('markerList');
  list.innerHTML = '';

  // 1) eliminar todas las capas previas
  mapMarkers.forEach(layer => map.removeLayer(layer));
  mapMarkers = [];

  // 2) limpiar marcador temporal
  if (lastMarker) {
    map.removeLayer(lastMarker);
    lastMarker = null;
  }

  // 3) volver a crear marcadores
  markers.forEach((marker, index) => {
    // marcador azul por defecto
    const mapMarker = L.marker(
      [marker.coordinates.lat, marker.coordinates.lng],
      { icon: iconoNormal }
    )
      .addTo(map)
      .on('click', () => window.editMarker(index));

    mapMarkers.push(mapMarker);

    // lista lateral
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.innerHTML = `<strong>${marker.title}</strong> (${marker.coordinates.lat.toFixed(5)}, ${marker.coordinates.lng.toFixed(5)})`;

    const btns = document.createElement('div');
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️ Editar';
    editBtn.addEventListener('click', () => window.editMarker(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Eliminar';
    deleteBtn.addEventListener('click', () => {
      if (!confirm(`¿Seguro que quieres eliminar "${marker.title}"?`)) return;
      markers.splice(index, 1);
      updateMarkerList();
    });

    btns.appendChild(editBtn);
    btns.appendChild(deleteBtn);
    li.appendChild(span);
    li.appendChild(btns);
    list.appendChild(li);
  });
}

function getFormData() {
  const getQuestion = (i) => ({
    question: document.getElementById(`q${i}`).value,
    options: [
      document.getElementById(`q${i}a`).value,
      document.getElementById(`q${i}b`).value,
      document.getElementById(`q${i}c`).value,
      document.getElementById(`q${i}d`).value
    ],
    correct: parseInt(document.getElementById(`q${i}correct`).value)
  });

  return {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    coordinates: lastMarker.getLatLng(),
    questions: [
      getQuestion(1),
      getQuestion(2),
      getQuestion(3),
      getQuestion(4)
    ]
  };
}

const form = document.getElementById('markerForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!lastMarker) {
    alert('Primero selecciona una ubicación en el mapa.');
    return;
  }
  const newData = getFormData();
  if (editIndex !== null) {
    markers[editIndex] = newData;
  } else {
    markers.push(newData);
  }
  updateMarkerList();
  resetFormFields();
  if (lastMarker) map.removeLayer(lastMarker);
  lastMarker = null;
});

const jsonForm = document.getElementById('saveJson');
jsonForm.addEventListener('click', () => {
  const townInput = document.getElementById('townName');
  const town = document.getElementById('townName').value.trim();
  const filePath = path.join(__dirname, '../json', `${town}.json`);
  if (!town) {
    townInput.focus();
    townInput.placeholder = '⚠️Error: Por favor, introduce un nombre';
    townInput.style.outline = '2px solid red';
    return;
  } else {
    const jsonData = {
    town,
    markers
    };
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        alert('Error al guardar el archivo JSON');
        console.error(err);
      } else {
        townInput.focus();
        townInput.placeholder = `Archivo guardado correctamente: ${filePath}`;
        townInput.style.outline = '2px solid green';
        townInput.value = '';
        setTimeout(() => {
          townInput.placeholder = '';
          townInput.style.outline = '';
        }, 5000);
      }
    });
  }
});

document.getElementById('loadJson').addEventListener('click', async () => {
  const result = await dialog.showOpenDialog({
    title: "Selecciona un archivo JSON.",
    defaultPath: path.join(__dirname, '../json'),
    filters: [{ name: 'Archivos JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return;
  const filePath = result.filePaths[0];
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      alert('Error al leer el archivo.');
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      if (!jsonData.town || !jsonData.markers) {
        alert('El archivo no tiene el formato esperado.');
        return;
      }
      document.getElementById('townName').value = jsonData.town;
      markers = jsonData.markers;
      updateMarkerList();
    } catch (e) {
      alert('El archivo no es un JSON válido.');
      console.error(e);
    }
  });
});

window.editMarker = function(index) {
  // 👇 cambiar el icono del marcador original a naranja
  const viejo = mapMarkers[index];
  if (viejo) viejo.setIcon(iconoEdicion);

  // limpiar lastMarker
  if (lastMarker) map.removeLayer(lastMarker);

  const marker = markers[index];
  const coords = marker.coordinates;
  // marcador temporal (azul) para edición
  lastMarker = L.marker([coords.lat, coords.lng], { icon: iconoNormal }).addTo(map);
  map.setView([coords.lat, coords.lng], 15);

  document.getElementById('coords').textContent =
    `Coordenadas seleccionadas: Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`;

  document.getElementById('title').value = marker.title;
  document.getElementById('description').value = marker.description;

  for (let i = 1; i <= 4; i++) {
    const q = marker.questions[i - 1];
    document.getElementById(`q${i}`).value = q.question;
    document.getElementById(`q${i}a`).value = q.options[0];
    document.getElementById(`q${i}b`).value = q.options[1];
    document.getElementById(`q${i}c`).value = q.options[2];
    document.getElementById(`q${i}d`).value = q.options[3];
    document.getElementById(`q${i}correct`).value = q.correct;
  }

  document.querySelectorAll('#markerForm input, textarea, select').forEach(el => {
    el.disabled = false;
    el.readOnly = false;
    el.style.pointerEvents = 'auto';
    el.style.backgroundColor = 'white';
  });

  document.getElementById('title').focus();
  editIndex = index;
};
