// Admin-only view of player accounts: shown on the title screen for admin accounts
// (on Cloudflare the admin emails come from the ADMIN_EMAILS variable; nothing is hard-coded here).
import { net } from './net.js';
import { ui } from './ui.js';
import { G } from './state.js';
import { esc } from '../core/rng.js';
import { topics } from './content.js';
const tname = (id) => topics().find((t) => t.id === id)?.name || id;

const ago = (t, nowT) => { if (!t) return 'never'; const s = Math.max(0, (nowT - t) / 1000); if (s < 300) return 'online now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; if (s < 86400 * 60) return Math.round(s / 86400) + ' days ago'; return new Date(t).toLocaleDateString(); };
const when = (t) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
let data = null, timer = null, box = null;
export const isAdmin = () => !!(net.authed && net.user?.admin);

async function load() { try { data = await net.api('GET', '/api/admin/active'); } catch (e) { data = { error: e.message }; } return data; }
function render() {
  if (!box) return; if (!data) { box.innerHTML = '<b>👥 Players</b><div class="dim">Loading…</div>'; return; }
  if (data.error) { box.innerHTML = `<b>👥 Players</b><div class="dim">${esc(data.error)}</div>`; return; }
  const A = data.accounts || []; const n = data.now || Date.now();
  const on = A.filter((a) => a.last_active && n - a.last_active < 300e3).length, d7 = A.filter((a) => a.last_active && n - a.last_active < 7 * 864e5).length, d30 = A.filter((a) => a.last_active && n - a.last_active < 30 * 864e5);
  box.innerHTML = `<b>👥 Players</b> <span class="dim">${on} online · ${d7} this week · ${d30.length} this month · ${A.length} total</span>
    <div class="adminrows">${(d30.length ? d30 : A.slice(0, 10)).map((a) => `<div class="adminrow"><span class="dot ${a.last_active && n - a.last_active < 300e3 ? 'on' : ''}"></span><b>${esc(a.username)}</b><span class="dim">${esc(ago(a.last_active, n))}</span></div>`).join('')}</div>`;
}
// Show the compact list on the title screen and keep it fresh.
export async function showTitleBox() {
  hideTitleBox(); if (!isAdmin() || !G.title) return;
  box = document.createElement('div'); box.className = 'adminbox'; document.body.appendChild(box); render();
  await load(); render();
  timer = setInterval(async () => { if (!G.title || !isAdmin()) return hideTitleBox(); await load(); render(); }, 60e3);
}
export function hideTitleBox() { clearInterval(timer); timer = null; box?.remove(); box = null; }
// Full list with every account.
export async function playersPanel() {
  hideTitleBox(); await load(); const A = data?.accounts || []; const n = data?.now || Date.now();
  await ui.panel({ title: '👥 All players', wide: true, render: () => data?.error ? `<p>${esc(data.error)}</p><div class="row"><button data-nav data-act="__close">Close</button></div>` : `
    <p class="dim">${A.length} accounts · sorted by last active · "online now" = active in the last 5 minutes</p>
    <div class="admintable"><div class="ath"><span>Player</span><span>Last active</span><span>Joined</span><span>Courses</span></div>
    ${A.map((a) => `<div class="atr"><span><span class="dot ${a.last_active && n - a.last_active < 300e3 ? 'on' : ''}"></span><b>${esc(a.username)}</b><br><small class="dim">${esc(a.email || '')}</small></span><span>${esc(ago(a.last_active, n))}<br><small class="dim">${esc(when(a.last_active))}</small></span><span>${esc(new Date(a.created_at).toLocaleDateString())}</span><span><small>${esc((a.topics || []).map(tname).join(', ') || '—')}</small></span></div>`).join('')}</div>
    <div class="row"><button data-nav data-act="refresh">↻ Refresh</button><button data-nav data-act="__close">Close</button></div>`,
    actions: { refresh: async () => { await load(); return 'rerender'; } } });
}
