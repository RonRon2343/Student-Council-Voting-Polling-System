const db = {
    voters: [
        { voter_id: 1, student_number: "STUDENT1", has_voted: false, password: "pass123", name: "STUDENT 1" },
        { voter_id: 2, student_number: "STUDENT2", has_voted: false, password: "pass123", name: "STUDENT 2" },
        { voter_id: 3, student_number: "STUDENT3", has_voted: true, password: "pass123", name: "STUDENT 3" },
        { voter_id: 4, student_number: "STUDENT4", has_voted: false, password: "pass123", name: "STUDENT 4" },
        { voter_id: 5, student_number: "STUDENT5", has_voted: false, password: "pass123", name: "STUDENT 5" },
        { voter_id: 99, student_number: "admin", has_voted: false, password: "admin123", name: "Administrator", isAdmin: true }
    ],

    candidates: [
        // President
        { candidate_id: 1, name: "Marc Justine Batuan", position: "President", platform_text: "Improving campus sustainability and mental health resources", },
        { candidate_id: 2, name: "Khen Andrie Omaga", position: "President", platform_text: "Enhancing sports facilities and student club funding",},
        // Vice President
        { candidate_id: 3, name: "Jake Lester Manalansan", position: "Vice President", platform_text: "Academic support programs and career counseling", },
        { candidate_id: 4, name: "Arel Pea", position: "Vice President", platform_text: "Technology upgrades and digital library resources", },
        // Secretary
        { candidate_id: 5, name: "Cyrus Ace Desucatan", position: "Secretary", platform_text: "Efficient meeting documentation and student communication", },
        { candidate_id: 6, name: "Justin Kim Esguerra", position: "Secretary", platform_text: "Digital record keeping and transparency initiatives", },
        // Treasurer
        { candidate_id: 7, name: "John Dave Mallari", position: "Treasurer", platform_text: "Budget transparency and fundraising optimization", },
        { candidate_id: 8, name: "Francis Ace Sapico", position: "Treasurer", platform_text: "Financial literacy programs and grant applications", },
        // Auditor
        { candidate_id: 9, name: "Aloha Asparo", position: "Auditor", platform_text: "Accountability and ethical financial oversight", },
        { candidate_id: 10, name: "Ashlimae Cabuguang", position: "Auditor", platform_text: "Regular audits and compliance monitoring", },
        // PIO (Public Information Officer)
        { candidate_id: 11, name: "Shan Cyrus Sapurna", position: "PIO", platform_text: "Social media engagement and event promotion", },
        { candidate_id: 12, name: "Rian Carabeo Galves", position: "PIO", platform_text: "Student newsletter and inter-school communication", }
    ],

    votes: [],
    polls: [
        { 
            poll_id: 1, 
            question: "Should we extend the library hours on weekends?", 
            type: "yesno", 
            created_by: 99, 
            is_active: true, 
            created_at: "2026-03-01T10:00:00Z" 
        },
        { 
            poll_id: 2, 
            question: "What is your favorite school event?", 
            type: "multiple", 
            created_by: 99, 
            is_active: true, 
            created_at: "2026-03-05T14:30:00Z",
            options: ["Sports Day", "Science Fair", "Art Exhibition", "Music Festival"]
        }
    ],
    poll_responses: []
};

const POSITIONS = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "PIO"];

let currentUser = null;
let currentBallot = {};
let currentPositionIndex = 0;
let selectedCandidate = null;
let selectedPoll = null;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateResults();
    updateTableCounts();
});

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('pollForm').addEventListener('submit', handleCreatePoll);
    document.getElementById('accountForm').addEventListener('submit', handleCreateAccount);
    document.getElementById('pollType').addEventListener('change', (e) => {
        const optionsDiv = document.getElementById('pollOptions');
        optionsDiv.style.display = e.target.value === 'multiple' ? 'block' : 'none';
    });
}

// Account Maker Function
function handleCreateAccount(e) {
    e.preventDefault();
    
    const studentNumber = document.getElementById('newStudentNumber').value.trim();
    const name = document.getElementById('newStudentName').value.trim();
    const password = document.getElementById('newStudentPassword').value;
    const confirmPassword = document.getElementById('confirmStudentPassword').value;
    const messageEl = document.getElementById('accountMessage');
    
    // Validation
    if (!studentNumber || !name || !password) {
        messageEl.textContent = 'Please fill in all fields.';
        messageEl.className = 'message error';
        return;
    }
    
    if (password !== confirmPassword) {
        messageEl.textContent = 'Passwords do not match.';
        messageEl.className = 'message error';
        return;
    }
    
    if (password.length < 6) {
        messageEl.textContent = 'Password must be at least 6 characters.';
        messageEl.className = 'message error';
        return;
    }
    
    // Check for duplicate student number
    const exists = db.voters.find(v => v.student_number.toLowerCase() === studentNumber.toLowerCase());
    if (exists) {
        messageEl.textContent = 'Student number already exists.';
        messageEl.className = 'message error';
        return;
    }
    
    // Create new voter account
    const newVoter = {
        voter_id: db.voters.length + 1,
        student_number: studentNumber,
        name: name,
        password: password,
        has_voted: false,
        isAdmin: false
    };
    
    db.voters.push(newVoter);
    
    // Success message
    messageEl.textContent = `Account created successfully for ${name} (${studentNumber})`;
    messageEl.className = 'message success';
    
    // Clear form
    document.getElementById('accountForm').reset();
    
    // Update displays
    updateTableCounts();
    renderVoterTable();
    
    // Clear success message after 3 seconds
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 3000);
}

function renderVoterTable() {
    const tbody = document.getElementById('voterTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Filter out admin from the table
    const votersOnly = db.voters.filter(v => !v.isAdmin);
    
    votersOnly.forEach(voter => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${voter.voter_id}</td>
            <td>${voter.student_number}</td>
            <td>${voter.name}</td>
            <td>
                <span class="status-badge ${voter.has_voted ? 'voted' : 'not-voted'}">
                    ${voter.has_voted ? 'Yes' : 'No'}
                </span>
            </td>
            <td>
                <button class="btn btn-danger btn-small" onclick="deleteVoter(${voter.voter_id})" 
                    ${voter.has_voted ? 'disabled' : ''}>
                    Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function deleteVoter(voterId) {
    if (!confirm('Are you sure you want to delete this voter?')) return;
    
    const index = db.voters.findIndex(v => v.voter_id === voterId);
    if (index > -1 && !db.voters[index].has_voted) {
        db.voters.splice(index, 1);
        updateTableCounts();
        renderVoterTable();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('loginMessage');
    
    const user = db.voters.find(v => v.student_number === studentId && v.password === password);
    
    if (!user) {
        messageEl.textContent = 'Invalid credentials. Please try again.';
        messageEl.className = 'message error';
        return;
    }
    
    if (user.has_voted && !user.isAdmin) {
        messageEl.textContent = 'You have already submitted your ballot.';
        messageEl.className = 'message error';
        return;
    }
    
    currentUser = user;
    messageEl.textContent = '';
    
    if (user.isAdmin) {
        showSection('adminSection');
        updateResults();
        renderActivePolls();
        updateTableCounts();
        renderVoterTable();
    } else {
        currentBallot = {};
        currentPositionIndex = 0;
        document.getElementById('voterName').textContent = user.name;
        updateProgress();
        renderCandidatesForPosition();
        renderVoterPolls();
        showSection('votingSection');
    }
}

function updateProgress() {
    const progress = ((currentPositionIndex) / POSITIONS.length) * 100;
    document.getElementById('votingProgress').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `Step ${currentPositionIndex + 1} of ${POSITIONS.length}: ${POSITIONS[currentPositionIndex]}`;
    document.getElementById('positionTitle').textContent = 
        `Vote for ${POSITIONS[currentPositionIndex]}`;
}

function renderCandidatesForPosition() {
    const position = POSITIONS[currentPositionIndex];
    const container = document.getElementById('candidatesList');
    container.innerHTML = '';
    
    const candidates = db.candidates.filter(c => c.position === position);
    
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        
        const isSelected = currentBallot[position] === candidate.candidate_id;
        if (isSelected) {
            card.style.borderColor = 'var(--primary-green)';
            card.style.background = '#e8f5e9';
        }
        
        card.innerHTML = `
            <div class="candidate-image">👤</div>
            <div class="candidate-info">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.position}</div>
                <div class="candidate-platform">${candidate.platform_text}</div>
            </div>
        `;
        card.onclick = () => selectCandidate(candidate);
        container.appendChild(card);
    });
}

function selectCandidate(candidate) {
    selectedCandidate = candidate;
    document.getElementById('selectedCandidate').innerHTML = `
        <h3>${candidate.name}</h3>
        <p><strong>Position:</strong> ${candidate.position}</p>
        <p>${candidate.platform_text}</p>
    `;
    showSection('confirmationSection');
}

function confirmVote() {
    if (!selectedCandidate) return;
    
    currentBallot[selectedCandidate.position] = selectedCandidate.candidate_id;
    selectedCandidate = null;
    
    currentPositionIndex++;
    
    if (currentPositionIndex < POSITIONS.length) {
        updateProgress();
        renderCandidatesForPosition();
        showSection('votingSection');
    } else {
        showBallotReview();
    }
}

function showBallotReview() {
    const container = document.getElementById('ballotReview');
    container.innerHTML = '';
    
    POSITIONS.forEach((position, index) => {
        const candidateId = currentBallot[position];
        const candidate = db.candidates.find(c => c.candidate_id === candidateId);
        
        const item = document.createElement('div');
        item.className = 'ballot-item';
        item.innerHTML = `
            <div>
                <div class="position">${position}</div>
                <div class="candidate">${candidate ? candidate.name : 'Not selected'}</div>
            </div>
            <button class="change-btn" onclick="changePosition(${index})">Change</button>
        `;
        container.appendChild(item);
    });
    
    showSection('reviewSection');
}

function changePosition(index) {
    currentPositionIndex = index;
    updateProgress();
    renderCandidatesForPosition();
    showSection('votingSection');
}

function editBallot() {
    currentPositionIndex = 0;
    updateProgress();
    renderCandidatesForPosition();
    showSection('votingSection');
}

function submitFinalBallot() {
    if (!currentUser) return;
    
    const missing = POSITIONS.filter(p => !currentBallot[p]);
    if (missing.length > 0) {
        alert('Please select candidates for all positions: ' + missing.join(', '));
        return;
    }
    
    POSITIONS.forEach(position => {
        const vote = {
            vote_id: db.votes.length + 1,
            candidate_id: currentBallot[position],
            voter_id: currentUser.voter_id,
            position: position,
            timestamp: new Date().toISOString()
        };
        db.votes.push(vote);
        Object.seal(db.votes[db.votes.length - 1]);
    });
    
    const voterIndex = db.voters.findIndex(v => v.voter_id === currentUser.voter_id);
    db.voters[voterIndex].has_voted = true;
    currentUser.has_voted = true;
    
    showSection('successSection');
    updateResults();
    updateTableCounts();
}

function backToVoting() {
    selectedCandidate = null;
    selectedPoll = null;
    if (currentPositionIndex < POSITIONS.length) {
        showSection('votingSection');
    } else {
        showBallotReview();
    }
}

function logout() {
    currentUser = null;
    currentBallot = {};
    currentPositionIndex = 0;
    selectedCandidate = null;
    selectedPoll = null;
    document.getElementById('loginForm').reset();
    document.getElementById('loginMessage').textContent = '';
    showSection('loginSection');
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

function renderVoterPolls() {
    const container = document.getElementById('voterPollsList');
    if (!container) return;
    container.innerHTML = '';
    
    const activePolls = db.polls.filter(p => p.is_active);
    
    if (activePolls.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No active polls available</p>';
        return;
    }
    
    activePolls.forEach(poll => {
        const hasVoted = db.poll_responses.some(
            r => r.poll_id === poll.poll_id && r.voter_id === currentUser.voter_id
        );
        
        const card = document.createElement('div');
        card.className = `poll-card ${hasVoted ? 'voted' : ''}`;
        
        const optionsText = poll.type === 'yesno' ? 'Yes / No' : (poll.options ? poll.options.join(', ') : 'Multiple Choice');
        
        card.innerHTML = `
            <div class="poll-icon"></div>
            <div class="poll-info">
                <span class="poll-type">${poll.type === 'yesno' ? 'Yes/No Poll' : 'Multiple Choice'}</span>
                <span class="poll-status ${hasVoted ? 'voted' : 'pending'}">${hasVoted ? '✓ Voted' : 'Pending'}</span>
                <div class="poll-question">${poll.question}</div>
                <div style="color: #666; font-size: 0.9em; margin-top: 8px;">
                    Options: ${optionsText}
                </div>
            </div>
        `;
        
        if (!hasVoted) {
            card.onclick = () => openPollVote(poll);
        }
        
        container.appendChild(card);
    });
}

function openPollVote(poll) {
    selectedPoll = poll;
    document.getElementById('pollVoteInfo').innerHTML = `
        <h3>${poll.question}</h3>
        <p><strong>Type:</strong> ${poll.type === 'yesno' ? 'Yes / No' : 'Multiple Choice'}</p>
    `;
    
    const optionsContainer = document.getElementById('pollOptionsContainer');
    optionsContainer.innerHTML = '';
    
    let options = [];
    if (poll.type === 'yesno') {
        options = ['Yes', 'No'];
    } else if (poll.options) {
        options = poll.options;
    }
    
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-option';
        btn.textContent = option;
        btn.onclick = () => submitPollResponse(option);
        optionsContainer.appendChild(btn);
    });
    
    showSection('pollVoteSection');
}

function submitPollResponse(response) {
    if (!selectedPoll || !currentUser) return;
    
    const pollResponse = {
        response_id: db.poll_responses.length + 1,
        poll_id: selectedPoll.poll_id,
        voter_id: currentUser.voter_id,
        response: response,
        timestamp: new Date().toISOString()
    };
    
    db.poll_responses.push(pollResponse);
    Object.seal(db.poll_responses[db.poll_responses.length - 1]);
    
    showSection('pollSuccessSection');
    updateTableCounts();
    
    if (document.getElementById('adminSection').classList.contains('active')) {
        renderActivePolls();
    }
}

function updateResults() {
    const container = document.getElementById('resultsChart');
    if (!container) return;
    
    container.innerHTML = '';
    
    POSITIONS.forEach(position => {
        const positionCandidates = db.candidates.filter(c => c.position === position);
        const positionVotes = db.votes.filter(v => v.position === position);
        const totalVotes = positionVotes.length;
        
        const positionGroup = document.createElement('div');
        positionGroup.className = 'position-group';
        
        let positionHtml = `<div class="position-title">${position}</div>`;
        
        positionCandidates.forEach(candidate => {
            const count = positionVotes.filter(v => v.candidate_id === candidate.candidate_id).length;
            const percentage = totalVotes > 0 ? (count / totalVotes * 100).toFixed(1) : 0;
            
            positionHtml += `
                <div class="result-bar">
                    <div class="result-label">
                        <span>${candidate.name}</span>
                        <span>${count} votes (${percentage}%)</span>
                    </div>
                    <div class="result-progress">
                        <div class="result-fill" style="width: ${percentage}%">
                            ${percentage > 15 ? percentage + '%' : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (totalVotes === 0) {
            positionHtml += '<p style="color: #999; font-size: 0.9em;">No votes yet</p>';
        }
        
        positionGroup.innerHTML = positionHtml;
        container.appendChild(positionGroup);
    });
}

function handleCreatePoll(e) {
    e.preventDefault();
    
    const question = document.getElementById('pollQuestion').value;
    const type = document.getElementById('pollType').value;
    const optionsInput = document.getElementById('pollOptionsInput').value;
    
    const newPoll = {
        poll_id: db.polls.length + 1,
        question: question,
        type: type,
        created_by: currentUser.voter_id,
        is_active: true,
        created_at: new Date().toISOString(),
        options: type === 'yesno' ? ['Yes', 'No'] : optionsInput.split(',').map(o => o.trim()).filter(o => o)
    };
    
    db.polls.push(newPoll);
    document.getElementById('pollForm').reset();
    renderActivePolls();
    updateTableCounts();
    
    alert('Poll created successfully!');
}

function renderActivePolls() {
    const container = document.getElementById('activePolls');
    if (!container) return;
    
    if (db.polls.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No active polls</p>';
        return;
    }
    
    container.innerHTML = '';
    db.polls.forEach(poll => {
        const responses = db.poll_responses.filter(r => r.poll_id === poll.poll_id);
        const totalResponses = responses.length;
        
        const optionCounts = {};
        const options = poll.type === 'yesno' ? ['Yes', 'No'] : (poll.options || []);
        options.forEach(opt => optionCounts[opt] = 0);
        responses.forEach(r => {
            if (optionCounts[r.response] !== undefined) {
                optionCounts[r.response]++;
            }
        });
        
        const pollDiv = document.createElement('div');
        pollDiv.className = 'poll-item';
        
        let optionsHtml = '';
        options.forEach(option => {
            const count = optionCounts[option] || 0;
            const pct = totalResponses > 0 ? (count / totalResponses * 100).toFixed(1) : 0;
            
            optionsHtml += `
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                        <span>${option}</span>
                        <span>${count} votes (${pct}%)</span>
                    </div>
                    <div style="height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin-top: 5px;">
                        <div style="height: 100%; width: ${pct}%; background: #4caf50;"></div>
                    </div>
                </div>
            `;
        });
        
        pollDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${poll.question}</strong>
                <span style="font-size: 0.8em; color: #666;">${totalResponses} responses</span>
            </div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                Type: ${poll.type} | Status: ${poll.is_active ? 'Active' : 'Closed'} | ID: ${poll.poll_id}
            </div>
            <div style="margin-top: 10px;">${optionsHtml}</div>
        `;
        container.appendChild(pollDiv);
    });
}

function updateTableCounts() {
    const counts = {
        candidatesCount: db.candidates.length,
        votersCount: db.voters.length,
        votesCount: db.votes.length,
        pollsCount: db.polls.length,
        responsesCount: db.poll_responses.length
    };
    
    Object.keys(counts).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${counts[id]} records`;
    });
}

setInterval(() => {
    if (currentUser && currentUser.isAdmin) {
        updateResults();
        renderActivePolls();
        updateTableCounts();
        renderVoterTable();
    }
}, 5000);