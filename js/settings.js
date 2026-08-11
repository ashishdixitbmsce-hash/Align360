function renderTLAccountSettings(content, topActions){
  topActions.innerHTML = "";
  const me = findUserByUsername(currentUser.username) || {};
  content.innerHTML = `
    <div class="settings-grid">
      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">🔑</span>My account</div></div>
        <div class="section-body">
          <div class="field"><label>Name</label><input type="text" value="${esc(currentUser.name)}" disabled></div>
          <div class="field"><label>Username</label><input type="text" value="${esc(currentUser.username)}" disabled></div>
          <div class="field"><label>Team</label><input type="text" value="${esc(currentUser.tlName||'')}" disabled></div>
          <div class="field"><label>Data access</label><input type="text" value="${currentUser.viewAll ? 'All teams (full access)' : 'My team only'}" disabled></div>
          <div class="field"><label>New password</label>${pwFieldHtml("myNewPw","Leave blank to keep current")}</div>
          <div class="field"><label>Security question</label><input type="text" id="mySecQ" value="${esc(me.securityQ||'')}" placeholder="e.g. First pet's name?"></div>
          <div class="field"><label>Security answer</label><input type="text" id="mySecA" placeholder="Leave blank to keep current answer"></div>
          <button class="btn btn-accent" id="saveMyAccountBtn">Save changes</button>
          <div class="help-note">Setting a security question lets you reset your own password from the login screen if you ever forget it. Ask your Admin if you need your username changed, your data access level updated, or if you need someone else's password reset.</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("saveMyAccountBtn").addEventListener("click", async ()=>{
    const user = findUserByUsername(currentUser.username);
    if(!user) return;
    const newPw = document.getElementById("myNewPw").value;
    const newSecA = document.getElementById("mySecA").value.trim();
    const saveBtn = document.getElementById("saveMyAccountBtn");
    saveBtn.disabled = true;
    if(newPw) await setUserPassword(user, newPw);
    user.securityQ = document.getElementById("mySecQ").value.trim();
    if(newSecA) await setUserSecurityAnswer(user, newSecA);
    saveBtn.disabled = false;
    saveState();
    showToast("✅ Account updated");
    document.getElementById("myNewPw").value = "";
    document.getElementById("mySecA").value = "";
  });
}
function renderSettings(content, topActions){
  if(!isWFM()){ renderTLAccountSettings(content, topActions); return; }
  const s = state.settings;
  const me = findUserByUsername(currentUser.username) || {};
  const yearOpts = Array.from({length:7},(_,i)=>2024+i).map(y=>`<option value="${y}" ${y===s.year?'selected':''}>${y}</option>`).join("");
  const monthOpts = MONTHS.map(m=>`<option value="${m}" ${m===s.month?'selected':''}>${m}</option>`).join("");

  const metricRows = s.metrics.map((m,i)=>{
    const inputType = m.inputType || "number";
    return `
    <tr data-i="${i}">
      <td><input class="cell-input" style="width:150px" type="text" data-mf="name" value="${esc(m.name)}">${m.core?' <span class="badge badge-gray" style="margin-left:4px;" title="One of the 4 default metrics — fully editable, including renaming or removing it.">default</span>':''}</td>
      <td class="num"><input class="cell-input" style="width:56px" type="number" data-mf="target" value="${m.target}" ${inputType!=="number" && inputType!=="checkbox" ? 'disabled title="Target/threshold only apply to Number or Checkbox metrics"':''}></td>
      <td class="num"><input class="cell-input" style="width:56px" type="number" data-mf="threshold" value="${m.threshold}" ${inputType!=="number" && inputType!=="checkbox" ? 'disabled title="Target/threshold only apply to Number or Checkbox metrics"':''}></td>
      <td>
        <select class="cell-select" data-mf="direction">
          <option value="higher" ${m.direction==='higher'?'selected':''}>Higher is better</option>
          <option value="lower" ${m.direction==='lower'?'selected':''}>Lower is better</option>
        </select>
      </td>
      <td><input class="cell-input" style="width:60px" type="text" data-mf="unit" value="${esc(m.unit||"")}" placeholder="e.g. %"></td>
      <td>
        <select class="cell-select" data-mf="inputType">
          <option value="number" ${inputType==='number'?'selected':''}>Number</option>
          <option value="checkbox" ${inputType==='checkbox'?'selected':''}>Checkbox</option>
          <option value="radio" ${inputType==='radio'?'selected':''}>Radio buttons</option>
          <option value="dropdown" ${inputType==='dropdown'?'selected':''}>Dropdown</option>
        </select>
      </td>
      <td><input class="cell-input" style="width:120px" type="text" data-mf="options" value="${esc((m.options||[]).join(', '))}" placeholder="e.g. Yes, No, N/A" ${(inputType==="radio"||inputType==="dropdown")?'':'disabled'}></td>
      <td><button class="icon-btn del-metric-btn" title="Remove this metric">✕</button></td>
    </tr>`;
  }).join("");

  const leaveRows = s.leaveTypes.map((lt,i)=>`
    <tr data-i="${i}">
      <td class="mono">${esc(lt.code)}</td>
      <td>${esc(lt.name)}</td>
      <td><span class="tag-swatch" style="background:var(--${lt.color==='green'?'green':lt.color==='red'?'red':'yellow'})"></span>${lt.color}</td>
      <td><button class="icon-btn del-leavetype-btn">✕</button></td>
    </tr>`).join("");

  const tlRows = (s.tls||[]).map((tl,i)=>`
    <tr data-i="${i}">
      <td>${esc(tl)}</td>
      <td><button class="icon-btn del-tl-btn">✕</button></td>
    </tr>`).join("");

  content.innerHTML = `
    <div class="settings-grid">
      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">◔</span>Leave types</div></div>
        <div class="section-body">
          <div class="table-wrap"><table class="mini-table"><thead><tr><th>Code</th><th>Name</th><th>Color</th><th></th></tr></thead><tbody id="leaveTypeBody">${leaveRows}</tbody></table></div>
          <div class="form-inline" style="margin-top:12px;">
            <div class="field"><label>Code</label><input type="text" id="newLtCode" placeholder="SL" style="width:70px;"></div>
            <div class="field"><label>Full name</label><input type="text" id="newLtName" placeholder="Sick Leave"></div>
            <div class="field"><label>Color</label><select id="newLtColor"><option value="green">Green</option><option value="yellow">Yellow</option><option value="red">Red</option></select></div>
            <button class="btn btn-sm btn-accent" id="addLtBtn">+ Add</button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">◎</span>Team Leaders</div></div>
        <div class="section-body">
          <div class="table-wrap"><table class="mini-table"><thead><tr><th>TL Name</th><th></th></tr></thead><tbody id="tlBody">${tlRows || '<tr><td colspan="2" style="color:var(--text-dim);">No TLs added yet</td></tr>'}</tbody></table></div>
          <div class="form-inline" style="margin-top:12px;">
            <div class="field"><label>TL name</label><input type="text" id="newTlName" placeholder="e.g. Priya Sharma"></div>
            <button class="btn btn-sm btn-accent" id="addTlBtn">+ Add TL</button>
          </div>
          <div class="help-note">Add each Team Leader here once — you can then assign agents to a TL in Team Roster, and filter Daily Data / Dashboard / Team Roster by TL.</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">🖼</span>Branding</div></div>
        <div class="section-body">
          <div class="field"><label>Team name</label><input type="text" id="setTeamName" value="${esc(s.teamName)}"></div>
          ${isAdmin() ? `
          <div class="field"><label>App name</label><input type="text" id="setAppName" value="${esc(s.appName||'Align360')}" placeholder="Align360"></div>
          <div class="help-note" style="margin-top:-6px;margin-bottom:14px;">Shown on the welcome screen every Team Leader and Agent sees after logging in.</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;" id="logoPreviewWrap">${brandLogoImgHtml(36)}</div>
          <div class="field"><label>Upload logo (PNG/JPG/SVG — shown in sidebar and login screen)</label><input type="file" id="setLogoInput" accept="image/*"></div>
          <button class="btn" id="resetLogoBtn">Reset to default logo</button>
          <div class="help-note">Keep the image small (under ~200KB) since it's stored along with your other settings. This logo appears for every Team Leader and Agent, on the sidebar and the login screen.</div>
          ` : `<div class="help-note">App name and logo can only be changed by an Admin.</div>`}
        </div>
      </div>

      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">🗂</span>Agent Report Card</div></div>
        <div class="section-body">
          <div class="help-note" style="margin-top:-2px;margin-bottom:12px;">Pick what shows up on an agent's report card — opened by clicking an agent's name anywhere on the Dashboard (TL and above only).</div>
          <div id="rcFieldsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;">
            ${REPORT_CARD_FIELD_DEFS.map(f=>`
              <label class="check-row"><input type="checkbox" class="rc-field-cb" data-id="${f.id}" ${(s.reportCardFields && s.reportCardFields[f.id]===false) ? '' : 'checked'}> ${esc(f.label)}</label>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><div class="section-title"><span class="eyebrow">🔑</span>My account</div></div>
        <div class="section-body">
          <div class="field"><label>Username</label><input type="text" value="${esc(currentUser.username)}" disabled></div>
          <div class="field"><label>New password</label>${pwFieldHtml("myNewPw","Leave blank to keep current")}</div>
          <div class="field"><label>Security question</label><input type="text" id="mySecQ" value="${esc(me.securityQ||'')}" placeholder="e.g. First pet's name?"></div>
          <div class="field"><label>Security answer</label><input type="text" id="mySecA" placeholder="Leave blank to keep current answer"></div>
          <button class="btn btn-accent" id="saveMyAccountBtn">Save changes</button>
          <div class="help-note">Setting a security question lets you reset your own password from the login screen if you ever forget it. Only Admin can reset another user's password.</div>
        </div>
      </div>
    </div>

    ${isAdmin() ? `
    <div class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">◎</span>User accounts (login)</div></div>
      <div class="section-body">
        <div class="table-wrap"><table class="mini-table"><thead><tr><th>Name</th><th>Role</th><th>Username</th><th>Linked TL</th><th>Data access</th><th>Status</th><th></th></tr></thead><tbody id="userAcctBody">${(s.users||[]).map((u,i)=>`
          <tr data-i="${i}">
            <td>${esc(u.name)}</td>
            <td><span class="badge ${u.role==='admin'?'badge-yellow':u.role==='wfm'?'badge-green':'badge-gray'}">${u.role==='admin'?'Admin':u.role==='wfm'?'WFM':'Team Leader'}</span></td>
            <td class="mono">${esc(u.username)}</td>
            <td>${esc(u.tlName||"—")}</td>
            <td>
              ${(u.role==='wfm'||u.role==='admin')
                ? `<span class="badge badge-green">All teams</span>`
                : `<label class="check-row" style="font-size:11.5px;white-space:nowrap;"><input type="checkbox" class="user-viewall-cb" data-i="${i}" ${u.viewAll?'checked':''}> Full data access</label>`}
            </td>
            <td><label class="check-row" style="font-size:11.5px;white-space:nowrap;"><input type="checkbox" class="user-enabled-cb" data-i="${i}" ${u.enabled===false?'':'checked'}> ${u.enabled===false?'Disabled':'Active'}</label></td>
            <td>
              <button class="icon-btn reset-user-pw-btn" title="Set new password">🔑</button>
              <button class="icon-btn del-user-btn" title="Remove account">✕</button>
            </td>
          </tr>`).join("")}</tbody></table></div>
        <div class="form-inline" style="margin-top:12px;flex-wrap:wrap;">
          <div class="field"><label>Full name</label><input type="text" id="newUserName" placeholder="Priya Sharma"></div>
          <div class="field"><label>Role</label>
            <select id="newUserRole">
              <option value="tl">Team Leader</option>
              <option value="wfm">WFM Admin</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="field"><label>Team (TL only)</label>
            <select id="newUserTlName">
              <option value="">— (WFM/Admin only) —</option>
              ${(s.tls||[]).map(tl=>`<option value="${esc(tl)}">${esc(tl)}</option>`).join("")}
            </select>
          </div>
          <label class="check-row" style="align-self:flex-end;margin-bottom:8px;"><input type="checkbox" id="newUserViewAll"> Full data access (see all teams)</label>
          <div class="field"><label>Username</label><input type="text" id="newUserUsername" placeholder="priya.s"></div>
          <div class="field"><label>Temporary password</label><input type="text" id="newUserPassword" placeholder="Temp password"></div>
          <button class="btn btn-sm btn-accent" id="addUserBtn">+ Add account</button>
        </div>
        <div class="help-note">New logins are created <b>Active</b> and set to require a password change on first sign-in — they'll pick their own permanent password (and, if they want one, their own security question) then, instead of using the temporary one you set here. By default a Team Leader only sees their own team. Turn on <b>Full data access</b> for a TL — either here or per-row in the table above — to let them see and filter every team's data too, the same way WFM does. They still can't reach Settings beyond their own account. Turning a login to <b>Disabled</b> blocks sign-in immediately without deleting the account or its history. WFM and Admin accounts always see every team. There's always at least one WFM account and one Admin account — the last one of each can't be removed. Only Admin can create logins, remove logins, or reset another user's password.</div>
      </div>
    </div>
    ` : `
    <div class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">◎</span>User accounts (login)</div></div>
      <div class="section-body">
        <div class="help-note">User accounts — creating logins, removing logins, and resetting another user's password — are managed by your Admin.</div>
      </div>
    </div>
    `}

    <div class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">01</span>KPI metrics & targets</div></div>
      <div class="section-body">
        <div class="table-wrap"><table><thead><tr><th>Metric</th><th class="num">Target</th><th class="num">Threshold (red line)</th><th>Direction</th><th>Unit</th><th>Input type</th><th>Options</th><th></th></tr></thead><tbody id="metricBody">${metricRows}</tbody></table></div>
        <div class="form-inline" style="margin-top:12px;">
          <div class="field"><label>Metric name</label><input type="text" id="newMetName" placeholder="Resolution Rate (%)"></div>
          <div class="field"><label>Target</label><input type="number" id="newMetTarget" style="width:80px;"></div>
          <div class="field"><label>Threshold</label><input type="number" id="newMetThreshold" style="width:80px;"></div>
          <div class="field"><label>Direction</label><select id="newMetDir"><option value="higher">Higher is better</option><option value="lower">Lower is better</option></select></div>
          <div class="field"><label>Unit</label><input type="text" id="newMetUnit" style="width:70px;" placeholder="%"></div>
          <div class="field"><label>Input type</label>
            <select id="newMetInputType">
              <option value="number">Number</option>
              <option value="checkbox">Checkbox</option>
              <option value="radio">Radio buttons</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>
          <div class="field"><label>Options (radio/dropdown)</label><input type="text" id="newMetOptions" style="width:150px;" placeholder="Yes, No, N/A"></div>
          <button class="btn btn-sm btn-accent" id="addMetBtn">+ Add metric</button>
        </div>
        <div class="help-note">Every metric — including ones you add here — automatically gets its own editable column in Daily Data and shows up across the Dashboard (KPI cards, weekly/monthly tables, calendar view, and charts). Target/threshold-based color coding and averaging only apply to Number and Checkbox metrics; Radio and Dropdown metrics are for tracking categories/labels and aren't averaged.</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">⌁</span>Backup</div></div>
      <div class="section-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-accent" id="downloadBackupBtn">⬇ Download backup (.json)</button>
          <button class="btn" id="restoreBackupBtn">⬆ Restore from backup</button>
          <input type="file" id="restoreBackupInput" accept=".json" style="display:none;">
        </div>
        <div class="help-note">Everything is saved automatically in this browser as you work. If you ever see a "Save failed" message, or before switching computers/browsers, download a backup here — it's one JSON file with your whole roster, daily entries, settings and history. Restoring replaces everything currently in the app with the backup.</div>
        ${(()=>{
          const bytes = new Blob([JSON.stringify(state)]).size;
          const kb = bytes/1024, mb = kb/1024;
          const sizeLabel = mb>=1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
          const warn = mb > 3;
          return `<div class="help-note" style="margin-top:8px;${warn?`color:var(--yellow);`:''}">Current data size: <b>${sizeLabel}</b>${warn ? " — this is getting large for browser storage. Archive old months (Month History) and use \"Clear data\" on Daily Data for months you've already archived and exported, to keep things fast and safe." : "."}</div>`;
        })()}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title"><span class="eyebrow">⌁</span>Data</div></div>
      <div class="section-body">
        ${isWFM() ? `<button class="btn btn-danger" id="clearDemoBtn" style="margin-bottom:10px;">🧹 Clear demo/test data</button>
        <div class="help-note" style="margin-bottom:14px;">Removes all agents, daily entries, month history, process updates, and shift swap requests — from this browser <b>and</b> the shared Firebase database, so it's gone for everyone. Keeps your settings: team name, logo, KPI metrics, leave types, and TL/WFM accounts. Use this once you're done testing with demo data and ready to start fresh with real data.</div>` : ''}
        <button class="btn btn-danger" id="resetSettingsBtn">Reset settings</button>
        <button class="btn btn-danger" id="resetBtn">Reset all data</button>
        <div class="help-note"><b>Reset settings</b> restores team name, KPI metrics/targets and leave types to defaults — your roster, daily entries and history are kept.<br><b>Reset all data</b> clears roster, daily entries and history in this browser only — it does not clear the shared cloud database. Neither action can be undone.</div>
      </div>
    </div>
  `;

  if(isAdmin()){
    document.getElementById("setLogoInput").addEventListener("change", e=>{
      const file = e.target.files[0];
      e.target.value = "";
      if(!file) return;
      if(file.size > 400*1024){ showToast("⚠ That image is quite large — try one under ~200KB for best performance"); }
      const reader = new FileReader();
      reader.onload = ()=>{
        state.settings.logoDataUrl = reader.result;
        saveState(); render();
        showToast("✅ Logo updated");
      };
      reader.onerror = ()=> showToast("⚠ Could not read that image file");
      reader.readAsDataURL(file);
    });
    document.getElementById("resetLogoBtn").addEventListener("click", ()=>{
      state.settings.logoDataUrl = "";
      saveState(); render();
      showToast("Logo reset to default");
    });
  }
  document.getElementById("saveMyAccountBtn").addEventListener("click", async ()=>{
    const user = findUserByUsername(currentUser.username);
    if(!user) return;
    const newPw = document.getElementById("myNewPw").value;
    const newSecA = document.getElementById("mySecA").value.trim();
    const saveBtn = document.getElementById("saveMyAccountBtn");
    saveBtn.disabled = true;
    if(newPw) await setUserPassword(user, newPw);
    user.securityQ = document.getElementById("mySecQ").value.trim();
    if(newSecA) await setUserSecurityAnswer(user, newSecA);
    saveBtn.disabled = false;
    saveState();
    showToast("✅ Account updated");
    document.getElementById("myNewPw").value = "";
    document.getElementById("mySecA").value = "";
  });
  if(isAdmin()){
    content.querySelectorAll("#userAcctBody .user-viewall-cb").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        const user = s.users[Number(cb.dataset.i)];
        user.viewAll = cb.checked;
        saveState();
        showToast(cb.checked ? `✅ ${user.name} can now see all teams' data` : `${user.name} is now limited to their own team`);
        if(currentUser && currentUser.username===user.username) currentUser.viewAll = user.viewAll;
      });
    });
    content.querySelectorAll("#userAcctBody .user-enabled-cb").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        const user = s.users[Number(cb.dataset.i)];
        if(!cb.checked && user.username===currentUser.username){
          showToast("⚠ You can't disable the account you're currently logged in with");
          cb.checked = true; return;
        }
        if(!cb.checked && user.role==="wfm" && s.users.filter(u=>u.role==="wfm" && u.enabled!==false).length<=1){
          showToast("⚠ Can't disable the last active WFM account"); cb.checked = true; return;
        }
        if(!cb.checked && user.role==="admin" && s.users.filter(u=>u.role==="admin" && u.enabled!==false).length<=1){
          showToast("⚠ Can't disable the last active Admin account"); cb.checked = true; return;
        }
        user.enabled = cb.checked;
        saveState(); render();
        showToast(cb.checked ? `✅ ${user.name}'s login is active` : `${user.name}'s login is disabled`);
      });
    });
    content.querySelectorAll("#userAcctBody .reset-user-pw-btn").forEach((btn,idx)=>{
      btn.addEventListener("click", ()=>{
        const user = s.users[idx];
        const overlay = showModal(`
          <div class="modal-title">Set a new password for ${esc(user.name)}</div>
          <div class="field"><label>New password</label>${pwFieldHtml("rupNewPw","New password")}</div>
          <div class="help-note" style="margin-top:2px;">They'll be asked to set their own password on next sign-in — this one is just to get them back in.</div>
          <div class="modal-actions">
            <button class="btn btn-ghost" id="rupCancel">Cancel</button>
            <button class="btn btn-accent" id="rupSave">Save</button>
          </div>
        `);
        overlay.querySelector("#rupCancel").addEventListener("click", closeModal);
        overlay.querySelector("#rupSave").addEventListener("click", async ()=>{
          const pw = document.getElementById("rupNewPw").value;
          if(!pw){ showToast("Enter a password"); return; }
          await setUserPassword(user, pw);
          user.mustChangePassword = true;
          saveState(); closeModal();
          showToast(`✅ Password updated for ${user.name} — they'll set their own on next login`);
        });
      });
    });
    content.querySelectorAll("#userAcctBody .del-user-btn").forEach((btn,idx)=>{
      btn.addEventListener("click", ()=>{
        const user = s.users[idx];
        if(user.role==="wfm" && s.users.filter(u=>u.role==="wfm").length<=1){
          showToast("⚠ Can't remove the last WFM account"); return;
        }
        if(user.role==="admin" && s.users.filter(u=>u.role==="admin").length<=1){
          showToast("⚠ Can't remove the last Admin account"); return;
        }
        if(user.username===currentUser.username){
          showToast("⚠ You can't remove the account you're currently logged in with"); return;
        }
        showConfirm(`Remove the login for "${esc(user.name)}"? They won't be able to log in until a new account is created for them.`, ()=>{
          s.users.splice(idx,1); saveState(); render();
        }, "Remove");
      });
    });
    document.getElementById("addUserBtn").addEventListener("click", async ()=>{
      const addBtn = document.getElementById("addUserBtn");
      if(addBtn.disabled) return; // already submitting — ignore repeat clicks
      const name = document.getElementById("newUserName").value.trim();
      const role = document.getElementById("newUserRole").value;
      const tlName = document.getElementById("newUserTlName").value;
      const username = document.getElementById("newUserUsername").value.trim();
      const password = document.getElementById("newUserPassword").value;
      const viewAll = document.getElementById("newUserViewAll").checked;
      if(!name || !username || !password){ showToast("Enter a name, username and temporary password"); return; }
      if(role==="tl" && !tlName){ showToast("Pick which Team Leader this account belongs to"); return; }
      if(findUserByUsername(username)){ showToast("That username is already taken"); return; }
      addBtn.disabled = true;
      try{
        // Re-check right before writing: closes the window where a second click (or a
        // second in-flight submit) could slip past the earlier check while this one
        // was still awaiting password hashing below.
        if(findUserByUsername(username)){ showToast("That username is already taken"); return; }
        if(!s.users) s.users = [];
        // No securityQ/securityA here on purpose: an admin-set recovery answer defeats the
        // point of a recovery answer, since the admin already knows the temp password too.
        // Security question is self-service only, set by the user in their own Account
        // settings after they've logged in and changed their password.
        const newUser = { id: "u_"+Date.now(), role, name, username, tlName: role==="tl" ? tlName : "", viewAll: role==="tl" ? viewAll : false, enabled:true, mustChangePassword:true };
        await setUserPassword(newUser, password);
        s.users.push(newUser);
        saveState(); render();
        showToast(`✅ Login created for ${name}`);
      } finally {
        addBtn.disabled = false;
      }
    });
  }
  document.getElementById("downloadBackupBtn").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTeam = (state.settings.teamName||"Team").replace(/[^a-z0-9]+/gi,"_");
    a.href = url;
    a.download = `${safeTeam}_backup_${todayIso()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("✅ Backup downloaded");
  });
  document.getElementById("restoreBackupBtn").addEventListener("click", ()=>{
    document.getElementById("restoreBackupInput").click();
  });
  document.getElementById("restoreBackupInput").addEventListener("change", async e=>{
    const file = e.target.files[0];
    e.target.value = "";
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      if(!parsed || typeof parsed !== "object" || !parsed.settings || !Array.isArray(parsed.roster)){
        showToast("⚠ That doesn't look like a valid backup file"); return;
      }
      showConfirm("Restore from this backup? This replaces everything currently in the app (roster, daily entries, settings, history) with the backup's contents.", async ()=>{
        const btn = document.getElementById("restoreBackupBtn");
        if(btn){ btn.disabled = true; btn.textContent = "Restoring…"; }
        try{
          state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
          state.settings = Object.assign({}, DEFAULT_STATE.settings, parsed.settings || {});
          state.roster.forEach(a=>{ if(a.tlName===undefined) a.tlName=""; if(a.lob===undefined) a.lob=""; });
          ensureDefaultUsers();
          await migrateUserCredentials();
          await saveState(); applyTheme();
          currentUser = null;
          showToast("✅ Restored from backup — please log in again");
          showLoginModal();
        }finally{
          if(btn){ btn.disabled = false; btn.textContent = "⬆ Restore from backup"; }
        }
      }, "Restore");
    }catch(err){
      console.error(err);
      showToast("⚠ Could not read that backup file");
    }
  });

  document.getElementById("setTeamName").addEventListener("change", e=>{ s.teamName=e.target.value; saveState(); render(); });
  if(isAdmin()) document.getElementById("setAppName").addEventListener("change", e=>{ s.appName=e.target.value.trim()||"Align360"; saveState(); render(); });

  if(!s.reportCardFields) s.reportCardFields = {};
  content.querySelectorAll(".rc-field-cb").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      s.reportCardFields[cb.dataset.id] = cb.checked;
      saveState();
    });
  });

  content.querySelectorAll("#metricBody tr").forEach(tr=>{
    const i = Number(tr.dataset.i);
    tr.querySelectorAll("input,select").forEach(el=>{
      el.addEventListener("change", ()=>{
        const f = el.dataset.mf;
        if(f==="name"){
          const val = el.value.trim();
          if(!val){ showToast("Metric name can't be empty"); el.value = s.metrics[i].name; return; }
          s.metrics[i].name = val;
        }
        else if(f==="target"||f==="threshold") s.metrics[i][f] = Number(el.value);
        else if(f==="options") s.metrics[i][f] = el.value.split(",").map(o=>o.trim()).filter(Boolean);
        else s.metrics[i][f] = el.value;
        warnIfMetricMisconfigured(s.metrics[i]);
        saveState(); render();
      });
    });
    const del = tr.querySelector(".del-metric-btn");
    if(del) del.addEventListener("click", ()=>{
      const m = s.metrics[i];
      let msg = `Remove the "${esc(m.name)}" metric? Its column disappears from Daily Data and the Dashboard, but any values already entered stay saved in the background (they'll come back if you re-add a metric using the same name later).`;
      if(m.core) msg = `"${esc(m.name)}" is one of the 4 default metrics. ` + msg;
      if(s.metrics.length===1) msg += " This is your last remaining metric — after removing it, Daily Data will have no metric columns until you add a new one.";
      showConfirm(msg, ()=>{
        s.metrics.splice(i,1); saveState(); render();
      }, "Remove");
    });
  });
  content.querySelectorAll("#leaveTypeBody .del-leavetype-btn").forEach((btn,idx)=>{
    btn.addEventListener("click", ()=>{ s.leaveTypes.splice(idx,1); saveState(); render(); });
  });
  document.getElementById("addLtBtn").addEventListener("click", ()=>{
    const code = document.getElementById("newLtCode").value.trim().toUpperCase();
    const name = document.getElementById("newLtName").value.trim();
    const color = document.getElementById("newLtColor").value;
    if(!code || !name){ showToast("Enter a code and name"); return; }
    s.leaveTypes.push({code,name,color});
    saveState(); render();
  });
  content.querySelectorAll("#tlBody .del-tl-btn").forEach((btn,idx)=>{
    btn.addEventListener("click", ()=>{
      const removedName = s.tls[idx];
      showConfirm(`Remove "${esc(removedName)}" from the Team Leaders list? Agents already assigned to this TL will keep the name on their record, but it won't appear in the TL list anymore.`, ()=>{
        s.tls.splice(idx,1); saveState(); render();
      }, "Remove");
    });
  });
  document.getElementById("addTlBtn").addEventListener("click", ()=>{
    const name = document.getElementById("newTlName").value.trim();
    if(!name){ showToast("Enter a TL name"); return; }
    if(!s.tls) s.tls = [];
    if(s.tls.some(t=>t.toLowerCase()===name.toLowerCase())){ showToast("That TL is already in the list"); return; }
    s.tls.push(name);
    saveState(); render();
    showToast(`✅ Added TL "${name}"`);
  });
  document.getElementById("addMetBtn").addEventListener("click", ()=>{
    const name = document.getElementById("newMetName").value.trim();
    const target = Number(document.getElementById("newMetTarget").value);
    const threshold = Number(document.getElementById("newMetThreshold").value);
    const direction = document.getElementById("newMetDir").value;
    const unit = document.getElementById("newMetUnit").value.trim();
    const inputType = document.getElementById("newMetInputType").value;
    const options = document.getElementById("newMetOptions").value.split(",").map(o=>o.trim()).filter(Boolean);
    if(!name){ showToast("Enter a metric name"); return; }
    if((inputType==="radio"||inputType==="dropdown") && options.length<2){ showToast("Add at least 2 options for radio/dropdown, separated by commas"); return; }
    const field = slugField(name);
    const newMetric = {name,target,threshold,direction,unit,field,core:false,inputType,options};
    s.metrics.push(newMetric);
    saveState(); render();
    showToast(`✅ Added "${name}" — it now has its own column in Daily Data`);
    warnIfMetricMisconfigured(newMetric);
  });
  const clearDemoBtn = document.getElementById("clearDemoBtn");
  if(clearDemoBtn) clearDemoBtn.addEventListener("click", ()=>{
    showConfirm("This permanently removes ALL agents, daily entries, month history, process updates, and shift swap requests — from this browser and the shared Firebase database, for every TL and agent. Your settings (team name, logo, KPI metrics, leave types, TL/WFM accounts) are kept. This cannot be undone. Continue?", async ()=>{
      const btn = clearDemoBtn;
      btn.disabled = true;
      btn.textContent = "Clearing…";
      try{
        await clearDemoDataEverywhere();
        showToast("✅ Demo data cleared — this browser and the shared database are now empty of agents/records, settings kept");
        render();
      }catch(err){
        console.error(err);
        showToast("⚠ Something went wrong clearing the server data — check your connection and try again");
      }finally{
        btn.disabled = false;
        btn.textContent = "🧹 Clear demo/test data";
      }
    }, "Clear demo data");
  });
  document.getElementById("resetSettingsBtn").addEventListener("click", ()=>{
    showConfirm("Reset team name, branding, KPI metrics/targets, leave types and user accounts to their defaults? Your roster, daily entries and history won't be touched.", async ()=>{
      const keepTheme = state.settings.theme;
      state.settings = JSON.parse(JSON.stringify(DEFAULT_STATE.settings));
      state.settings.theme = keepTheme;
      ensureDefaultUsers();
      await migrateUserCredentials();
      saveState(); applyTheme();
      currentUser = null;
      showToast("✅ Settings reset to defaults — please log in again (wfm / admin)");
      showLoginModal();
    }, "Reset settings");
  });
  document.getElementById("resetBtn").addEventListener("click", ()=>{
    showConfirm("This clears all data in this browser. Continue?", async ()=>{
      const keepTheme = state.settings.theme;
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state.settings.theme = keepTheme;
      ensureDefaultUsers();
      await migrateUserCredentials();
      saveState(); applyTheme();
      currentUser = null;
      showToast("Data reset — please log in again (wfm / admin)");
      showLoginModal();
    }, "Reset");
  });
}

// ---------- Sidebar pin / auto-collapse ----------
