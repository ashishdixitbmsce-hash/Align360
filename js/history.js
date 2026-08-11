/* ---------------- PROCESS UPDATES ---------------- */
function processUpdatesSectionHtml(){
  const updates = (state.processUpdates||[]).filter(u=>!u.archived).slice().sort((a,b)=>{
    if(!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.postedAt||"").localeCompare(a.postedAt||"");
  });
  const itemsHtml = updates.length ? updates.map(u=>{
    const isNew = u.postedAt && (Date.now() - new Date(u.postedAt).getTime()) < 7*24*60*60*1000;
    return `<div class="update-card${u.pinned?' pinned':''}" data-id="${esc(u.id)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
            ${u.pinned ? `<span class="badge badge-yellow">📌 Pinned</span>` : ""}
            ${isNew ? `<span class="badge badge-green">New</span>` : ""}
            <b style="font-size:13px;">${esc(u.title)}</b>
          </div>
          <div style="font-size:12.5px;color:var(--text-muted);white-space:pre-wrap;line-height:1.5;">${esc(u.message)}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">By ${esc(u.postedBy||"Team Leader")} · ${u.postedAt ? new Date(u.postedAt).toLocaleString() : ""}</div>
        </div>
        ${isManager() ? `<button class="icon-btn del-update-btn" data-id="${esc(u.id)}" title="Archive update">✕</button>` : ""}
      </div>
    </div>`;
  }).join("") : `<div class="empty-state" style="padding:20px;"><p>No process updates posted yet.${isManager() ? ' Post one and it shows up here for everyone, TLs and agents alike.' : ''}</p></div>`;

  return `
    <div class="section">
      <div class="section-head">
        <div class="section-title"><span class="eyebrow">📢</span>Process Updates</div>
        <div class="section-actions" style="display:flex;gap:8px;">
          <button class="btn btn-sm" id="viewUpdateHistoryBtn">🕐 History</button>
          ${isManager() ? `<button class="btn btn-accent btn-sm" id="postUpdateBtn">+ Post update</button>` : ""}
        </div>
      </div>
      <div class="section-body" style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
        ${itemsHtml}
      </div>
    </div>`;
}
// Strips each update down to just what the History tab needs, and JSON-encodes it
// safely for embedding inside a <script> element (escaping "<" so a literal
// closing script tag or opening one inside someone's update text can't break the page).
function sanitizeUpdatesForHistoryTab(){
  const all = (state.processUpdates||[]).slice().sort((a,b)=>(b.postedAt||"").localeCompare(a.postedAt||""));
  const trimmed = all.map(u=>({
    id:u.id, title:u.title||"", message:u.message||"", postedBy:u.postedBy||"Team Leader",
    postedAt:u.postedAt||"", pinned:!!u.pinned, archived:!!u.archived,
    archivedAt:u.archivedAt||"", archivedBy:u.archivedBy||""
  }));
  return JSON.stringify(trimmed).replace(/</g, "\\u003c");
}
// If the History tab is currently open, pushes the latest data into it (it re-renders
// whichever view — list or a still-open detail — it currently has showing), so
// restore/delete/new-post actions stay in sync live without needing to reopen the tab.
let __historyTabWindow = null;
function refreshHistoryTabIfOpen(){
  if(__historyTabWindow && !__historyTabWindow.closed && __historyTabWindow.__setUpdates){
    try{ __historyTabWindow.__setUpdates(JSON.parse(sanitizeUpdatesForHistoryTab().replace(/\\u003c/g,"<"))); }catch(e){}
  }
}
function restoreProcessUpdateFromTab(id){
  const u = (state.processUpdates||[]).find(x=>x.id===id);
  if(u){ u.archived = false; delete u.archivedAt; delete u.archivedBy; saveState(); render(); refreshHistoryTabIfOpen(); showToast("✅ Restored to active updates"); }
}
async function deleteProcessUpdateForeverFromTab(id){
  state.processUpdates = (state.processUpdates||[]).filter(u=>u.id!==id);
  await saveState(); render(); refreshHistoryTabIfOpen();
}
// Opens Process Update History as its own full-screen browser tab (not a modal), with
// a search box to filter by title, details, or who posted it, and a click-through detail
// view for reading one update at full size. It's a self-contained HTML document — it
// copies the app's stylesheet and current theme so it looks the same — and talks back
// to this window only for the manager restore/delete actions.
function openUpdateHistoryModal(){
  const styleTag = document.querySelector("style");
  const styleBlock = styleTag ? styleTag.outerHTML : "";
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  const teamName = esc(state.settings.teamName || "Align360");
  const updatesJson = sanitizeUpdatesForHistoryTab();
  const canManage = isManager() ? "true" : "false";
  const html = `<!DOCTYPE html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Process Update History — ${teamName}</title>
${styleBlock}
<style>
  /* The copied stylesheet's body{display:flex} is meant for the app's sidebar+main
     shell — this tab has no sidebar, so it's reset back to normal block layout here.
     Without this override the page renders squeezed into a sliver and the list looks
     like it isn't there at all. */
  html,body{height:auto;min-height:100vh;width:100%;}
  body{display:block !important;margin:0;background:var(--bg);}
  .history-wrap{max-width:840px;margin:0 auto;padding:32px 20px 64px;width:100%;box-sizing:border-box;}
  .history-search{width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:11px 14px;font-size:13px;margin:18px 0 22px;box-sizing:border-box;font-family:inherit;}
  .history-search:focus{outline:none;border-color:var(--accent, #4f8cff);}
  .history-list{display:flex;flex-direction:column;gap:10px;}
  .history-empty{padding:48px 20px;text-align:center;color:var(--text-muted);display:none;}
  .update-card{cursor:pointer;transition:border-color .15s, transform .1s;}
  .update-card:hover{border-color:var(--accent, #4f8cff);}
  .update-card .update-manage-btn{cursor:pointer;}
  #detailView{display:none;}
  #detailBack{background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:0;margin-bottom:18px;display:flex;align-items:center;gap:6px;}
  #detailBack:hover{color:var(--text);}
  #detailTitle{font-family:'Space Grotesk',sans-serif;font-size:22px;margin:0 0 10px;line-height:1.3;}
  #detailMessage{font-size:14.5px;line-height:1.7;white-space:pre-wrap;margin-top:18px;}
  #detailMeta{font-size:12px;color:var(--text-dim);margin-top:6px;}
  #detailActions{display:flex;gap:8px;margin-top:24px;}
</style>
</head>
<body>
  <div class="history-wrap">
    <div id="listView">
      <h1 style="font-family:'Space Grotesk',sans-serif;font-size:21px;margin:0;">📢 Process Update History</h1>
      <p style="font-size:12.5px;color:var(--text-muted);margin:6px 0 0;">Every update ever posted, newest first, with exactly when it went out. Click one to read it in full. Removing an update from the live Dashboard only archives it here — it isn't lost.</p>
      <input type="text" id="historySearch" class="history-search" placeholder="Search by title, details, or who posted it..." autofocus>
      <div class="history-list" id="historyList"></div>
      <div class="history-empty" id="historyNoMatch">No updates match your search.</div>
    </div>
    <div id="detailView">
      <button id="detailBack">← Back to all updates</button>
      <div id="detailBadges" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;"></div>
      <h2 id="detailTitle"></h2>
      <div id="detailMeta"></div>
      <div id="detailMessage"></div>
      <div id="detailActions"></div>
    </div>
  </div>
  <script id="updatesData" type="application/json">${updatesJson}<\/script>
  <script>
    (function(){
      var canManage = ${canManage};
      var updates = JSON.parse(document.getElementById("updatesData").textContent);
      var listView = document.getElementById("listView");
      var detailView = document.getElementById("detailView");
      var listEl = document.getElementById("historyList");
      var noMatch = document.getElementById("historyNoMatch");
      var searchInput = document.getElementById("historySearch");

      function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]; }); }
      function fmtWhen(iso){
        if(!iso) return {date:"—", time:""};
        var d = new Date(iso);
        return {
          date: d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}),
          time: d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})
        };
      }

      function cardHtml(u){
        var when = fmtWhen(u.postedAt);
        return '<div class="update-card' + (u.pinned && !u.archived ? ' pinned' : '') + '" style="' + (u.archived?'opacity:.65;':'') + '" data-id="' + esc(u.id) + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">' +
                '<span class="badge badge-gray" style="font-family:monospace;">' + esc(when.date) + ' · ' + esc(when.time) + '</span>' +
                (u.archived ? '<span class="badge badge-gray">Archived</span>' : '<span class="badge badge-green">Active</span>') +
                (u.pinned && !u.archived ? '<span class="badge badge-yellow">📌 Pinned</span>' : '') +
              '</div>' +
              '<b style="font-size:13px;">' + esc(u.title) + '</b>' +
              '<div style="font-size:12.5px;color:var(--text-muted);white-space:pre-wrap;line-height:1.5;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + esc(u.message) + '</div>' +
              '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">By ' + esc(u.postedBy) + (u.archived && u.archivedAt ? ' · Archived ' + esc(fmtWhen(u.archivedAt).date) + (u.archivedBy ? ' by ' + esc(u.archivedBy) : '') : '') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      var openDetailId = null;

      function renderList(){
        var q = searchInput.value.trim().toLowerCase();
        var filtered = !q ? updates : updates.filter(function(u){
          return ((u.title||"") + " " + (u.message||"") + " " + (u.postedBy||"")).toLowerCase().indexOf(q) !== -1;
        });
        if(!updates.length){
          listEl.innerHTML = '<div class="empty-state" style="padding:24px;"><p>No process updates have been posted yet.</p></div>';
          noMatch.style.display = "none";
        } else if(!filtered.length){
          listEl.innerHTML = "";
          noMatch.style.display = "block";
        } else {
          noMatch.style.display = "none";
          listEl.innerHTML = filtered.map(cardHtml).join("");
        }
        listEl.querySelectorAll(".update-card[data-id]").forEach(function(card){
          card.addEventListener("click", function(){ showDetail(card.dataset.id); });
        });
      }

      function showDetail(id){
        var u = updates.find(function(x){ return x.id===id; });
        if(!u) return;
        openDetailId = id;
        var when = fmtWhen(u.postedAt);
        document.getElementById("detailBadges").innerHTML =
          '<span class="badge badge-gray" style="font-family:monospace;">' + esc(when.date) + ' · ' + esc(when.time) + '</span>' +
          (u.archived ? '<span class="badge badge-gray">Archived</span>' : '<span class="badge badge-green">Active</span>') +
          (u.pinned && !u.archived ? '<span class="badge badge-yellow">📌 Pinned</span>' : '');
        document.getElementById("detailTitle").textContent = u.title;
        document.getElementById("detailMeta").textContent = "By " + u.postedBy + (u.archived && u.archivedAt ? " · Archived " + fmtWhen(u.archivedAt).date + (u.archivedBy ? " by " + u.archivedBy : "") : "");
        document.getElementById("detailMessage").textContent = u.message;
        var actions = document.getElementById("detailActions");
        actions.innerHTML = "";
        if(canManage){
          if(u.archived){
            var restoreBtn = document.createElement("button");
            restoreBtn.className = "btn btn-sm";
            restoreBtn.textContent = "↺ Restore to active";
            restoreBtn.addEventListener("click", function(){
              if(window.opener && window.opener.restoreProcessUpdateFromTab) window.opener.restoreProcessUpdateFromTab(u.id);
            });
            actions.appendChild(restoreBtn);
          }
          var delBtn = document.createElement("button");
          delBtn.className = "btn btn-sm";
          delBtn.textContent = "✕ Delete permanently";
          delBtn.addEventListener("click", function(){
            if(confirm("Permanently delete this update? Unlike archiving, this removes it from history for good and can't be undone.")){
              delBtn.disabled = true;
              delBtn.textContent = "Deleting…";
              if(window.opener && window.opener.deleteProcessUpdateForeverFromTab) window.opener.deleteProcessUpdateForeverFromTab(u.id);
              showList();
            }
          });
          actions.appendChild(delBtn);
        }
        listView.style.display = "none";
        detailView.style.display = "block";
        window.scrollTo(0,0);
      }

      function showList(){
        openDetailId = null;
        detailView.style.display = "none";
        listView.style.display = "block";
        renderList();
      }

      document.getElementById("detailBack").addEventListener("click", showList);
      searchInput.addEventListener("input", renderList);

      // Lets the opener push fresh data in after a restore/delete/new post, so this tab
      // stays current without needing to be closed and reopened.
      window.__setUpdates = function(newUpdates){
        updates = newUpdates;
        if(openDetailId){
          var stillExists = updates.some(function(u){ return u.id === openDetailId; });
          if(stillExists) showDetail(openDetailId); else showList();
        } else {
          renderList();
        }
      };

      renderList();
    })();
  <\/script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if(!w){ showToast("Your browser blocked the pop-up — allow pop-ups for this site to open History in a new tab"); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  __historyTabWindow = w;
}
function openPostUpdateModal(){
  const overlay = showModal(`
    <div class="modal-title">Post a process update</div>
    <div class="field"><label>Title</label><input type="text" id="upTitle" placeholder="e.g. New QA scoring rubric effective Monday"></div>
    <div class="field"><label>Details</label><textarea id="upMessage" rows="4" style="width:100%;background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:8px 9px;font-size:12.5px;" placeholder="What's changing and what agents need to do..."></textarea></div>
    <div class="field"><label>Posted by (optional)</label><input type="text" id="upPostedBy" value="${esc((currentUser&&currentUser.name)||'')}" placeholder="Your name"></div>
    <label class="check-row"><input type="checkbox" id="upPinned"> Pin to top</label>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="upCancel">Cancel</button>
      <button class="btn btn-accent" id="upSave">Post update</button>
    </div>
  `);
  overlay.querySelector("#upCancel").addEventListener("click", closeModal);
  overlay.querySelector("#upSave").addEventListener("click", ()=>{
    const title = document.getElementById("upTitle").value.trim();
    const message = document.getElementById("upMessage").value.trim();
    const postedBy = document.getElementById("upPostedBy").value.trim();
    const pinned = document.getElementById("upPinned").checked;
    if(!title || !message){ showToast("Enter a title and details"); return; }
    if(!state.processUpdates) state.processUpdates = [];
    state.processUpdates.push({
      id: "upd"+Date.now(),
      title, message,
      postedBy: postedBy || "Team Leader",
      postedAt: new Date().toISOString(),
      pinned
    });
    saveState(); closeModal(); render(); refreshHistoryTabIfOpen();
    showToast("✅ Update posted — visible to everyone now");
  });
}
function wireProcessUpdateListeners(content){
  const postBtn = document.getElementById("postUpdateBtn");
  if(postBtn) postBtn.addEventListener("click", openPostUpdateModal);
  const historyBtn = document.getElementById("viewUpdateHistoryBtn");
  if(historyBtn) historyBtn.addEventListener("click", openUpdateHistoryModal);
  content.querySelectorAll(".del-update-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.id;
      showConfirm("Archive this update? It disappears from the live Dashboard, but stays saved in Process Update History with its date and time — nothing is lost.", ()=>{
        const u = state.processUpdates.find(x=>x.id===id);
        if(u){
          u.archived = true;
          u.archivedAt = new Date().toISOString();
          u.archivedBy = (currentUser && currentUser.name) || "";
        }
        saveState(); render(); refreshHistoryTabIfOpen();
      }, "Archive");
    });
  });
}

/* ---------------- DASHBOARD ---------------- */

/* ---------------- HISTORY ---------------- */
function renderHistory(content, topActions){
  if(isAgent()){
    topActions.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">Your archived performance</span>`;
  } else {
    topActions.innerHTML = `<button class="btn btn-accent" id="archiveBtn">📦 Archive ${esc(viewPeriod.month)} ${viewPeriod.year}</button>`;
    document.getElementById("archiveBtn").addEventListener("click", ()=>{
      const mIdx = currentMonthIdx(), y = viewYear();
      const metrics = coreMetrics();
      const agg = sortByRoster(agentAggregate(monthDailyRows(mIdx,y,"all")));
      if(!agg.length){ showToast("No data to archive for this month yet"); return; }
      const rows = agg.map(a=>{
        const row = {agent:a.name};
        metrics.forEach(m=> row[m.field] = a.values[m.field]!=null ? Number(a.values[m.field].toFixed(m.field==="calls"?0:1)) : null);
        row.leaveDays = a.leaveDays; row.status = a.status;
        return row;
      });
      state.history.push({id:"h"+Date.now(), month: viewPeriod.month, year: viewPeriod.year,
        savedAt: new Date().toLocaleString(), metricsSnapshot: metrics.map(m=>({name:m.name,field:m.field,unit:m.unit})), rows});
      saveState(); render();
      showToast(`✅ Archived ${viewPeriod.month} ${viewPeriod.year}`);
    });
  }

  const blocks = state.history.slice().reverse().map(h=>{
    const snap = h.metricsSnapshot && h.metricsSnapshot.length ? h.metricsSnapshot : coreMetrics().map(m=>({name:m.name,field:m.field,unit:m.unit}));
    let rows = h.rows;
    if(isAgent()) rows = rows.filter(r=>r.agent === currentUser.name);
    if(!rows.length) return '';
    return `<div class="section">
      <div class="section-head">
        <div class="section-title"><span class="eyebrow">▥</span>${h.month} ${h.year}</div>
        <div class="help-note">Saved ${h.savedAt}</div>
      </div>
      <div class="section-body table-wrap">
        <table><thead><tr><th>Agent</th>${snap.map(m=>`<th class="num">${esc(m.name)}</th>`).join("")}<th class="num">Leave</th><th>Status</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${esc(r.agent)}</td>${snap.map(m=>`<td class="num">${r[m.field]!=null?r[m.field]:"—"}</td>`).join("")}
          <td class="num">${r.leaveDays??0}</td>
          <td>${r.status?`<span class="badge badge-${r.status}">${r.status}</span>`:`<span class="badge badge-gray">—</span>`}</td>
        </tr>`).join("")}</tbody></table>
      </div>
    </div>`;
  }).filter(Boolean).join("");

  content.innerHTML = blocks || `<div class="section"><div class="empty-state"><div class="big">▥</div><div class="disp" style="font-size:15px;font-weight:600;">No archives yet</div><p>Archive the current month once it's complete to keep a permanent snapshot here.</p></div></div>`;
}

/* ---------------- SETTINGS ---------------- */
