// Variables
const fs = require('fs');
const path = require('path');
const { dialog } = require('@electron/remote');
let lastMarker = null;
let markers = [];
let editIndex = null;

let map = L.map('map').setView([38.7926, 0.1631], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  if (lastMarker) map.removeLayer(lastMarker);
  lastMarker = L.marker([lat, lng]).addTo(map);
  document.getElementById('coords').textContent = `Coordenadas seleccionadas: Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
});

// Funciones

function resetFormFields() {
  const form = document.getElementById('markerForm');
  form.reset();
  document.getElementById('coords').textContent = 'Haz clic en el mapa para seleccionar una ubicación.';
  editIndex = null;
}

function updateMarkerList() {
  const list = document.getElementById('markerList');
  list.innerHTML = '';
  if (lastMarker) {
    map.removeLayer(lastMarker);
    lastMarker = null;
  }
  markers.forEach((marker, index) => {
    //Mostrar marcador en el mapa
    const mapMarker = L.marker([marker.coordinates.lat, marker.coordinates.lng]).addTo(map);
    mapMarker.on('click', () => {
      window.editMarker(index);
    });

    //Elemento en lista lateral
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.innerHTML = `<strong>${marker.title}</strong> (${marker.coordinates.lat.toFixed(5)}, ${marker.coordinates.lng.toFixed(5)})`;

    const btns = document.createElement('div');

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️ Editar';
    editBtn.addEventListener('click', () => {
      window.editMarker(index);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Eliminar';
    deleteBtn.addEventListener('click', () => {
      const confirmDelete = confirm(`¿Seguro que quieres eliminar el marcador "${marker.title}"?`);
      if (!confirmDelete) return;
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
jsonForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const town = document.getElementById('townName').value.trim();
  const filePath = path.join(__dirname, '../json', `${town}.json`);
  if (!town) {
    document.getElementById("townName").focus();
    return;
  } else {
    const jsonData = {
    town,
    markers
    };
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        alert('Error al guardar el archivo JSON.');
        console.error(err);
      } else {
        alert(`Archivo guardado correctamente: ${filePath}`);
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
  const marker = markers[index];
  const coords = marker.coordinates;

  if (lastMarker) map.removeLayer(lastMarker);
  lastMarker = L.marker([coords.lat, coords.lng]).addTo(map);
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