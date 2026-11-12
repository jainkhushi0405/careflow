"use client";

import { useEffect, useState } from "react";

type Role = "Admin" | "Doctor" | "Nurse";

type Reading = {
  date: string;
  value: number;
  nurse: string;
};

type Patient = {
  id: string;
  name: string;
  room: string;
  nurse: string;
  active: boolean;
  readings: Reading[];
};

type Consultation = {
  id: number;
  patientId: string;
  doctor: string;
  notes: string;
  treatment: string;
  date: string;
};

type Discharge = {
  patientId: string;
  doctorApproved: boolean;
  adminCompleted: boolean;
};

// This helper is called only inside useEffect, never while rendering.
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const previousDate = (date: string, days: number) => {
  if (!date) return "";
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialPatients: Patient[] = [
  { id: "CF-1001", name: "Aarav Sharma", room: "R-01", nurse: "Priya", active: true, readings: [{ date: "", value: 36.8, nurse: "Priya" }] },
  { id: "CF-1002", name: "Meera Patel", room: "R-02", nurse: "Anjali", active: true, readings: [{ date: "", value: 38.4, nurse: "Anjali" }] },
  { id: "CF-1003", name: "Rohan Mehta", room: "R-03", nurse: "Priya", active: true, readings: [{ date: "", value: 37.1, nurse: "Priya" }] },
  { id: "CF-1004", name: "Ananya Shah", room: "R-04", nurse: "Neha", active: true, readings: [{ date: "", value: 36.6, nurse: "Neha" }] },
];

const navItems = [
  ["▦", "Dashboard"],
  ["♙", "Patients"],
  ["🌡", "Temperature Tracking"],
  ["✚", "Doctor Consultations"],
  ["✓", "Discharge Management"],
  ["☷", "Task Queue"],
  ["♧", "Alerts"],
  ["⇄", "Shift Handover"],
  ["▥", "Analytics"],
  ["✧", "CareFlow Insights"],
];

const cardClass = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm";
const inputClass = "w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-teal-400";
const primaryButton = "bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-3 text-sm font-semibold";
const secondaryButton = "border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-3 text-sm font-semibold";

export default function Home() {
  const [page, setPage] = useState("Dashboard");
  const [role, setRole] = useState<Role>("Admin");
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [todayDate, setTodayDate] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [discharges, setDischarges] = useState<Discharge[]>([]);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [selected, setSelected] = useState("CF-1001");
  const [temperature, setTemperature] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [consultPatient, setConsultPatient] = useState("CF-1001");
  const [consultNotes, setConsultNotes] = useState("");
  const [consultTreatment, setConsultTreatment] = useState("");
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read the current date only after the component has mounted in the browser.
    const currentDate = getLocalDate();
    setTodayDate(currentDate);
    setReadingDate(currentDate);

    let loadedSavedData = false;

    try {
      const saved = window.localStorage.getItem("careflow-demo-v1");
      if (saved) {
        const data: unknown = JSON.parse(saved);
        if (data && typeof data === "object") {
          const stored = data as {
            patients?: unknown;
            consultations?: unknown;
            discharges?: unknown;
          };
          if (Array.isArray(stored.patients)) setPatients(stored.patients as Patient[]);
          if (Array.isArray(stored.consultations)) setConsultations(stored.consultations as Consultation[]);
          if (Array.isArray(stored.discharges)) setDischarges(stored.discharges as Discharge[]);
          loadedSavedData = Array.isArray(stored.patients)
            || Array.isArray(stored.consultations)
            || Array.isArray(stored.discharges);
        }
      }
    } catch (error) {
      console.error("Could not load saved demo data.", error);
    }

    // Seed demo records with today's date only on the client.
    if (!loadedSavedData) {
      setPatients(initialPatients.map(patient => ({
        ...patient,
        readings: patient.readings.map(reading => ({ ...reading, date: currentDate })),
      })));
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem("careflow-demo-v1", JSON.stringify({
        patients,
        consultations,
        discharges,
      }));
    } catch (error) {
      console.error("Could not save demo data in this browser.", error);
    }
  }, [patients, consultations, discharges, hydrated]);

  const activePatients = patients.filter(p => p.active);
  const stable = activePatients.filter(p => {
    const value = latestReading(p)?.value;
    return value !== undefined && value < 38;
  }).length;
  const fever = activePatients.filter(p => {
    const value = latestReading(p)?.value;
    return value !== undefined && value >= 38;
  }).length;
  const pendingTemps = activePatients.filter(p => !p.readings.some(r => r.date === todayDate)).length;
  const pendingConsultations = activePatients.filter(p =>
    !consultations.some(c => c.patientId === p.id && c.date === todayDate)
  ).length;

  function latestReading(patient: Patient) {
    return [...patient.readings].sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  function feverFreeDays(patient: Patient) {
    let count = 0;
    if (!todayDate) return count;

    // Three complete days before today must have readings,
    // and every reading on each day must be below 38°C.
    for (let i = 1; i <= 3; i++) {
      const date = previousDate(todayDate, i);
      const daily = patient.readings.filter(r => r.date === date);

      if (daily.length === 0 || daily.some(r => r.value >= 38)) break;
      count++;
    }

    return count;
  }

  function getDischarge(patientId: string) {
    return discharges.find(d => d.patientId === patientId);
  }

  function addPatient() {
    if (role !== "Admin") {
      setMessage("Only Admin can register new patients.");
      return;
    }

    if (!name.trim() || !room.trim()) {
      setMessage("Please enter patient name and room.");
      return;
    }

    if (activePatients.length >= 74) {
      setMessage("All 74 rooms are occupied.");
      return;
    }

    if (patients.some(p => p.active && p.room.toLowerCase() === room.trim().toLowerCase())) {
      setMessage("This room is already occupied.");
      return;
    }

    const nextId = Math.max(1000, ...patients.map(p => Number(p.id.replace("CF-", "")) || 1000)) + 1;

    setPatients(prev => [...prev, {
      id: `CF-${nextId}`,
      name: name.trim(),
      room: room.trim(),
      nurse: "Unassigned",
      active: true,
      readings: [],
    }]);

    setName("");
    setRoom("");
    setMessage("Patient registered successfully!");
  }

  function recordTemperature() {
    if (role !== "Nurse") {
      setMessage("Temperature recording is available to Nurse role.");
      return;
    }

    const value = Number(temperature);
    const patient = patients.find(p => p.id === selected);

    if (!patient || !patient.active) {
      setMessage("Please select an active patient.");
      return;
    }

    if (!temperature || !Number.isFinite(value) || value < 30 || value > 45) {
      setMessage("Enter a valid temperature between 30 and 45°C.");
      return;
    }

    if (todayDate && readingDate > todayDate) {
      setMessage("Future temperature readings are not allowed.");
      return;
    }

    setPatients(prev => prev.map(p => p.id === selected ? {
      ...p,
      readings: [...p.readings, {
        date: readingDate,
        value,
        nurse: "Nurse",
      }],
    } : p));

    setTemperature("");
    setMessage("Temperature reading recorded successfully!");
  }
  function saveConsultation() {
    if (role !== "Doctor") {
      setMessage("Only a Doctor can save consultation records.");
      return;
    }

    if (!consultNotes.trim() || !consultTreatment.trim()) {
      setMessage("Please enter consultation notes and treatment plan.");
      return;
    }

    const patient = patients.find(p => p.id === consultPatient && p.active);

    if (!patient) {
      setMessage("Please select an active patient.");
      return;
    }

    setConsultations(prev => [...prev, {
      id: Date.now(),
      patientId: consultPatient,
      doctor: "Doctor",
      notes: consultNotes.trim(),
      treatment: consultTreatment.trim(),
      date: todayDate,
    }]);

    setConsultNotes("");
    setConsultTreatment("");
    setMessage("Consultation saved successfully!");
  }

  function approveDischarge(patient: Patient) {
    if (role !== "Doctor") {
      setMessage("Only a Doctor can approve discharge.");
      return;
    }

    if (feverFreeDays(patient) < 3) {
      setMessage("Three complete fever-free days have not been verified.");
      return;
    }

    setDischarges(prev => [
      ...prev.filter(d => d.patientId !== patient.id),
      { patientId: patient.id, doctorApproved: true, adminCompleted: false },
    ]);

    setMessage("Doctor discharge approval recorded.");
  }

  function completeDischarge(patient: Patient) {
    if (role !== "Admin") {
      setMessage("Only Admin can complete discharge.");
      return;
    }

    const d = getDischarge(patient.id);

    if (!d?.doctorApproved || d.adminCompleted) {
      setMessage("Doctor approval is required before discharge.");
      return;
    }

    setPatients(prev => prev.map(p =>
      p.id === patient.id ? { ...p, active: false } : p
    ));

    setDischarges(prev => prev.map(x =>
      x.patientId === patient.id
        ? { ...x, adminCompleted: true }
        : x
    ));

    setMessage("Patient discharge completed in demo workflow.");
  }

  function goTo(next: string) {
    setPage(next);
    setMessage("");
  }

  const patientById = (id: string) => patients.find(p => p.id === id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <aside className="bg-[#10253F] text-white md:w-64 md:min-h-screen p-5 shrink-0">
        <div className="flex items-center gap-3 mb-9">
          <div className="bg-teal-400 text-[#10253F] rounded-xl p-3 font-black">C+</div>
          <div>
            <h1 className="text-xl font-bold">CareFlow</h1>
            <p className="text-xs text-slate-400">PATIENT CARE OPERATIONS</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 uppercase mb-3">Workspace</p>

        <nav className="space-y-2">
          {navItems.map(([icon, label]) => (
            <button
              key={label}
              onClick={() => goTo(label)}
              className={`w-full text-left p-3 rounded-xl flex gap-3 items-center text-sm transition ${page === label ? "bg-teal-500 text-white" : "text-slate-300 hover:bg-slate-700"
                }`}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div className="mt-8 p-4 bg-slate-700/60 rounded-xl">
          <p className="font-semibold text-sm">Facility Status</p>
          <p className="text-xs text-teal-300 mt-2">● Operational</p>
          <p className="text-xs text-slate-400 mt-1">74 rooms in total</p>
          <p className="text-xs text-slate-400 mt-1">{74 - activePatients.length} rooms available</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 px-5 md:px-7 py-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-xs text-slate-400">Healthcare / {page}</p>
            <h2 className="font-bold text-lg">{page}</h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500">Demo role</label>
            <select
              className="border rounded-lg p-2 text-sm bg-white"
              value={role}
              onChange={e => {
                setRole(e.target.value as Role);
                setMessage("Role changed successfully.");
              }}
            >
              <option>Admin</option>
              <option>Doctor</option>
              <option>Nurse</option>
            </select>
            <div className="rounded-full bg-teal-100 text-teal-800 font-bold p-3">
              {role.slice(0, 1)}
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-7xl mx-auto">

          {page === "Dashboard" && <>
            <div className="mb-7">
              <p className="text-teal-600 text-sm font-semibold">CARE OPERATIONS</p>
              <h1 className="text-3xl font-bold mt-2">Good morning, {role} 👋</h1>
              <p className="text-slate-500 mt-2">Here is your facility's operational overview.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
              {[
                ["Total Patients", activePatients.length, "Currently admitted", "♙"],
                ["Occupied Rooms", `${activePatients.length}/74`, `${74 - activePatients.length} available`, "▦"],
                ["Pending Temperature", pendingTemps, "Daily monitoring", "🌡"],
                ["Doctor Visits Pending", pendingConsultations, "Requires attention", "✚"],
              ].map(([title, value, sub, icon]) => (
                <div key={String(title)} className={cardClass}>
                  <div className="flex justify-between text-slate-500 text-sm">
                    {title}<span className="text-2xl">{icon}</span>
                  </div>
                  <p className="text-3xl font-bold mt-4">{value}</p>
                  <p className="text-xs text-slate-400 mt-2">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <section className={`${cardClass} lg:col-span-2`}>
                <div className="flex justify-between mb-5">
                  <h3 className="font-bold text-lg">Recent Patients</h3>
                  <button className="text-teal-600 text-sm" onClick={() => goTo("Patients")}>View all →</button>
                </div>
                <PatientTable patients={activePatients} latestReading={latestReading} />
              </section>

              <section className={cardClass}>
                <h3 className="font-bold text-lg mb-5">Patient Health Overview</h3>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-teal-600">{stable}</p>
                  <p className="text-sm text-slate-500">Stable patients</p>
                </div>
                <div className="border-t py-4 flex justify-between text-sm">
                  Fever detected <b className="text-red-500">{fever}</b>
                </div>
                <div className="border-t py-4 flex justify-between text-sm">
                  Total patients <b>{activePatients.length}</b>
                </div>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs mt-3">
                  Review fever readings with the medical team.
                </div>
              </section>
            </div>

            <section className={`${cardClass} mt-5`}>
              <h3 className="font-bold mb-4">Operational Alerts</h3>
              {pendingTemps > 0 && <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mb-2">⚠ {pendingTemps} patients need today's temperature reading.</p>}
              {fever > 0 && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg mb-2">⚠ {fever} patients have a latest fever reading requiring medical review.</p>}
              {pendingConsultations > 0 && <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">ℹ {pendingConsultations} patients have no consultation recorded today.</p>}
              {pendingTemps === 0 && fever === 0 && pendingConsultations === 0 && <p className="text-sm text-green-700">No pending operational alerts.</p>}
            </section>
          </>}

          {page === "Patients" && <>
            <h1 className="text-2xl font-bold mb-2">Patient Management</h1>
            <p className="text-slate-500 mb-6">Register and manage admitted patients.</p>

            {role === "Admin" && <section className={`${cardClass} mb-6`}>
              <h3 className="font-bold mb-4">Register New Patient</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input className={inputClass} placeholder="Patient full name" value={name} onChange={e => setName(e.target.value)} />
                <input className={inputClass} placeholder="Room (e.g. R-05)" value={room} onChange={e => setRoom(e.target.value)} />
                <button onClick={addPatient} className={primaryButton}>+ Add Patient</button>
              </div>
            </section>}

            <section className={cardClass}>
              <h3 className="font-bold mb-4">Admitted Patients ({activePatients.length})</h3>
              <PatientTable patients={activePatients} latestReading={latestReading} />
            </section>

            <section className={`${cardClass} mt-5`}>
              <h3 className="font-bold mb-4">Discharged Patient History</h3>
              {patients.filter(p => !p.active).length === 0
                ? <p className="text-sm text-slate-500">No patients discharged yet.</p>
                : patients.filter(p => !p.active).map(p => (
                  <p key={p.id} className="border-b py-3 text-sm">{p.name} · {p.id} · {p.room} · Discharged</p>
                ))}
            </section>
          </>}

          {page === "Temperature Tracking" && <>
            <h1 className="text-2xl font-bold mb-2">Temperature Tracking</h1>
            <p className="text-slate-500 mb-6">Record and monitor dated patient temperatures.</p>

            {role === "Nurse" ? <section className={`${cardClass} max-w-xl`}>
              <h3 className="font-bold mb-4">Record Temperature</h3>
              <label className="text-sm block mb-2">Select Patient</label>
              <select className={`${inputClass} mb-4`} value={selected} onChange={e => setSelected(e.target.value)}>
                {activePatients.map(p => <option key={p.id} value={p.id}>{p.name} – {p.room}</option>)}
              </select>
              <label className="text-sm block mb-2">Temperature (°C)</label>
              <input type="number" step="0.1" placeholder="e.g. 37.2" value={temperature} onChange={e => setTemperature(e.target.value)} className={`${inputClass} mb-4`} />
              <label className="text-sm block mb-2">Reading date</label>
              <input type="date" max={todayDate} value={readingDate} onChange={e => setReadingDate(e.target.value)} className={`${inputClass} mb-4`} />
              <button onClick={recordTemperature} className={`${primaryButton} w-full`}>Save Temperature</button>
            </section> : <p className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm">Switch to Nurse role to record temperature readings.</p>}

            <section className={`${cardClass} mt-5`}>
              <h3 className="font-bold mb-4">Latest Patient Readings</h3>
              <PatientTable patients={activePatients} latestReading={latestReading} />
            </section>

            <section className={`${cardClass} mt-5`}>
              <h3 className="font-bold mb-4">Temperature History</h3>
              {activePatients.map(p => (
                <div key={p.id} className="border-b py-3">
                  <p className="font-semibold text-sm">{p.name} · {p.id}</p>
                  {p.readings.length === 0
                    ? <p className="text-xs text-slate-400 mt-1">No readings recorded.</p>
                    : [...p.readings].sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => (
                      <p key={i} className="text-xs text-slate-500 mt-2">{r.date} · {r.value.toFixed(1)}°C · Recorded by {r.nurse}</p>
                    ))}
                </div>
              ))}
            </section>
          </>}

          {page === "Doctor Consultations" && <>
            <h1 className="text-2xl font-bold mb-2">Doctor Consultations</h1>
            <p className="text-slate-500 mb-6">Review patient records and document consultations.</p>

            {role === "Doctor" ? <section className={`${cardClass} max-w-2xl`}>
              <h3 className="font-bold mb-4">New Consultation</h3>

              <label className="text-sm block mb-2">Select Patient</label>
              <select className={`${inputClass} mb-4`} value={consultPatient} onChange={e => setConsultPatient(e.target.value)}>
                {activePatients.map(p => <option key={p.id} value={p.id}>{p.name} – {p.room}</option>)}
              </select>

              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                <p>Patient: {patientById(consultPatient)?.name || "Not selected"}</p>
                <p className="mt-1">Latest temperature: {patientById(consultPatient) ? latestReading(patientById(consultPatient)!)?.value + "°C" || "Not recorded" : "Not recorded"}</p>
              </div>

              <label className="text-sm block mb-2">Consultation Notes</label>
              <textarea className={`${inputClass} mb-4`} rows={3} placeholder="Enter doctor's observations..." value={consultNotes} onChange={e => setConsultNotes(e.target.value)} />

              <label className="text-sm block mb-2">Treatment Plan</label>
              <textarea className={`${inputClass} mb-4`} rows={3} placeholder="Enter treatment plan..." value={consultTreatment} onChange={e => setConsultTreatment(e.target.value)} />

              <button onClick={saveConsultation} className={`${primaryButton} w-full`}>Save Consultation</button>
            </section> : <p className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm">Switch to Doctor role to record consultations.</p>}

            <section className={`${cardClass} mt-5`}>
              <h3 className="font-bold mb-4">Consultation History</h3>
              {consultations.length === 0 ? <p className="text-sm text-slate-500">No consultations recorded yet.</p> :
                [...consultations].reverse().map(c => (
                  <div key={c.id} className="border-b py-4">
                    <p className="font-semibold">{patientById(c.patientId)?.name || c.patientId}</p>
                    <p className="text-xs text-slate-400 mt-1">{c.date} · Recorded by {c.doctor}</p>
                    <p className="text-sm mt-2">Notes: {c.notes}</p>
                    <p className="text-sm mt-1">Treatment: {c.treatment}</p>
                  </div>
                ))}
            </section>
          </>}

          {page === "Discharge Management" && <>
            <h1 className="text-2xl font-bold mb-2">Discharge Management</h1>
            <p className="text-slate-500 mb-6">Monitor eligibility, doctor approval and administrative discharge.</p>

            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mb-5">
              Demo rule: three complete consecutive calendar days must each have at least one recorded reading, with every reading below 38°C. The current day is not counted.
              This is a configurable prototype rule, not a clinical clearance.
            </div>

            <section className={cardClass}>
              <h3 className="font-bold mb-4">Patient Discharge Tracker</h3>

              {activePatients.length === 0 && <p className="text-sm text-slate-500">No active patients.</p>}

              {activePatients.map(p => {
                const days = feverFreeDays(p);
                const d = getDischarge(p.id);
                const eligible = days === 3;

                return (
                  <div key={p.id} className="border rounded-xl p-5 mb-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h4 className="font-bold">{p.name}</h4>
                        <p className="text-sm text-slate-500">{p.id} · Room {p.room}</p>
                      </div>
                      <span className={`text-xs px-3 py-2 rounded-full h-fit ${eligible ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {eligible ? "Eligible for doctor review" : "Monitoring required"}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 my-5">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500">Fever-free days</p>
                        <p className="text-2xl font-bold">{days}/3</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500">Doctor approval</p>
                        <p className="font-semibold">{d?.doctorApproved ? "Approved" : "Pending"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500">Admin discharge</p>
                        <p className="font-semibold">{d?.adminCompleted ? "Completed" : "Pending"}</p>
                      </div>
                    </div>

                    {role === "Doctor" && eligible && !d?.doctorApproved && (
                      <button onClick={() => approveDischarge(p)} className={primaryButton}>
                        Doctor Approves Discharge
                      </button>
                    )}

                    {role === "Doctor" && !eligible && (
                      <p className="text-sm text-amber-700">Three complete fever-free days have not yet been verified.</p>
                    )}

                    {role === "Admin" && d?.doctorApproved && !d.adminCompleted && (
                      <button onClick={() => completeDischarge(p)} className={primaryButton}>
                        Admin Complete Discharge
                      </button>
                    )}

                    {d?.doctorApproved && role !== "Admin" && (
                      <p className="text-sm text-green-700">Doctor approval recorded. Awaiting admin discharge.</p>
                    )}
                  </div>
                );
              })}
            </section>
          </>}

          {page === "Task Queue" && <>
            <h1 className="text-2xl font-bold mb-2">Daily Task Queue</h1>
            <p className="text-slate-500 mb-6">Current operational activities.</p>
            <section className={cardClass}>
              {[
                `${pendingTemps} patients pending today's temperature reading`,
                `${pendingConsultations} patients without today's consultation`,
                `${fever} patients with a latest fever reading`,
                `${discharges.filter(d => d.doctorApproved && !d.adminCompleted).length} approved discharges awaiting admin`,
              ].map((item, i) => <p key={i} className="border-b py-4 text-sm">{i + 1}. {item}</p>)}
            </section>
          </>}

          {page === "Alerts" && <>
            <h1 className="text-2xl font-bold mb-2">Operational Alerts</h1>
            <p className="text-slate-500 mb-6">Important activities requiring attention.</p>
            <section className={cardClass}>
              {pendingTemps > 0 && <p className="bg-amber-50 text-amber-800 p-3 rounded-lg mb-3">{pendingTemps} patients have no temperature reading today.</p>}
              {fever > 0 && <p className="bg-red-50 text-red-800 p-3 rounded-lg mb-3">{fever} patients have a latest fever reading. Medical review required.</p>}
              {pendingConsultations > 0 && <p className="bg-blue-50 text-blue-800 p-3 rounded-lg mb-3">{pendingConsultations} patients have no consultation recorded today.</p>}
              {pendingTemps === 0 && fever === 0 && pendingConsultations === 0 && <p className="text-green-700">No pending alerts.</p>}
            </section>
          </>}

          {page === "Shift Handover" && <>
            <h1 className="text-2xl font-bold mb-2">Shift Handover</h1>
            <p className="text-slate-500 mb-6">Operational summary for the incoming team.</p>
            <section className={cardClass}>
              <p className="py-3 border-b">Active patients: {activePatients.length}</p>
              <p className="py-3 border-b">Pending temperature readings: {pendingTemps}</p>
              <p className="py-3 border-b">Fever cases requiring review: {fever}</p>
              <p className="py-3 border-b">Pending consultations: {pendingConsultations}</p>
              <p className="py-3">Approved discharges awaiting admin: {discharges.filter(d => d.doctorApproved && !d.adminCompleted).length}</p>
            </section>
          </>}

          {page === "Analytics" && <>
            <h1 className="text-2xl font-bold mb-2">Facility Analytics</h1>
            <p className="text-slate-500 mb-6">Live summary based on current demonstration records.</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                ["Active Patients", activePatients.length],
                ["Room Occupancy", `${activePatients.length}/74`],
                ["Stable Patients", stable],
                ["Fever Cases", fever],
                ["Total Consultations", consultations.length],
                ["Discharged Patients", patients.filter(p => !p.active).length],
                ["Temperature Readings", patients.reduce((sum, p) => sum + p.readings.length, 0)],
                ["Doctor Approvals", discharges.filter(d => d.doctorApproved).length],
              ].map(([label, value]) => (
                <div className={cardClass} key={String(label)}>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-3xl font-bold mt-3">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">The original 85% benchmark is a target, not a measured treatment-success rate. No clinical outcome rate is calculated by this demo.</p>
          </>}

          {page === "CareFlow Insights" && <>
            <h1 className="text-2xl font-bold mb-2">CareFlow Insights</h1>
            <p className="text-slate-500 mb-6">Rule-based operational insights, not medical diagnosis.</p>
            <section className={cardClass}>
              <p className="py-3 border-b">Active patients: {activePatients.length}</p>
              <p className="py-3 border-b">Latest fever readings needing review: {fever}</p>
              <p className="py-3 border-b">Rooms available: {74 - activePatients.length}</p>
              <p className="py-3 border-b">Patients needing temperature readings: {pendingTemps}</p>
              <p className="py-3">Patients meeting the three-day demo criterion: {activePatients.filter(p => feverFreeDays(p) === 3).length}</p>
            </section>
          </>}

          {message && (
            <div className="mt-5 bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-sm flex justify-between gap-3">
              {message}
              <button onClick={() => setMessage("")} className="font-bold">×</button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-8 text-center">
            CareFlow · Demonstration prototype · Fictional patient data only
          </p>
        </div>
      </main>
    </div>
  );
}

function PatientTable({
  patients,
  latestReading,
}: {
  patients: Patient[];
  latestReading: (p: Patient) => Reading | undefined;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-slate-400 border-b">
          <tr>
            {["Patient", "ID", "Room", "Temperature", "Status"].map(x =>
              <th key={x} className="p-3">{x}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {patients.map(p => {
            const reading = latestReading(p);
            const status = !reading ? "Pending" : reading.value >= 38 ? "Fever" : "Stable";

            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-semibold whitespace-nowrap">{p.name}</td>
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.room}</td>
                <td className="p-3">{reading ? `${reading.value.toFixed(1)}°C` : "Not recorded"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-3 py-1 text-xs ${status === "Fever" ? "bg-red-100 text-red-700" :
                    status === "Stable" ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{status}</span>
                </td>
              </tr>
            );
          })}
          {patients.length === 0 && (
            <tr><td colSpan={5} className="p-5 text-center text-slate-400">No patients found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}