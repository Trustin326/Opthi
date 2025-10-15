
// PWA install
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-flex';
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// About dialog
const aboutLink = document.getElementById('aboutLink');
const aboutDialog = document.getElementById('aboutDialog');
aboutLink.addEventListener('click', (e) => { e.preventDefault(); aboutDialog.showModal(); });

// Settings: PIN gate (lightweight)
const lockBtn = document.getElementById('lockBtn');
const pinInput = document.getElementById('pinInput');
const setPinBtn = document.getElementById('setPinBtn');
const APP_LOCK_KEY = 'ophth.pin';
const BODY_LOCK_CLASS = 'locked';

function updateLockUI(locked) {
  document.body.style.filter = locked ? 'blur(6px)' : 'none';
  document.body.style.pointerEvents = locked ? 'none' : 'auto';
  if (locked) {
    // Create overlay prompt
    let overlay = document.getElementById('lockOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lockOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:#0e2a47;display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;padding:1rem;';
      overlay.innerHTML = `
        <div style="max-width:420px;width:92%;background:#102d52;border-radius:16px;padding:1rem;border:1px solid #335584;">
          <h3 style="margin-top:0">Enter PIN</h3>
          <input id="unlockPin" type="password" placeholder="PIN" style="width:100%;padding:0.6rem;border-radius:10px;border:none;margin:.5rem 0;">
          <div style="display:flex;justify-content:flex-end;gap:.5rem;">
            <button id="unlockBtn" class="btn">Unlock</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#unlockBtn').addEventListener('click', () => {
        const setPin = localStorage.getItem(APP_LOCK_KEY);
        const val = overlay.querySelector('#unlockPin').value;
        if (setPin && val && val === setPin) {
          updateLockUI(false);
          overlay.remove();
        } else {
          alert('Incorrect PIN');
        }
      });
    }
  } else {
    const overlay = document.getElementById('lockOverlay');
    if (overlay) overlay.remove();
  }
}

lockBtn.addEventListener('click', () => {
  const setPin = localStorage.getItem(APP_LOCK_KEY);
  if (setPin) updateLockUI(true);
  else alert('No PIN set yet. Set one in Settings.');
});

setPinBtn.addEventListener('click', () => {
  const v = pinInput.value.trim();
  if (!v || v.length < 4) return alert('Use 4–8 digits.');
  localStorage.setItem(APP_LOCK_KEY, v);
  alert('PIN saved.');
  pinInput.value = '';
});

// Patients
const patientList = document.getElementById('patientList');
const newPatientBtn = document.getElementById('newPatientBtn');
const patientDialog = document.getElementById('patientDialog');
const patientForm = document.getElementById('patientForm');
const savePatientBtn = document.getElementById('savePatientBtn');

const LS_PATIENTS = 'ophth.patients';
const LS_REMINDERS = 'ophth.reminders';

function loadPatients() {
  const arr = JSON.parse(localStorage.getItem(LS_PATIENTS) || '[]');
  patientList.innerHTML = '';
  arr.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3 style="margin:0">${p.identifier || '—'}</h3>
        <div style="display:flex;gap:.4rem">
          <button class="btn ghost" data-edit="${idx}">Edit</button>
          <button class="btn danger" data-del="${idx}">Delete</button>
        </div>
      </div>
      <p class="muted tiny">${p.allergies ? 'Allergies: '+p.allergies : ''}</p>
      <p>${p.plan || ''}</p>
      <p class="muted tiny">${p.iol ? 'IOL: '+p.iol : ''} ${p.target ? ' | Target: '+p.target+' D' : ''}</p>
      <p class="muted tiny">${p.followup ? 'Follow-up: '+new Date(p.followup).toLocaleString() : ''}</p>
    `;
    patientList.appendChild(el);
  });

  // Bind edit/delete
  patientList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openPatientDialog(parseInt(btn.dataset.edit, 10)));
  });
  patientList.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.del, 10);
      const arr = JSON.parse(localStorage.getItem(LS_PATIENTS) || '[]');
      const [removed] = arr.splice(idx, 1);
      localStorage.setItem(LS_PATIENTS, JSON.stringify(arr));
      loadPatients();
      // also remove reminder if exists
      if (removed.followup) {
        const rem = JSON.parse(localStorage.getItem(LS_REMINDERS) || '[]').filter(r => r.id !== removed.id);
        localStorage.setItem(LS_REMINDERS, JSON.stringify(rem));
      }
    });
  });
}

function openPatientDialog(idx = -1) {
  document.getElementById('patientDialogTitle').textContent = idx >=0 ? 'Edit Patient' : 'New Patient';
  const idEl = document.getElementById('patientId');
  const idf = document.getElementById('p_identifier');
  const plan = document.getElementById('p_plan');
  const target = document.getElementById('p_target');
  const allergies = document.getElementById('p_allergies');
  const iol = document.getElementById('p_iol');
  const followup = document.getElementById('p_followup');

  if (idx >= 0) {
    const arr = JSON.parse(localStorage.getItem(LS_PATIENTS) || '[]');
    const p = arr[idx];
    idEl.value = idx;
    idf.value = p.identifier || '';
    plan.value = p.plan || '';
    target.value = p.target || '';
    allergies.value = p.allergies || '';
    iol.value = p.iol || '';
    followup.value = p.followup || '';
  } else {
    idEl.value='';
    idf.value=''; plan.value=''; target.value=''; allergies.value=''; iol.value=''; followup.value='';
  }
  patientDialog.showModal();
}

function scheduleReminder(p) {
  if (!('Notification' in window)) return;
  const when = new Date(p.followup).getTime() - Date.now();
  if (when <= 0 || when > 1000*60*60*24*30) return; // ignore >30 days for demo
  setTimeout(() => {
    new Notification('Follow-up reminder', { body: `${p.identifier}: ${p.plan || ''}` });
  }, when);
}

newPatientBtn.addEventListener('click', () => openPatientDialog(-1));
patientForm.addEventListener('submit', (e) => {
  e.preventDefault();
});
savePatientBtn.addEventListener('click', () => {
  const id = document.getElementById('patientId').value;
  const obj = {
    id: crypto.randomUUID(),
    identifier: document.getElementById('p_identifier').value.trim(),
    plan: document.getElementById('p_plan').value.trim(),
    target: document.getElementById('p_target').value.trim(),
    allergies: document.getElementById('p_allergies').value.trim(),
    iol: document.getElementById('p_iol').value.trim(),
    followup: document.getElementById('p_followup').value
  };
  let arr = JSON.parse(localStorage.getItem(LS_PATIENTS) || '[]');
  if (id !== '') arr[parseInt(id,10)] = {...arr[parseInt(id,10)], ...obj};
  else arr.unshift(obj);
  localStorage.setItem(LS_PATIENTS, JSON.stringify(arr));
  loadPatients();
  patientDialog.close();

  if (obj.followup) {
    Notification.requestPermission().then(() => scheduleReminder(obj));
    const rem = JSON.parse(localStorage.getItem(LS_REMINDERS) || '[]');
    rem.push({ id: obj.id, when: obj.followup });
    localStorage.setItem(LS_REMINDERS, JSON.stringify(rem));
  }
});

// Checklists
const checklistItems = document.getElementById('checklistItems');
const checklistTemplate = document.getElementById('checklistTemplate');
const loadChecklistBtn = document.getElementById('loadChecklist');
const addChecklistItemBtn = document.getElementById('addChecklistItem');
const clearChecklistBtn = document.getElementById('clearChecklist');
const saveChecklistBtn = document.getElementById('saveChecklist');
const LS_CHECKLIST = 'ophth.checklist';

const templates = {
  cataract: [
    'Consent signed', 'Biometry verified', 'Preferred IOL available', 'Mark astig axis (if toric)',
    'Pupil dilation adequate', 'Antisepsis (povidone-iodine)', 'Speculum', 'Phaco handpiece test', 'Viscoelastic ready'
  ],
  lasik: [
    'Consent updated', 'Refraction stable', 'Topography reviewed', 'Flap parameters set',
    'Laser calibration', 'Antibiotic drop pre-op', 'Eye marker/alignment'
  ],
  glaucoma: [
    'Consent signed', 'Angle evaluated', 'Device (Trab, Tube, MIGS) ready', 'Mitomycin (if planned)',
    'Anterior chamber depth adequate', 'Peripheral iridectomy plan'
  ],
  retina: [
    'Consent signed', 'Imaging reviewed (OCT/FAF/FA)', 'Tamponade plan', 'Laser settings ready',
    'Instrument set verified', 'Antibiotic prophylaxis per protocol'
  ],
  cornea: [
    'Consent signed', 'Graft type/size confirmed', 'Donor tissue verified', 'Trephine checked',
    'Sutures/materials ready', 'Antibiotic/antifungal coverage'
  ]
};

function renderChecklist(items) {
  checklistItems.innerHTML = '';
  items.forEach((txt, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="checkbox" data-idx="${i}" class="chk">
      <input type="text" value="${txt}" class="txt">
      <button class="btn ghost" data-del="${i}">🗑</button>
    `;
    checklistItems.appendChild(li);
  });
}

loadChecklistBtn.addEventListener('click', () => {
  const t = checklistTemplate.value;
  const items = templates[t] ? [...templates[t]] : [];
  renderChecklist(items);
});

addChecklistItemBtn.addEventListener('click', () => {
  const li = document.createElement('li');
  li.innerHTML = `
    <input type="checkbox" class="chk">
    <input type="text" value="" class="txt" placeholder="New item">
    <button class="btn ghost" data-del="x">🗑</button>
  `;
  checklistItems.appendChild(li);
});

clearChecklistBtn.addEventListener('click', () => { checklistItems.innerHTML = ''; });

saveChecklistBtn.addEventListener('click', () => {
  const items = Array.from(checklistItems.querySelectorAll('.txt')).map(i => i.value);
  localStorage.setItem(LS_CHECKLIST, JSON.stringify(items));
  alert('Checklist saved locally.');
});

checklistItems.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-del]');
  if (!btn) return;
  const li = btn.closest('li');
  li.remove();
});

// Calculators
document.getElementById('calcSRK').addEventListener('click', () => {
  const A = parseFloat(document.getElementById('srkA').value);
  const L = parseFloat(document.getElementById('srkL').value);
  const K = parseFloat(document.getElementById('srkK').value);
  if ([A,L,K].some(isNaN)) return alert('Enter A, L, and K.');
  const P = A - 2.5*L - 0.9*K;
  document.getElementById('srkResult').textContent = `Estimated IOL power: ${P.toFixed(2)} D (SRK II approx.)`;
});

document.getElementById('buildDrops').addEventListener('click', () => {
  const label = document.getElementById('dropLabel').value.trim() || 'Medication';
  const freq = Math.max(1, Math.min(12, parseInt(document.getElementById('dropFreq').value || '4', 10)));
  const days = Math.max(1, Math.min(42, parseInt(document.getElementById('dropDays').value || '14', 10)));
  const now = new Date();
  const plan = [];
  for (let d=0; d<days; d++) {
    const day = new Date(now.getTime() + d*24*60*60*1000);
    plan.push({ date: day.toDateString(), times: freq });
  }
  const target = document.getElementById('dropPlan');
  target.innerHTML = `<h4>${label}</h4>` + plan.map(p => `<div>• ${p.date}: ${p.times}x</div>`).join('');
});

// Drug reference (local JSON)
async function loadDrugs() {
  const res = await fetch('data/drugs.json');
  return await res.json();
}
document.getElementById('drugSearch').addEventListener('click', async () => {
  const q = document.getElementById('drugQuery').value.trim().toLowerCase();
  const list = document.getElementById('drugResults');
  const db = await loadDrugs();
  const filtered = db.filter(d => d.name.toLowerCase().includes(q) || d.class.toLowerCase().includes(q));
  if (!filtered.length) { list.innerHTML = '<div class="muted tiny">No matches</div>'; return; }
  list.innerHTML = filtered.map(d => `
    <div class="card">
      <strong>${d.name}</strong> <span class="muted tiny">(${d.class})</span>
      <p class="muted tiny">${d.notes}</p>
    </div>
  `).join('');
});

// Images: local viewer (session)
const imgInput = document.getElementById('imgInput');
const imgGrid = document.getElementById('imgGrid');
imgInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const fig = document.createElement('figure');
    fig.innerHTML = `<img src="${url}" alt="${f.name}"><figcaption class="tiny">${f.name}</figcaption>`;
    imgGrid.prepend(fig);
  }
});

// Notifications
const notifBtn = document.getElementById('notifBtn');
notifBtn.addEventListener('click', async () => {
  try {
    const perm = await Notification.requestPermission();
    alert(perm === 'granted' ? 'Notifications enabled.' : 'Notifications not granted.');
  } catch (e) {
    alert('Notifications not supported.');
  }
});

// Export / Import
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
exportBtn.addEventListener('click', () => {
  const data = {
    patients: JSON.parse(localStorage.getItem(LS_PATIENTS) || '[]'),
    checklist: JSON.parse(localStorage.getItem(LS_CHECKLIST) || '[]'),
    reminders: JSON.parse(localStorage.getItem(LS_REMINDERS) || '[]')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ophthalmic_widget_export.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
});
importInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const txt = await file.text();
  try {
    const data = JSON.parse(txt);
    if (data.patients) localStorage.setItem(LS_PATIENTS, JSON.stringify(data.patients));
    if (data.checklist) localStorage.setItem(LS_CHECKLIST, JSON.stringify(data.checklist));
    if (data.reminders) localStorage.setItem(LS_REMINDERS, JSON.stringify(data.reminders));
    alert('Import complete.');
    loadPatients();
  } catch (e) {
    alert('Invalid JSON.');
  }
});

// Init
loadPatients();
