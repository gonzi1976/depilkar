const STORAGE = {
  appointments: "depilkar_appointments",
  schedule: "depilkar_schedule",
  password: "depilkar_admin_password"
};

const defaultSchedule = {
  0: { enabled: false, times: [] },
  1: { enabled: true, times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] },
  2: { enabled: true, times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] },
  3: { enabled: true, times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] },
  4: { enabled: true, times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] },
  5: { enabled: true, times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] },
  6: { enabled: false, times: [] }
};

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const $ = (selector) => document.querySelector(selector);
const getAppointments = () => JSON.parse(localStorage.getItem(STORAGE.appointments) || "[]");
const getSchedule = () => JSON.parse(localStorage.getItem(STORAGE.schedule) || JSON.stringify(defaultSchedule));
const localDate = (value) => new Date(`${value}T00:00:00`);
const dateLabel = (value) => localDate(value).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function updateTimes() {
  const date = $("#bookingDate").value;
  const select = $("#bookingTime");
  select.innerHTML = "";
  if (!date) {
    select.disabled = true;
    select.innerHTML = '<option value="">Primero elegí una fecha</option>';
    return;
  }
  const config = getSchedule()[localDate(date).getDay()];
  const taken = getAppointments().filter((item) => item.date === date && item.status !== "Cancelada").map((item) => item.time);
  const available = config && config.enabled ? config.times.filter((time) => !taken.includes(time)) : [];
  select.disabled = available.length === 0;
  select.innerHTML = available.length
    ? '<option value="">Selecciona un horario</option>' + available.map((time) => `<option>${time}</option>`).join("")
    : '<option value="">No hay horarios disponibles</option>';
}

function initBooking() {
  const dateInput = $("#bookingDate");
  dateInput.min = todayISO();
  dateInput.addEventListener("change", updateTimes);
  $("#bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = $("#bookingMessage");
    const appointment = {
      id: window.crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      service: $("#service").value,
      date: dateInput.value,
      time: $("#bookingTime").value,
      name: $("#fullName").value.trim().replace(/\s+/g, " "),
      phone: $("#phone").value.trim(),
      status: "Confirmada",
      createdAt: new Date().toISOString()
    };
    if (!appointment.time || appointment.date < todayISO()) {
      message.textContent = "Selecciona una fecha y un horario validos.";
      return;
    }
    const appointments = getAppointments();
    if (appointments.some((item) => item.date === appointment.date && item.time === appointment.time && item.status !== "Cancelada")) {
      message.textContent = "Ese horario acaba de ser reservado. Elegí otro, por favor.";
      updateTimes();
      return;
    }
    appointments.push(appointment);
    localStorage.setItem(STORAGE.appointments, JSON.stringify(appointments));
    event.target.reset();
    dateInput.min = todayISO();
    updateTimes();
    message.textContent = `Reserva confirmada para el ${dateLabel(appointment.date)} a las ${appointment.time}.`;
    message.className = "form-message full success";
    showToast("Tu reserva fue confirmada");
  });
}

function renderSchedule() {
  const schedule = getSchedule();
  $("#scheduleForm").innerHTML = dayNames.map((day, index) => `
    <div class="day-row">
      <label><input type="checkbox" data-day-enabled="${index}" ${schedule[index].enabled ? "checked" : ""}> ${day}</label>
      <input type="text" data-day-times="${index}" value="${escapeHTML(schedule[index].times.join(", "))}" placeholder="09:00, 10:30, 14:00" ${schedule[index].enabled ? "" : "disabled"}>
    </div>`).join("");
  document.querySelectorAll("[data-day-enabled]").forEach((checkbox) => checkbox.addEventListener("change", () => {
    document.querySelector(`[data-day-times="${checkbox.dataset.dayEnabled}"]`).disabled = !checkbox.checked;
  }));
}

function renderDashboard() {
  const appointments = getAppointments().sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const active = appointments.filter((item) => item.status !== "Cancelada");
  const upcoming = active.filter((item) => item.date >= todayISO());
  const clientKeys = new Set(active.map((item) => `${item.name.toLowerCase()}|${item.phone}`));
  $("#stats").innerHTML = `<div class="stat"><strong>${upcoming.length}</strong><span>Proximas reservas</span></div><div class="stat"><strong>${clientKeys.size}</strong><span>Clientes registrados</span></div><div class="stat"><strong>${active.filter((item) => item.date === todayISO()).length}</strong><span>Sesiones hoy</span></div>`;
  const table = $("#appointmentsTable");
  table.innerHTML = appointments.length ? appointments.map((item) => `<tr><td>${dateLabel(item.date)} · ${escapeHTML(item.time)}</td><td>${escapeHTML(item.name)}</td><td>${escapeHTML(item.service)}</td><td>${escapeHTML(item.phone)}</td><td><span class="status">${escapeHTML(item.status)}</span></td><td>${item.status !== "Cancelada" ? `<button class="cancel-button" data-cancel="${item.id}" type="button">Cancelar</button>` : ""}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">Todavia no hay reservas.</td></tr>';
  document.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => {
    const changed = getAppointments().map((item) => item.id === button.dataset.cancel ? { ...item, status: "Cancelada" } : item);
    localStorage.setItem(STORAGE.appointments, JSON.stringify(changed));
    renderDashboard();
  }));
  const clients = new Map();
  active.forEach((item) => {
    const key = `${item.name.toLowerCase()}|${item.phone}`;
    const current = clients.get(key) || { name: item.name, phone: item.phone, count: 0, last: item.date };
    current.count += 1;
    if (item.date > current.last) current.last = item.date;
    clients.set(key, current);
  });
  $("#clientsTable").innerHTML = clients.size ? [...clients.values()].map((client) => `<tr><td>${escapeHTML(client.name)}</td><td>${escapeHTML(client.phone)}</td><td>${client.count}</td><td>${dateLabel(client.last)}</td></tr>`).join("") : '<tr><td colspan="4" class="empty">Todavia no hay clientes registrados.</td></tr>';
}

function csvDownload(filename, rows) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function initAdmin() {
  const dialog = $("#adminDialog");
  $("#adminOpen").addEventListener("click", () => dialog.showModal());
  $("#adminClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const password = localStorage.getItem(STORAGE.password) || "N4c10n4l.1899";
    if ($("#adminUser").value.trim().toLowerCase() === "admin" && $("#adminPassword").value === password) {
      $("#loginView").hidden = true;
      $("#dashboardView").hidden = false;
      $("#loginMessage").textContent = "";
      renderSchedule();
      renderDashboard();
    } else {
      $("#loginMessage").textContent = "Usuario o contraseña incorrectos.";
    }
  });
  $("#logoutButton").addEventListener("click", () => {
    $("#dashboardView").hidden = true;
    $("#loginView").hidden = false;
    $("#loginForm").reset();
    $("#adminUser").value = "admin";
  });
  document.querySelectorAll(".admin-tabs button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    $(`#${button.dataset.tab}Panel`).classList.add("active");
  }));
  $("#saveSchedule").addEventListener("click", () => {
    const schedule = {};
    let valid = true;
    dayNames.forEach((_, index) => {
      const enabled = document.querySelector(`[data-day-enabled="${index}"]`).checked;
      const raw = document.querySelector(`[data-day-times="${index}"]`).value;
      const times = [...new Set(raw.split(",").map((time) => time.trim()).filter(Boolean))].sort();
      if (enabled && (!times.length || times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) valid = false;
      schedule[index] = { enabled, times };
    });
    const message = $("#scheduleMessage");
    if (!valid) {
      message.className = "form-message";
      message.textContent = "Usa horarios validos en formato HH:MM, separados por coma.";
      return;
    }
    localStorage.setItem(STORAGE.schedule, JSON.stringify(schedule));
    message.className = "form-message success";
    message.textContent = "Disponibilidad guardada.";
    updateTimes();
  });
  $("#passwordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const current = localStorage.getItem(STORAGE.password) || "N4c10n4l.1899";
    const next = $("#newPassword").value;
    const message = $("#passwordMessage");
    if ($("#currentPassword").value !== current) message.textContent = "La contraseña actual no es correcta.";
    else if (next !== $("#confirmPassword").value) message.textContent = "Las nuevas contraseñas no coinciden.";
    else {
      localStorage.setItem(STORAGE.password, next);
      event.target.reset();
      message.className = "form-message success";
      message.textContent = "Contraseña actualizada correctamente.";
    }
  });
  $("#exportAppointments").addEventListener("click", () => {
    const rows = [["Fecha", "Hora", "Cliente", "Celular", "Servicio", "Estado"], ...getAppointments().map((item) => [item.date, item.time, item.name, item.phone, item.service, item.status])];
    csvDownload(`agenda-depil-kar-${todayISO()}.csv`, rows);
  });
  $("#exportClients").addEventListener("click", () => {
    const grouped = new Map();
    getAppointments().filter((item) => item.status !== "Cancelada").forEach((item) => {
      const key = `${item.name.toLowerCase()}|${item.phone}`;
      const client = grouped.get(key) || { name: item.name, phone: item.phone, count: 0, last: item.date };
      client.count += 1;
      if (item.date > client.last) client.last = item.date;
      grouped.set(key, client);
    });
    csvDownload(`clientes-depil-kar-${todayISO()}.csv`, [["Nombre", "Celular", "Reservas", "Ultima reserva"], ...[...grouped.values()].map((item) => [item.name, item.phone, item.count, item.last])]);
  });
}

$("#year").textContent = new Date().getFullYear();
$("#menuButton").addEventListener("click", () => {
  const nav = $("#mainNav");
  nav.classList.toggle("open");
  $("#menuButton").setAttribute("aria-expanded", nav.classList.contains("open"));
});
document.querySelectorAll("#mainNav a").forEach((link) => link.addEventListener("click", () => $("#mainNav").classList.remove("open")));
initBooking();
initAdmin();
