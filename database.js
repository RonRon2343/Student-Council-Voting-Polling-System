// script.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  serverTimestamp,
  arrayUnion,
  increment
} from "firebase/firestore";

// ────────────────────────────────────────────────
//  Firebase Config & Initialization
// ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCr6Wl4j_l8M5ctN6wR841Hwq70E4PNOss",
  authDomain: "student-council-4e49e.firebaseapp.com",
  projectId: "student-council-4e49e",
  storageBucket: "student-council-4e49e.firebasestorage.app",
  messagingSenderId: "684376326284",
  appId: "1:684376326284:web:da833b777388687d84bba9",
  measurementId: "G-B4FXNZ6EV6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


//  DOM Elements

const loginSection      = document.getElementById("loginSection");
const votingSection     = document.getElementById("votingSection");
const confirmationSection = document.getElementById("confirmationSection");
const reviewSection     = document.getElementById("reviewSection");
const pollVoteSection   = document.getElementById("pollVoteSection");
const successSection    = document.getElementById("successSection");
const pollSuccessSection = document.getElementById("pollSuccessSection");
const adminSection      = document.getElementById("adminSection");

const loginForm         = document.getElementById("loginForm");
const loginMessage      = document.getElementById("loginMessage");
const voterNameEl       = document.getElementById("voterName");
const positionTitle     = document.getElementById("positionTitle");
const candidatesList    = document.getElementById("candidatesList");
const voterPollsList    = document.getElementById("voterPollsList");
const votingProgress    = document.getElementById("votingProgress");
const progressText      = document.getElementById("progressText");
const selectedCandidate = document.getElementById("selectedCandidate");
const ballotReview      = document.getElementById("ballotReview");
const pollOptionsContainer = document.getElementById("pollOptionsContainer");
const pollVoteInfo      = document.getElementById("pollVoteInfo");

const pollForm          = document.getElementById("pollForm");
const accountForm       = document.getElementById("accountForm");
const accountMessage    = document.getElementById("accountMessage");
const voterTableBody    = document.getElementById("voterTableBody");
const activePolls       = document.getElementById("activePolls");


//  State

let currentUser = null;
let voterData = null;
let currentPositionIndex = 0;
let ballot = {};               // { "President": "candidate-id", "Vice President": "...", ... }
let selectedPoll = null;
let selectedPollOption = null;

const POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Relations Officer"
];


//  Helpers

function showSection(section) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  section.classList.add("active");
}

function updateProgress() {
  const progress = ((currentPositionIndex + 1) / POSITIONS.length) * 100;
  votingProgress.style.width = `${progress}%`;
  progressText.textContent = `Step ${currentPositionIndex + 1} of ${POSITIONS.length}: ${POSITIONS[currentPositionIndex]}`;
}

async function loadCandidates() {
  candidatesList.innerHTML = "";
  const pos = POSITIONS[currentPositionIndex];
  positionTitle.textContent = `Vote for ${pos}`;

  try {
    const q = query(collection(db, "candidates"), where("position", "==", pos));
    const snap = await getDocs(q);
    if (snap.empty) {
      candidatesList.innerHTML = "<p>No candidates available for this position.</p>";
      return;
    }

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "candidate-card";
      card.innerHTML = `
        <img src="${data.photoURL || 'https://via.placeholder.com/120'}" alt="${data.name}">
        <h3>${data.name}</h3>
        <p>${data.party || "Independent"}</p>
        <button class="btn btn-primary select-candidate" data-id="${docSnap.id}">Select</button>
      `;
      candidatesList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading candidates:", err);
  }
}

async function loadPollsForVoter() {
  voterPollsList.innerHTML = "";
  try {
    const q = query(collection(db, "polls"), where("active", "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      voterPollsList.innerHTML = "<p>No active polls at the moment.</p>";
      return;
    }

    snap.forEach(docSnap => {
      const poll = docSnap.data();
      const alreadyVoted = voterData?.pollsVoted?.includes(docSnap.id);

      const card = document.createElement("div");
      card.className = "poll-card";
      card.innerHTML = `
        <h3>${poll.question}</h3>
        <p>Type: ${poll.type === "yesno" ? "Yes/No" : "Multiple Choice"}</p>
        ${alreadyVoted 
          ? `<p class="already-voted">You already voted in this poll.</p>`
          : `<button class="btn btn-primary vote-poll-btn" data-id="${docSnap.id}">Vote Now</button>`
        }
      `;
      voterPollsList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading polls:", err);
  }
}


//  Auth State Listener

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    try {
      const voterRef = doc(db, "voters", user.uid);
      const snap = await getDoc(voterRef);

      if (snap.exists()) {
        voterData = snap.data();
        voterNameEl.textContent = voterData.name || "Student";

        if (voterData.hasVoted) {
          showSection(successSection);
        } else if (voterData.isAdmin) {
          showSection(adminSection);
          loadAdminData();
        } else {
          showSection(votingSection);
          currentPositionIndex = 0;
          updateProgress();
          loadCandidates();
          loadPollsForVoter();
        }
      } else {
        alert("Voter record not found. Contact administrator.");
        signOut(auth);
      }
    } catch (err) {
      console.error("Error fetching voter data:", err);
      alert("Error loading profile.");
    }
  } else {
    showSection(loginSection);
    loginMessage.textContent = "";
  }
});

// ────────────────────────────────────────────────
//  Login
// ────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const studentId = document.getElementById("studentId").value.trim();
  const password = document.getElementById("password").value;

  loginMessage.textContent = "Authenticating...";

  try {
    // Convention: email = studentId@school.domain
    const email = `${studentId.toLowerCase()}@school.local`;
    await signInWithEmailAndPassword(auth, email, password);
    // → onAuthStateChanged will handle UI change
  } catch (err) {
    loginMessage.textContent = "Invalid credentials. Please try again.";
    console.error(err);
  }
});

// ────────────────────────────────────────────────
//  Logout
// ────────────────────────────────────────────────
window.logout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout failed:", err);
  }
};

// ────────────────────────────────────────────────
//  Voting Flow
// ────────────────────────────────────────────────
candidatesList.addEventListener("click", (e) => {
  if (e.target.classList.contains("select-candidate")) {
    const candidateId = e.target.dataset.id;
    ballot[POSITIONS[currentPositionIndex]] = candidateId;

    selectedCandidate.innerHTML = `
      <h3>You selected:</h3>
      <p><strong>${e.target.closest(".candidate-card").querySelector("h3").textContent}</strong></p>
      <p>for ${POSITIONS[currentPositionIndex]}</p>
    `;

    showSection(confirmationSection);
  }
});

window.confirmVote = () => {
  currentPositionIndex++;

  if (currentPositionIndex >= POSITIONS.length) {
    // All positions voted → show review
    showReview();
  } else {
    updateProgress();
    loadCandidates();
    showSection(votingSection);
  }
};

window.backToVoting = () => {
  showSection(votingSection);
};

function showReview() {
  ballotReview.innerHTML = "<h3>Your choices:</h3>";
  POSITIONS.forEach(pos => {
    const cid = ballot[pos];
    ballotReview.innerHTML += `<p><strong>${pos}:</strong> ${cid || "— (skipped)"}</p>`;
  });
  showSection(reviewSection);
}

window.editBallot = () => {
  currentPositionIndex = 0;
  updateProgress();
  loadCandidates();
  showSection(votingSection);
};

window.submitFinalBallot = async () => {
  if (!currentUser) return;

  try {
    const voterRef = doc(db, "voters", currentUser.uid);

    // Record votes
    for (const [position, candidateId] of Object.entries(ballot)) {
      if (candidateId) {
        const voteRef = doc(db, "votes", position);
        await updateDoc(voteRef, {
          [candidateId]: increment(1)
        });
      }
    }

    // Mark as voted
    await updateDoc(voterRef, {
      hasVoted: true,
      votedAt: serverTimestamp()
    });

    showSection(successSection);
  } catch (err) {
    console.error("Error submitting ballot:", err);
    alert("Failed to submit ballot. Please try again.");
  }
};

// ────────────────────────────────────────────────
//  Polls
// ────────────────────────────────────────────────
voterPollsList.addEventListener("click", async (e) => {
  if (e.target.classList.contains("vote-poll-btn")) {
    const pollId = e.target.dataset.id;
    try {
      const pollRef = doc(db, "polls", pollId);
      const snap = await getDoc(pollRef);
      if (!snap.exists()) return;

      selectedPoll = { id: pollId, ...snap.data() };
      pollVoteInfo.innerHTML = `<h3>${selectedPoll.question}</h3>`;

      pollOptionsContainer.innerHTML = "";

      if (selectedPoll.type === "yesno") {
        ["Yes", "No"].forEach(opt => {
          const btn = document.createElement("button");
          btn.className = "btn poll-option-btn";
          btn.textContent = opt;
          btn.dataset.value = opt.toLowerCase();
          pollOptionsContainer.appendChild(btn);
        });
      } else {
        selectedPoll.options.forEach(opt => {
          const btn = document.createElement("button");
          btn.className = "btn poll-option-btn";
          btn.textContent = opt;
          btn.dataset.value = opt;
          pollOptionsContainer.appendChild(btn);
        });
      }

      showSection(pollVoteSection);
    } catch (err) {
      console.error(err);
    }
  }
});

pollOptionsContainer.addEventListener("click", async (e) => {
  if (e.target.classList.contains("poll-option-btn")) {
    selectedPollOption = e.target.dataset.value;

    document.querySelectorAll(".poll-option-btn").forEach(b => b.classList.remove("selected"));
    e.target.classList.add("selected");

    // Auto-submit for simplicity (or add confirm button)
    try {
      const pollRef = doc(db, "polls", selectedPoll.id);
      await updateDoc(pollRef, {
        [`responses.${selectedPollOption}`]: increment(1)
      });

      await updateDoc(doc(db, "voters", currentUser.uid), {
        pollsVoted: arrayUnion(selectedPoll.id)
      });

      showSection(pollSuccessSection);
    } catch (err) {
      console.error("Poll vote failed:", err);
      alert("Failed to record poll response.");
    }
  }
});

// ────────────────────────────────────────────────
//  Admin Features
// ────────────────────────────────────────────────
async function loadAdminData() {
  // Voters table
  voterTableBody.innerHTML = "";
  const votersSnap = await getDocs(collection(db, "voters"));
  votersSnap.forEach(snap => {
    const d = snap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${snap.id.slice(0,8)}...</td>
      <td>${d.studentId || "—"}</td>
      <td>${d.name || "—"}</td>
      <td>${d.hasVoted ? "Yes" : "No"}</td>
      <td><button class="btn btn-small reset-vote" data-uid="${snap.id}">Reset Vote</button></td>
    `;
    voterTableBody.appendChild(tr);
  });

  // Active polls results
  activePolls.innerHTML = "<h4>Active Polls</h4>";
  const pollsSnap = await getDocs(query(collection(db, "polls"), where("active", "==", true)));
  pollsSnap.forEach(snap => {
    const p = snap.data();
    let html = `<div class="poll-result-item"><strong>${p.question}</strong><ul>`;
    if (p.type === "yesno") {
      html += `<li>Yes: ${p.responses?.yes || 0}</li><li>No: ${p.responses?.no || 0}</li>`;
    } else {
      Object.entries(p.responses || {}).forEach(([opt, count]) => {
        html += `<li>${opt}: ${count}</li>`;
      });
    }
    html += `</ul></div>`;
    activePolls.innerHTML += html;
  });
}

accountForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const sid    = document.getElementById("newStudentNumber").value.trim();
  const name   = document.getElementById("newStudentName").value.trim();
  const pass   = document.getElementById("newStudentPassword").value;
  const cpass  = document.getElementById("confirmStudentPassword").value;

  if (pass !== cpass) {
    accountMessage.textContent = "Passwords do not match.";
    return;
  }

  try {
    const email = `${sid.toLowerCase()}@school.local`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "voters", uid), {
      studentId: sid,
      name,
      hasVoted: false,
      isAdmin: false,
      createdAt: serverTimestamp(),
      pollsVoted: []
    });

    accountMessage.textContent = "Account created successfully!";
    accountForm.reset();
  } catch (err) {
    accountMessage.textContent = err.message.includes("email-already-in-use")
      ? "Student ID already exists."
      : "Error creating account.";
    console.error(err);
  }
});

pollForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = document.getElementById("pollQuestion").value.trim();
  const type = document.getElementById("pollType").value;
  const optionsStr = document.getElementById("pollOptionsInput").value.trim();

  if (!question) return;

  let options = [];
  if (type === "multiple") {
    options = optionsStr.split(",").map(o => o.trim()).filter(Boolean);
    if (options.length < 2) {
      alert("Please provide at least 2 options.");
      return;
    }
  }

  try {
    await addDoc(collection(db, "polls"), {
      question,
      type,
      options: type === "multiple" ? options : [],
      active: true,
      createdAt: serverTimestamp(),
      responses: type === "yesno" ? { yes: 0, no: 0 } : {}
    });

    alert("Poll created!");
    pollForm.reset();
  } catch (err) {
    console.error("Error creating poll:", err);
    alert("Failed to create poll.");
  }
});

// Start
console.log("Student Council Voting System loaded.");