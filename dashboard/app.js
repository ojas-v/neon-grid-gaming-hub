/*
  NEON GRID dashboard
  1) Runs locally with localStorage before Supabase is configured.
  2) For cloud saves, fill SUPABASE_URL and SUPABASE_ANON_KEY below.
  3) Uses Supabase anonymous auth + row-level security; never put a service-role key here.
*/
const SUPABASE_URL = "https://ktjjbnjzzehgyohhuyns.supabase.co"; // e.g. https://YOUR_PROJECT.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_fO_Fc9csnsbaUKktK5fYww_UUNx1zht"; // Supabase publishable/anon key ONLY

const GAME_CONFIG = {
  "coding-via-gaming": {
    title: "CODING VIA GAMING",
    path: "../games/coding-game/index.html",
    maxScore: 27
  },
  "pipeline-quest": {
    title: "PIPELINE QUEST — KESTREL 9",
    path: "../games/pipeline-quest/index.html",
    maxScore: null
  }
};

const $ = (id) => document.getElementById(id);
const LOCAL_PLAYER_KEY = "neonGrid.playerName";
const LOCAL_SCORES_KEY = "neonGrid.scores";
let playerName = "";
let cloudClient = null;
let cloudUserId = null;
let currentGameId = null;
let toastTimer = null;

function safeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
function validName(value) {
  return /^[\p{L}\p{N}_ -]{2,24}$/u.test(value);
}
function localScores() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || "[]"); }
  catch { return []; }
}
function writeLocalScores(scores) {
  localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(scores.slice(0, 200)));
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function setCloudStatus(connected, label) {
  $("connectionLabel").textContent = label;
  $("saveStatus").textContent = connected ? "CLOUD SYNC ACTIVE" : "LOCAL PROGRESS ENABLED";
  $("saveStatus").style.color = connected ? "var(--green)" : "var(--muted)";
}
function openLogin() {
  $("loginModal").classList.remove("hidden");
  $("playerTag").value = playerName;
  setTimeout(() => $("playerTag").focus(), 50);
}
function closeLogin() { $("loginModal").classList.add("hidden"); }

async function initializeCloud() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase?.createClient) {
    setCloudStatus(false, "LOCAL DEMO MODE");
    return;
  }
  try {
    cloudClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    let { data: { session } } = await cloudClient.auth.getSession();
    if (!session) {
      const result = await cloudClient.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    cloudUserId = session?.user?.id || null;
    if (!cloudUserId) throw new Error("Could not establish a cloud player session.");
    setCloudStatus(true, "CLOUD SYNC READY");
    if (playerName) await upsertProfile(playerName);
  } catch (error) {
    console.error("Cloud setup error:", error);
    cloudClient = null;
    cloudUserId = null;
    setCloudStatus(false, "LOCAL DEMO MODE");
    showToast("Cloud sync unavailable. Continuing with local saves.", true);
  }
}
async function upsertProfile(name) {
  if (!cloudClient || !cloudUserId) return;
  const { error } = await cloudClient.from("players").upsert({
    player_id: cloudUserId,
    player_name: name,
    updated_at: new Date().toISOString()
  }, { onConflict: "player_id" });
  if (error) throw error;
}
async function loginPlayer(rawName) {
  const name = safeName(rawName);
  if (!validName(name)) {
    showToast("Use 2–24 letters, numbers, spaces, underscores or hyphens.", true);
    return;
  }
  playerName = name;
  sessionStorage.setItem(LOCAL_PLAYER_KEY, name);
  closeLogin();
  renderIdentity();
  if (cloudClient && cloudUserId) {
    try {
      await upsertProfile(name);
      showToast(`Welcome back, Agent ${name}. Cloud profile ready.`);
    } catch (error) {
      console.error(error);
      showToast("Profile saved locally, but cloud profile update failed.", true);
    }
  } else {
    showToast(`Welcome, Agent ${name}. Local demo mode is active.`);
  }
  await refreshDashboard();
}
function renderIdentity() {
  const name = playerName || "Guest";
  $("welcomeTitle").innerHTML = `Welcome, Agent <span>${escapeHTML(name)}</span>`;
  $("welcomeSubtitle").textContent = playerName
    ? "Your mission history is ready. Choose a system to begin."
    : "Enter a Player Tag to initialize your session.";
  $("playerNameLabel").textContent = name;
  $("playerAvatar").textContent = (name.trim()[0] || "G").toUpperCase();
}
function gameName(gameId) {
  return GAME_CONFIG[gameId]?.title || gameId || "UNKNOWN GAME";
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
function getHighScore(scores, gameId) {
  return scores.filter((item) => item.game_id === gameId)
    .reduce((best, item) => Math.max(best, Number(item.score) || 0), 0);
}
function renderStats(scores) {
  const unique = new Set(scores.map((s) => s.game_id));
  const best = scores.reduce((max, s) => Math.max(max, Number(s.score) || 0), 0);
  $("totalRuns").textContent = String(scores.length).padStart(2, "0");
  $("systemsPlayed").innerHTML = `${String(unique.size).padStart(2, "0")}<span>/02</span>`;
  $("bestOverall").textContent = String(best).padStart(2, "0");
  $("agentRank").textContent = best >= 25 ? "ELITE" : best >= 15 ? "VETERAN" : best >= 5 ? "OPERATIVE" : "ROOKIE";
  $("codingHighScore").textContent = scores.some(s => s.game_id === "coding-via-gaming")
    ? `${getHighScore(scores, "coding-via-gaming")} / 27` : "NOT PLAYED";
  $("pipelineHighScore").textContent = scores.some(s => s.game_id === "pipeline-quest")
    ? String(getHighScore(scores, "pipeline-quest")) : "NOT PLAYED";
}
function renderHistory(scores) {
  const rows = [...scores].sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp)).slice(0, 12);
  $("historyCount").textContent = `${scores.length} RECORD${scores.length === 1 ? "" : "S"}`;
  if (!rows.length) {
    $("historyBody").innerHTML = `<tr><td colspan="4" class="empty-state">No runs yet. Launch a game to create your first record.</td></tr>`;
    return;
  }
  $("historyBody").innerHTML = rows.map((item) => `<tr>
    <td class="game-cell">${escapeHTML(gameName(item.game_id))}</td>
    <td class="score-cell">${Number(item.score) || 0}${item.max_score ? ` / ${Number(item.max_score)}` : ""}</td>
    <td>${escapeHTML(item.detail || "Completed run")}</td>
    <td class="time-cell">${escapeHTML(formatDate(item.created_at || item.timestamp))}</td>
  </tr>`).join("");
}
async function fetchScores() {
  if (cloudClient && cloudUserId) {
    const { data, error } = await cloudClient.from("game_scores")
      .select("id, player_id, game_id, score, max_score, detail, created_at")
      .eq("player_id", cloudUserId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  }
  return localScores().filter((item) => item.player_name === playerName);
}
async function refreshDashboard() {
  renderIdentity();
  try {
    const scores = await fetchScores();
    renderStats(scores);
    renderHistory(scores);
  } catch (error) {
    console.error("Could not load score history:", error);
    showToast("Could not load cloud history. Check your Supabase tables and RLS policies.", true);
    const scores = localScores().filter((item) => item.player_name === playerName);
    renderStats(scores);
    renderHistory(scores);
  }
}
async function saveScore({ gameId, score, maxScore = null, detail = "Completed run" }) {
  if (!playerName) {
    showToast("Enter your Player Tag before saving scores.", true);
    openLogin();
    return;
  }
  if (!GAME_CONFIG[gameId]) {
    console.warn("Rejected score for unknown game:", gameId);
    return;
  }
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100000000) {
    showToast("Score was rejected because it is invalid.", true);
    return;
  }
  const record = {
    player_name: playerName,
    game_id: gameId,
    score: Math.round(numericScore),
    max_score: Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Math.round(Number(maxScore)) : null,
    detail: String(detail || "Completed run").slice(0, 180),
    timestamp: new Date().toISOString()
  };
  if (cloudClient && cloudUserId) {
    const { error } = await cloudClient.from("game_scores").insert({
      player_id: cloudUserId,
      game_id: record.game_id,
      score: record.score,
      max_score: record.max_score,
      detail: record.detail
    });
    if (error) {
      console.error("Cloud score insert failed:", error);
      showToast("Score could not sync to cloud. Saving locally instead.", true);
      const scores = localScores();
      scores.unshift({ ...record, id: crypto.randomUUID() });
      writeLocalScores(scores);
    } else {
      showToast("Score synced to your cloud profile.");
    }
  } else {
    const scores = localScores();
    scores.unshift({ ...record, id: crypto.randomUUID() });
    writeLocalScores(scores);
    showToast("Score saved on this browser.");
  }
  await refreshDashboard();
}
function launchGame(gameId) {
  if (!playerName) { openLogin(); return; }
  const game = GAME_CONFIG[gameId];
  if (!game) return;
  currentGameId = gameId;
  $("overlayGameTitle").textContent = game.title;
  $("gameFrame").src = game.path + (gameId === "pipeline-quest" ? "?player=" + encodeURIComponent(playerName) : "");
  $("gameOverlay").classList.add("open");
  $("gameOverlay").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeGame() {
  $("gameOverlay").classList.remove("open");
  $("gameOverlay").setAttribute("aria-hidden", "true");
  $("gameFrame").src = "about:blank";
  document.body.style.overflow = "";
  currentGameId = null;
  refreshDashboard();
}
function handleGameMessage(event) {
  // Only accept messages from the same origin and the currently opened iframe.
  if (event.origin !== window.location.origin) return;
  if (event.source !== $("gameFrame").contentWindow) return;
  const data = event.data;
  if (!data || data.type !== "GAME_SCORE") return;
  if (!currentGameId || data.gameId !== currentGameId) return;
  saveScore({
    gameId: data.gameId,
    score: data.score,
    maxScore: data.maxScore ?? null,
    detail: data.detail || "Completed run"
  }).catch((error) => {
    console.error(error);
    showToast("Score save failed.", true);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  playerName = safeName(sessionStorage.getItem(LOCAL_PLAYER_KEY) || "");
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await loginPlayer($("playerTag").value);
  });
  $("changePlayerBtn").addEventListener("click", openLogin);
  $("heroLaunchBtn").addEventListener("click", () => $("games").scrollIntoView({ behavior: "smooth" }));
  document.querySelectorAll("[data-game]").forEach((button) => {
    button.addEventListener("click", () => launchGame(button.dataset.game));
  });
  $("returnHubBtn").addEventListener("click", closeGame);
  $("refreshHistoryBtn").addEventListener("click", refreshDashboard);
  window.addEventListener("message", handleGameMessage);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("gameOverlay").classList.contains("open")) closeGame();
  });
  await initializeCloud();
  renderIdentity();
  if (!playerName) openLogin();
  await refreshDashboard();
});
