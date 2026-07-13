#!/usr/bin/env python3
import os

file_path = r'c:\prime authority\admin panal\extracted\admin-panel.js'

# Read the current file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if functions already exist
if 'function renderJoinApplicationsTab' in content:
    print('renderJoinApplicationsTab already exists')
elif 'async function updateJoinStatus' in content:
    print('updateJoinStatus already exists')
else:
    # Add the functions at the end of the file, before the last closing brace if any
    
    new_functions = '''
// ═════════════════════════════════════════════════════════════════════════
// JOIN APPLICATIONS RENDERING & MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════

function renderJoinApplicationsTab() {
    const filtered = filterStatus === 'All' 
        ? allData.joins 
        : allData.joins.filter(j => j.status === filterStatus);
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h1 style="color: #fff; font-size: 28px; margin: 0;">📋 Join Applications</h1>
                <p style="color: #888; font-size: 14px; margin: 6px 0 0;">Total: ${allData.joins.length} | Pending: ${allData.joins.filter(j => !j.status || j.status === 'Pending').length}</p>
            </div>
            <select onchange="filterStatus = this.value; renderCurrentTab();" style="padding: 10px 14px; background: #1a1a1a; border: 1px solid #ff2b2b; border-radius: 8px; color: #fff;">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
            </select>
        </div>
        <div style="display: grid; gap: 14px;">
            ${filtered.length === 0 ? '<p style="color: #888; text-align: center; padding: 40px 20px;">No applications.</p>' : filtered.map(j => `
                <div class="card" style="padding: 14px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                        <div><p style="color: #888; font-size: 11px; text-transform: uppercase;">Team</p><p style="color: #fff; font-weight: 700;">${escapeHTML(j.teamName)}</p></div>
                        <div><p style="color: #888; font-size: 11px; text-transform: uppercase;">Manager</p><p style="color: #fff;">${escapeHTML(j.managerIgn)}</p></div>
                        <div><p style="color: #888; font-size: 11px; text-transform: uppercase;">Region</p><p style="color: #fff;">${escapeHTML(j.teamRegion)}</p></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div><p style="color: #888; font-size: 10px;">Players</p><p style="color: #fff;">${j.totalPlayers}</p></div>
                        <div><p style="color: #888; font-size: 10px;">WhatsApp</p><p style="color: #fff; font-size: 12px;">${escapeHTML(j.whatsappContact)}</p></div>
                        <div><p style="color: #888; font-size: 10px;">Email</p><p style="color: #fff; font-size: 12px;">${escapeHTML(j.emailAddress)}</p></div>
                        <div><p style="color: #888; font-size: 10px;">Status</p><p style="color: ${j.status === 'Accepted' ? '#22c55e' : j.status === 'Rejected' ? '#ef4444' : '#f59e0b'}; font-weight: 700;">${j.status || 'Pending'}</p></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${j.status !== 'Accepted' ? `<button onclick="updateJoinStatus('${j.id}', 'Accepted')" style="flex: 1; padding: 6px 10px; background: #22c55e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">✅ Accept</button>` : ''}
                        ${j.status !== 'Rejected' ? `<button onclick="updateJoinStatus('${j.id}', 'Rejected')" style="flex: 1; padding: 6px 10px; background: #ef4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">❌ Reject</button>` : ''}
                        <button onclick="viewJoinEntry('${j.id}')" style="flex: 1; padding: 6px 10px; background: #3b82f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">View</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function updateJoinStatus(joinId, status) {
    try {
        await set(ref(database, `applications/${joinId}/status`), status);
        const joinEntry = allData.joins.find(j => j.id === joinId);
        if (joinEntry && joinEntry.userId) {
            await push(ref(database, `notifications/${joinEntry.userId}`), {
                message: `Your join application status: ${status}`,
                status: status,
                type: 'join_status',
                createdAt: new Date().toISOString()
            });
        }
        await showSuccessModal('Status Updated', `Application marked as ${status}`);
        renderCurrentTab();
    } catch (err) {
        await showErrorModal('Error', 'Could not update status: ' + err.message);
    }
}

function viewJoinEntry(joinId) {
    const entry = allData.joins.find(j => j.id === joinId);
    if (!entry) return;
    currentViewEntry = entry;
    const modal = document.getElementById('viewModal');
    if (!modal) return;
    const detailsDiv = modal.querySelector('.modal-details') || modal.querySelector('.modal-content');
    if (!detailsDiv) return;
    detailsDiv.innerHTML = `
        <h2 style="color: #fff; margin-bottom: 16px;">📋 Join Application Details</h2>
        <div style="display: grid; gap: 12px; font-size: 14px;">
            <div><span style="color: #888;">Team Name:</span> <span style="color: #fff; font-weight: 700;">${escapeHTML(entry.teamName)}</span></div>
            <div><span style="color: #888;">Manager IGN:</span> <span style="color: #fff;">${escapeHTML(entry.managerIgn)}</span></div>
            <div><span style="color: #888;">Manager Full Name:</span> <span style="color: #fff;">${escapeHTML(entry.managerFullName)}</span></div>
            <div><span style="color: #888;">Region:</span> <span style="color: #fff;">${escapeHTML(entry.teamRegion)}</span></div>
            <div><span style="color: #888;">Total Players:</span> <span style="color: #fff;">${entry.totalPlayers}</span></div>
            <div><span style="color: #888;">Previous Organization:</span> <span style="color: #fff;">${escapeHTML(entry.previousOrganization)}</span></div>
            <div><span style="color: #888;">Tournament Experience:</span> <span style="color: #fff;">${entry.tournamentExperience}</span></div>
            <div><span style="color: #888;">Best Result:</span> <span style="color: #fff;">${escapeHTML(entry.bestTournamentResult)}</span></div>
            <div><span style="color: #888;">Play Time:</span> <span style="color: #fff;">${entry.preferredPlayTime}</span></div>
            <div><span style="color: #888;">WhatsApp:</span> <span style="color: #fff;">${escapeHTML(entry.whatsappContact)}</span></div>
            <div><span style="color: #888;">Email:</span> <span style="color: #fff;">${escapeHTML(entry.emailAddress)}</span></div>
            <div><span style="color: #888;">Status:</span> <span style="color: ${entry.status === 'Accepted' ? '#22c55e' : entry.status === 'Rejected' ? '#ef4444' : '#f59e0b'}; font-weight: 700;">${entry.status || 'Pending'}</span></div>
        </div>
    `;
    modal.classList.add('open');
}
'''
    
    # Append to the file
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write('\n')
        f.write(new_functions)
    
    print('Successfully added all join functions to admin-panel.js')

# Verify
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    if 'function renderJoinApplicationsTab' in content:
        print('✓ renderJoinApplicationsTab added')
    if 'async function updateJoinStatus' in content:
        print('✓ updateJoinStatus added')
    if 'function viewJoinEntry' in content:
        print('✓ viewJoinEntry added')
