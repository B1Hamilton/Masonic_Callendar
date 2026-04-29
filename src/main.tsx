import { StrictMode, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, CalendarDays, Check, Download, MapPin, Plus, ScrollText, Settings2, Trash2, Upload } from "lucide-react";
import "./styles.css";

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Ordinal = 1 | 2 | 3 | 4 | 5;

type Lodge = {
  id: string;
  name: string;
  number: string;
  location: string;
  time: string;
  months: number[];
  weekdays: Weekday[];
  ordinals: Ordinal[];
  notes: string;
};

type PrincipalVisit = "j" | "h" | "z";

type Chapter = {
  id: string;
  name: string;
  number: string;
  location: string;
  time: string;
  months: number[];
  weekdays: Weekday[];
  ordinals: Ordinal[];
  principalVisits: Record<PrincipalVisit, boolean>;
  notes: string;
};

type SpecialMeeting = {
  id: string;
  title: string;
  date: string;
  lodge: string;
  location: string;
  time: string;
  notes: string;
};

type Meeting = {
  id: string;
  date: Date;
  title: string;
  lodge: string;
  location: string;
  time: string;
  notes: string;
  kind: "lodge" | "chapter" | "special";
};

type Store = {
  lodges: Lodge[];
  chapters: Chapter[];
  specialMeetings: SpecialMeeting[];
  visited: Record<string, boolean>;
};

const STORAGE_KEY = "masonic-calendar-store-v1";
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const defaultMeetingMonths = [8, 9, 10, 11, 0, 1, 2, 3];
const defaultPrincipalVisits: Record<PrincipalVisit, boolean> = { j: false, h: false, z: false };

const defaultStore: Store = {
  lodges: [
    {
      id: "callendar-588",
      name: "Lodge Callendar",
      number: "588",
      location: "",
      time: "19:00",
      months: defaultMeetingMonths,
      weekdays: [1],
      ordinals: [1, 3],
      notes: "Meets first and third Monday, September to April.",
    },
  ],
  chapters: [
    {
      id: "chapter-5",
      name: "Linlithgow",
      number: "5",
      location: "Linlithgow",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [3],
      ordinals: [3],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets third Wednesday, September to April.",
    },
    {
      id: "chapter-95",
      name: "Douglas",
      number: "95",
      location: "Bo'ness",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [4],
      ordinals: [4],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets fourth Thursday, September to April.",
    },
    {
      id: "chapter-104",
      name: "Mount Moriah",
      number: "104",
      location: "Bathgate",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [2],
      ordinals: [2],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets second Tuesday, September to April.",
    },
    {
      id: "chapter-237",
      name: "Strathbrock",
      number: "237",
      location: "69 Middleton Ave, Uphall",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [1],
      ordinals: [2],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets second Monday, September to April.",
    },
    {
      id: "chapter-286",
      name: "Fauldhouse",
      number: "286",
      location: "Fauldhouse",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [4],
      ordinals: [3],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets third Thursday, September to April.",
    },
    {
      id: "chapter-389",
      name: "Queensferry",
      number: "389",
      location: "Queensferry",
      time: "",
      months: defaultMeetingMonths,
      weekdays: [2],
      ordinals: [1],
      principalVisits: defaultPrincipalVisits,
      notes: "Meets first Tuesday, September to April.",
    },
  ],
  specialMeetings: [],
  visited: {},
};

function normalizeChapter(chapter: Chapter): Chapter {
  return {
    ...chapter,
    months: chapter.months?.length ? chapter.months : defaultMeetingMonths,
    weekdays: chapter.weekdays ?? [],
    ordinals: chapter.ordinals ?? [],
    principalVisits: { ...defaultPrincipalVisits, ...chapter.principalVisits },
  };
}

function normalizeStore(value: Partial<Store>): Store {
  const chapters = value.chapters?.length ? value.chapters : defaultStore.chapters;

  return {
    ...defaultStore,
    ...value,
    lodges: value.lodges ?? defaultStore.lodges,
    chapters: chapters.map(normalizeChapter),
    specialMeetings: value.specialMeetings ?? defaultStore.specialMeetings,
    visited: value.visited ?? defaultStore.visited,
  };
}

function loadStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore;

  try {
    const parsed = JSON.parse(raw);
    return normalizeStore(parsed);
  } catch {
    return defaultStore;
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Store;
  return (
    Array.isArray(candidate.lodges) &&
    (candidate.chapters === undefined || Array.isArray(candidate.chapters)) &&
    Array.isArray(candidate.specialMeetings) &&
    typeof candidate.visited === "object"
  );
}

function getSeasonStartYear(today = new Date()) {
  return today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
}

function sameDayId(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMeetingDate(year: number, month: number, weekday: Weekday, ordinal: Ordinal) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (ordinal - 1) * 7;
  const date = new Date(year, month, day);
  return date.getMonth() === month ? date : null;
}

function seasonMonths(startYear: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = (8 + index) % 12;
    const year = month >= 8 ? startYear : startYear + 1;
    return { month, year };
  });
}

function buildMeetings(store: Store, startYear: number) {
  const lodgeMeetings = (store.lodges ?? []).flatMap((lodge) =>
    seasonMonths(startYear)
      .filter(({ month }) => lodge.months.includes(month))
      .flatMap(({ month, year }) =>
        lodge.weekdays.flatMap((weekday) =>
          lodge.ordinals
            .map((ordinal) => getMeetingDate(year, month, weekday, ordinal))
            .filter((date): date is Date => Boolean(date))
            .map((date) => ({
              id: `${lodge.id}-${sameDayId(date)}`,
              date,
              title: `${lodge.name} ${lodge.number}`,
              lodge: `${lodge.name} ${lodge.number}`,
              location: lodge.location,
              time: lodge.time,
              notes: lodge.notes,
              kind: "lodge" as const,
            }))
        )
      )
  );

  const chapterMeetings = (store.chapters ?? []).flatMap((chapter) =>
    seasonMonths(startYear)
      .filter(({ month }) => chapter.months.includes(month))
      .flatMap(({ month, year }) =>
        chapter.weekdays.flatMap((weekday) =>
          chapter.ordinals
            .map((ordinal) => getMeetingDate(year, month, weekday, ordinal))
            .filter((date): date is Date => Boolean(date))
            .map((date) => ({
              id: `${chapter.id}-${sameDayId(date)}`,
              date,
              title: `${chapter.name} Chapter ${chapter.number}`,
              lodge: `${chapter.name} Chapter ${chapter.number}`,
              location: chapter.location,
              time: chapter.time,
              notes: chapter.notes,
              kind: "chapter" as const,
            }))
        )
      )
  );

  const special = store.specialMeetings.map((meeting) => ({
    id: meeting.id,
    date: new Date(`${meeting.date}T12:00:00`),
    title: meeting.title,
    lodge: meeting.lodge,
    location: meeting.location,
    time: meeting.time,
    notes: meeting.notes,
    kind: "special" as const,
  }));

  return [...lodgeMeetings, ...chapterMeetings, ...special].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function App() {
  const [store, setStore] = useStoredState();
  const [seasonStart, setSeasonStart] = useStateNumber(getSeasonStartYear());
  const [view, setView] = useStateText<"calendar" | "lodges" | "chapters" | "backup">("calendar");
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [showLodgeForm, setShowLodgeForm] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const meetings = buildMeetings(store, seasonStart);

  function patchStore(next: Store) {
    setStore(next);
    saveStore(next);
  }

  function toggleVisited(id: string) {
    patchStore({ ...store, visited: { ...store.visited, [id]: !store.visited[id] } });
  }

  function togglePrincipalVisit(chapterId: string, role: PrincipalVisit) {
    patchStore({
      ...store,
      chapters: store.chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, principalVisits: { ...chapter.principalVisits, [role]: !chapter.principalVisits[role] } }
          : chapter
      ),
    });
  }

  function exportData() {
    const backup = {
      app: "masonic-calendar",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: store,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `masonic-calendar-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Export ready.");
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = isStore(parsed) ? parsed : parsed.data;

        if (!isStore(imported)) {
          setBackupMessage("That file does not look like a calendar backup.");
          return;
        }

        patchStore(normalizeStore(imported));
        setBackupMessage("Backup imported.");
      } catch {
        setBackupMessage("That file could not be read.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function addSpecial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const meeting: SpecialMeeting = {
      id: crypto.randomUUID(),
      title: String(data.get("title") || "Special meeting"),
      date: String(data.get("date")),
      lodge: String(data.get("lodge") || ""),
      location: String(data.get("location") || ""),
      time: String(data.get("time") || ""),
      notes: String(data.get("notes") || ""),
    };
    patchStore({ ...store, specialMeetings: [...store.specialMeetings, meeting] });
    event.currentTarget.reset();
    setShowSpecialForm(false);
  }

  function addLodge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const months = String(data.get("months"))
      .split(",")
      .map((month) => month.trim().slice(0, 3).toLowerCase())
      .map((month) => monthNames.findIndex((name) => name.toLowerCase() === month))
      .filter((month) => month >= 0);

    const lodge: Lodge = {
      id: crypto.randomUUID(),
      name: String(data.get("name") || "Lodge"),
      number: String(data.get("number") || ""),
      location: String(data.get("location") || ""),
      time: String(data.get("time") || ""),
      months,
      weekdays: [Number(data.get("weekday")) as Weekday],
      ordinals: String(data.get("ordinals"))
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((ordinal): ordinal is Ordinal => [1, 2, 3, 4, 5].includes(ordinal)),
      notes: String(data.get("notes") || ""),
    };
    patchStore({ ...store, lodges: [...store.lodges, lodge] });
    event.currentTarget.reset();
    setShowLodgeForm(false);
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal lodge planner</p>
          <h1>Masonic Calendar</h1>
        </div>
        <div className="season-control">
          <button aria-label="Previous season" onClick={() => setSeasonStart(seasonStart - 1)}>
            -
          </button>
          <span>{`${seasonStart}/${String(seasonStart + 1).slice(2)}`}</span>
          <button aria-label="Next season" onClick={() => setSeasonStart(seasonStart + 1)}>
            +
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Views">
        <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
          <CalendarDays size={18} /> Calendar
        </button>
        <button className={view === "lodges" ? "active" : ""} onClick={() => setView("lodges")}>
          <Settings2 size={18} /> Lodges
        </button>
        <button className={view === "chapters" ? "active" : ""} onClick={() => setView("chapters")}>
          <BookOpen size={18} /> Chapters
        </button>
        <button className={view === "backup" ? "active" : ""} onClick={() => setView("backup")}>
          <Download size={18} /> Backup
        </button>
      </nav>

      {view === "calendar" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>Meetings</h2>
            <button className="primary" onClick={() => setShowSpecialForm(!showSpecialForm)}>
              <Plus size={18} /> Special
            </button>
          </div>

          {showSpecialForm && (
            <form className="form-grid" onSubmit={addSpecial}>
              <input name="title" placeholder="Special meeting title" required />
              <input name="date" type="date" required />
              <input name="lodge" placeholder="Lodge" />
              <input name="time" type="time" />
              <input name="location" placeholder="Location" />
              <textarea name="notes" placeholder="Notes" />
              <button className="primary" type="submit">
                <Plus size={18} /> Add meeting
              </button>
            </form>
          )}

          <div className="meeting-list">
            {meetings.map((meeting) => (
              <article className={store.visited[meeting.id] ? "meeting visited" : "meeting"} key={meeting.id}>
                <button
                  aria-label={store.visited[meeting.id] ? "Mark not visited" : "Mark visited"}
                  className="tick"
                  onClick={() => toggleVisited(meeting.id)}
                >
                  {store.visited[meeting.id] && <Check size={20} />}
                </button>
                <div className="date-block">
                  <span>{weekdayNames[meeting.date.getDay()].slice(0, 3)}</span>
                  <strong>{meeting.date.getDate()}</strong>
                  <span>{monthNames[meeting.date.getMonth()]}</span>
                </div>
                <div className="meeting-body">
                  <div className="meeting-heading">
                    <h3>{meeting.title}</h3>
                    <span>{meeting.kind}</span>
                  </div>
                  <p>
                    {meeting.time || "Time TBC"}
                    {meeting.location && (
                      <>
                        {" "}
                        <MapPin size={14} /> {meeting.location}
                      </>
                    )}
                  </p>
                  {meeting.notes && (
                    <p className="notes">
                      <ScrollText size={14} /> {meeting.notes}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : view === "lodges" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>Lodges</h2>
            <button className="primary" onClick={() => setShowLodgeForm(!showLodgeForm)}>
              <Plus size={18} /> Lodge
            </button>
          </div>

          {showLodgeForm && (
            <form className="form-grid" onSubmit={addLodge}>
              <input name="name" placeholder="Lodge name" required />
              <input name="number" placeholder="Number" />
              <input name="location" placeholder="Location" />
              <input name="time" type="time" />
              <select name="weekday" defaultValue="1">
                {weekdayNames.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              <input name="ordinals" placeholder="Ordinals, e.g. 1,3" required />
              <input name="months" placeholder="Months, e.g. Sep,Oct,Nov,Dec,Jan,Feb,Mar,Apr" required />
              <textarea name="notes" placeholder="Notes" />
              <button className="primary" type="submit">
                <Plus size={18} /> Add lodge
              </button>
            </form>
          )}

          <div className="lodge-grid">
            {store.lodges.map((lodge) => (
              <article className="lodge-card" key={lodge.id}>
                <div>
                  <h3>
                    {lodge.name} {lodge.number}
                  </h3>
                  <p>{lodge.notes}</p>
                </div>
                <p>
                  {lodge.ordinals.join(" & ")} {lodge.weekdays.map((day) => weekdayNames[day]).join(", ")}
                </p>
                <p>{lodge.months.map((month) => monthNames[month]).join(", ")}</p>
                <button
                  aria-label={`Delete ${lodge.name}`}
                  className="ghost"
                  onClick={() => patchStore({ ...store, lodges: store.lodges.filter((item) => item.id !== lodge.id) })}
                >
                  <Trash2 size={18} /> Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : view === "chapters" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>Chapters</h2>
          </div>

          <div className="lodge-grid">
            {store.chapters.map((chapter) => (
              <article className="lodge-card" key={chapter.id}>
                <div>
                  <h3>
                    {chapter.name} Chapter {chapter.number}
                  </h3>
                  <p>{chapter.notes}</p>
                </div>
                <p>
                  {chapter.ordinals.join(" & ")} {chapter.weekdays.map((day) => weekdayNames[day]).join(", ")}
                </p>
                <p>
                  <MapPin size={14} /> {chapter.location}
                </p>
                <div className="role-ticks" aria-label={`${chapter.name} principal visits`}>
                  {(["j", "h", "z"] as PrincipalVisit[]).map((role) => (
                    <button
                      className={chapter.principalVisits[role] ? "role-tick active" : "role-tick"}
                      key={role}
                      onClick={() => togglePrincipalVisit(chapter.id, role)}
                    >
                      {role.toUpperCase()}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-title">
            <h2>Backup</h2>
          </div>

          <div className="backup-grid">
            <article className="backup-card">
              <div>
                <h3>Export JSON</h3>
                <p>Save a copy of your lodges, special meetings, and visit ticks.</p>
              </div>
              <button className="primary" onClick={exportData}>
                <Download size={18} /> Export
              </button>
            </article>

            <article className="backup-card">
              <div>
                <h3>Import JSON</h3>
                <p>Restore a backup from this app. Importing replaces the data on this device.</p>
              </div>
              <label className="file-button">
                <Upload size={18} /> Import
                <input accept="application/json,.json" type="file" onChange={importData} />
              </label>
            </article>
          </div>

          {backupMessage && <p className="backup-message">{backupMessage}</p>}
        </section>
      )}

    </main>
  );
}

function useStoredState() {
  return useState<Store>(() => loadStore());
}

function useStateNumber(initial: number) {
  return useState(initial);
}

function useStateText<T>(initial: T) {
  return useState(initial);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
