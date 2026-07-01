let DATA = { notes: [], passes: [] };
let activeFilter = "all";
const $ = s => document.querySelector(s);

// ---------- LOAD EVERYTHING FROM SERVER ----------
async function loadAll(){
    const res = await fetch("/api/all");
    const raw = await res.json();
    DATA.notes  = raw.notes  || [];
    DATA.passes = raw.passwords || [];
    updateBadges();
    render();
}

function updateBadges(){
    $("#countAll").textContent  = DATA.notes.length + DATA.passes.length;
    $("#countNote").textContent = DATA.notes.length;
    $("#countPass").textContent = DATA.passes.length;
}

function getAllMerged(){
    const all = [
        ...DATA.notes.map(n => ({...n})),
        ...DATA.passes.map(p => ({...p}))
    ];
    return all.sort((a,b) => (b.date||"").localeCompare(a.date||""));
}

// ---------- RENDER + CATEGORY + ⚡ UNIVERSAL SEARCH ----------
// ---------- RENDER + CATEGORY + ⚡ UNIVERSAL SEARCH ----------
function render(){
    const q = ($("#globalSearch").value || "").toLowerCase().trim();
    const box = $("#itemsList");
    const emp = $("#emptyState");
    const set = $("#settingsPanel");

    // ALWAYS RESET
    box.innerHTML = "";
    emp.classList.add("hidden");
    set.classList.add("hidden");

    // ⚙️ SETTINGS VIEW
    if (activeFilter === "settings") {
        $("#sectionTitle").textContent = "⚙️ Privacy & Account";
        $("#resultCount").textContent = "";
        set.classList.remove("hidden");
        return;
    }

    // FUTURE MODULES
    if (activeFilter === "id" || activeFilter === "file") {
        showComingSoon(activeFilter);
        return;
    }

    // NORMAL DATA VIEW
    let list = getAllMerged();
    if (activeFilter === "note") list = list.filter(i => i.type === "note");
    if (activeFilter === "pass") list = list.filter(i => i.type === "pass");
    if (q) list = list.filter(i => Object.values(i).some(v => String(v||"").toLowerCase().includes(q)));

    const titles = {all:"📝 All Items", note:"📄 Notes", pass:"🔑 Passwords"};
    $("#sectionTitle").textContent = titles[activeFilter];
    $("#resultCount").textContent = `${list.length} item${list.length===1?"":"s"}`;

    if (list.length === 0) {
        emp.classList.remove("hidden");
        emp.innerHTML = `<div class="big-icon">🔍</div><h4>Nothing here</h4><p>Add new item or change filter.</p>`;
        return;
    }

    list.forEach(item => box.appendChild(item.type==="note" ? makeNoteCard(item) : makePassCard(item)));
}

function showComingSoon(k){
    const names = {id:"🪪 IDs", file:"🧾 Files"};
    $("#itemsList").innerHTML = "";
    $("#emptyState").classList.remove("hidden");
    $("#emptyState").innerHTML = `<div class="big-icon">⏳</div><h4>${names[k]} — Coming Next</h4>`;
}

// ---------- CARD BUILDERS ----------
function makeNoteCard(n){
    const el = document.createElement("div");
    el.className = "item card";
    el.innerHTML = `
        <div class="item-head">
            <b>${esc(n.title || "(no title)")}</b>
            ${actions(n)}
        </div>
        <div class="item-body">${esc(n.body).slice(0,260)}${n.body.length>260?"…":""}</div>
        <div class="item-meta">📄 NOTE · ${n.date}</div>`;
    attachItemEvents(el, n);
    return el;
}

function makePassCard(p){
    const el = document.createElement("div");
    el.className = "item card pass";
    el.innerHTML = `
        <div class="item-head">
            <div>
                <b>${esc(p.name)}</b>
                <div class="subtle">${esc(p.username || "—")}</div>
            </div>
            ${actions(p)}
        </div>
        <div class="pass-row">
            <code class="pass-dot">••••••••••</code>
            <button class="copy" data-val="${attr(p.password)}">📋 Copy</button>
        </div>
        ${p.website ? `<div class="subtle">🌐 ${esc(p.website)}</div>` : ""}
        <div class="item-meta">🔑 PASSWORD · ${p.date}</div>`;
    el.querySelectorAll(".copy").forEach(b =>
        b.onclick = async () => {
            await navigator.clipboard.writeText(b.dataset.val);
            const t = b.textContent;
            b.textContent = "✅ COPIED";
            setTimeout(()=>b.textContent = t, 1200);
        }
    );
    attachItemEvents(el, p);
    return el;
}

function actions(i){
    return `<div class="item-actions">
        <button data-edit="${i.id}" data-type="${i.type}">✏️</button>
        <button data-del="${i.id}"  data-type="${i.type}" class="danger">🗑️</button>
    </div>`;
}

function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function attr(s){ return String(s).replaceAll('"',"&quot;"); }

function attachItemEvents(el, it){
    el.querySelector("[data-edit]").onclick = () => openEditor(it);
    el.querySelector("[data-del]").onclick  = () => deleteItem(it);
}

// ---------- GLOBAL EVENTS ----------
$("#addBtn").onclick = () => {
    const t = (activeFilter === "pass" || activeFilter === "note") ? activeFilter : "note";
    openEditor({type: t});
};
$("#cancelBtn").onclick = closeEditor;
$("#globalSearch").oninput = render;

// SIDEBAR
document.querySelectorAll(".menu li").forEach(li => {
    li.onclick = () => {
        document.querySelectorAll(".menu li").forEach(x => x.classList.remove("active"));
        li.classList.add("active");
        activeFilter = li.dataset.filter;
        closeEditor();
        render();
    };
});

// TABS
document.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => {
        document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
        const f = t.dataset.form;
        $("#eType").value = f;
        $("#formNote").classList.toggle("hidden", f !== "note");
        $("#formPass").classList.toggle("hidden", f !== "pass");
    };
});

// PASSWORD TOOLS
$("#togglePass").onclick = () => {
    const i = $("#pPass");
    const hide = i.type === "password";
    i.type = hide ? "text" : "password";
    $("#togglePass").textContent = hide ? "🙈" : "👁️";
};
$("#genPass").onclick = () => {
    const LEN = 20;
    const SET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    const rnd = new Uint32Array(LEN);
    crypto.getRandomValues(rnd);
    let out = "";
    for (let x of rnd) out += SET[x % SET.length];
    $("#pPass").value = out;
    $("#pPass").type = "text";
    $("#togglePass").textContent = "🙈";
};

// SAVE
$("#saveBtn").onclick = async () => {
    const type = $("#eType").value;
    let url = "", payload = { id: $("#eId").value || null };

    if (type === "note") {
        url = "/api/notes/save";
        payload.title = $("#nTitle").value.trim();
        payload.body  = $("#nBody").value;
        if (!payload.title) { alert("⚠️ Title required"); return; }
    } else {
        url = "/api/passwords/save";
        payload.name     = $("#pName").value.trim();
        payload.username = $("#pUser").value;
        payload.password = $("#pPass").value;
        payload.website  = $("#pSite").value;
        payload.notes    = $("#pNote").value;
        if (!payload.name || !payload.password) { alert("⚠️ Name + Password required"); return; }
    }

    try {
        const r = await fetch(url, {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Server error");
        closeEditor();
        await loadAll(); // ✅ RELOADS + UPDATES BADGES
        alert("✅ SAVED — encrypted to database");
    } catch (err) {
        alert("❌ FAILED: " + err.message);
    }
};

async function deleteItem(it){
    if (!confirm("Permanently delete?")) return;
    const url = it.type === "note"
        ? `/api/notes/delete/${it.id}`
        : `/api/passwords/delete/${it.id}`;
    await fetch(url, {method:"POST"});
    loadAll();
}

// ---------- EDITOR ----------
function openEditor(it = {}){
    const type = it.type || "note";
    $("#eId").value   = it.id || "";
    $("#eType").value = type;

    // CLEAR
    $("#nTitle").value = $("#nBody").value = "";
    $("#pName").value = $("#pUser").value = $("#pPass").value = $("#pSite").value = $("#pNote").value = "";
    $("#pPass").type = "password"; $("#togglePass").textContent = "👁️";

    // SWITCH TAB
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.form === type));
    $("#formNote").classList.toggle("hidden", type !== "note");
    $("#formPass").classList.toggle("hidden", type !== "pass");

    // FILL IF EDIT
    if (type === "note" && it.title !== undefined) {
        $("#nTitle").value = it.title; $("#nBody").value = it.body;
    }
    if (type === "pass" && it.name !== undefined) {
        $("#pName").value=it.name; $("#pUser").value=it.username;
        $("#pPass").value=it.password; $("#pSite").value=it.website; $("#pNote").value=it.notes;
    }

    $("#editor").classList.remove("hidden");
    (type === "note" ? $("#nTitle") : $("#pName")).focus();
}
function closeEditor(){
    $("#editor").classList.add("hidden");
    $("#eId").value = "";
}

// ==========================================
// ✅ PRIVACY TOOLS — 100% WORKING VERSION
// ==========================================
$("#exportBtn").onclick = async () => {
    if (!confirm("Download ALL your data as a backup file?")) return;
    try {
        const r = await fetch("/api/export");
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const cd = r.headers.get("Content-Disposition") || "";
        a.download = cd.match(/filename="?([^"]+)"?/)?.[1] || "onelife-export.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
        alert("✅ EXPORTED ✅\nFile saved to Downloads.");
    } catch (err) { alert("❌ Export failed: " + err.message); }
};

$("#delAccBtn").onclick = async () => {
    // STEP 1 — WARNING
    if (!confirm(
        "⚠️ FINAL WARNING — NO UNDO ⚠️\n\n" +
        "This will PERMANENTLY DELETE:\n" +
        "• Your account\n" +
        "• ALL your notes\n" +
        "• ALL your passwords\n\n" +
        "Everything is wiped from our database forever.\n" +
        "We CANNOT restore anything.\n\n" +
        "Click OK only if you are 100% sure."
    )) return;

    // STEP 2 — CONFIRMATION PHRASE
    const phrase = "DELETE ONELIFE";
    const typed = prompt(
        "✅ ALMOST DONE — TYPE THIS EXACTLY TO CONFIRM:\n\n" +
        "👉   DELETE ONELIFE   👈\n"
    );
    if (typed === null) return;
    if (typed.trim() !== phrase) {
        alert("❌ Did not match — NOTHING was deleted.");
        return;
    }

    // STEP 3 — EXECUTE DELETE
    try {
        const r = await fetch("/api/delete-account", {
            method: "POST",
            headers: {"Content-Type": "application/json"}
        });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Server error");

        // ✅ CLEAR ALL LOCAL DATA FIRST
        DATA = { notes: [], passes: [] };
        localStorage.clear();
        sessionStorage.clear();

        alert(
            "✅ ACCOUNT FULLY DELETED ✅\n\n" +
            `Removed: ${d.deleted.notes} notes + ${d.deleted.passwords} passwords\n\n` +
            "Everything is gone forever. Taking you home..."
        );

        // ✅ FORCE FULL PAGE RELOAD TO HOME — NO CACHE REMAINS
        window.location.replace("/");

    } catch (err) {
        alert("❌ DELETE FAILED:\n" + err.message);
    }
};

document.addEventListener("DOMContentLoaded", loadAll);