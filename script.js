// ═══ Escaping and icons ═══
function wvEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
window.wvEsc = wvEsc;
var WV_ICONS = {
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sent: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    call: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>'
};
function wvIcon(name, size) {
    var s = size || 16;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (WV_ICONS[name] || '') + '</svg>';
}
window.wvIcon = wvIcon;

// ═══ Notifications and confirmations ═══
// In-app replacements for alert()/confirm(): a toast in the corner and a dialog that
// returns a Promise<boolean>. Browser pop-ups block the page and look unfinished.
(function () {
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function host() {
        var h = document.getElementById('wv-toasts');
        if (!h) { h = document.createElement('div'); h.id = 'wv-toasts'; h.className = 'wv-toasts'; h.setAttribute('role', 'status'); h.setAttribute('aria-live', 'polite'); document.body.appendChild(h); }
        return h;
    }
    window.wvToast = function (message, kind) {
        var text = String(message == null ? '' : message).replace(/^[\s✓✅❌⚠️]+/, '').trim();
        if (!text) return;
        if (!kind) kind = /(error|failed|could not|couldn’t|invalid|not found|unable|denied)/i.test(text) ? 'error' : 'info';
        var t = document.createElement('div');
        t.className = 'wv-toast wv-toast-' + kind;
        t.innerHTML = '<span>' + esc(text).replace(/\n+/g, '<br>') + '</span><button type="button" class="wv-toast-x" aria-label="Dismiss">&times;</button>';
        host().appendChild(t);
        var remove = function () { if (t.parentNode) t.parentNode.removeChild(t); };
        t.querySelector('.wv-toast-x').onclick = remove;
        setTimeout(remove, kind === 'error' ? 7000 : 4500);
    };
    window.wvConfirm = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var wrap = document.createElement('div');
            wrap.className = 'wv-dialog-backdrop';
            wrap.innerHTML = '<div class="wv-dialog" role="alertdialog" aria-modal="true" aria-labelledby="wv-dialog-title">' +
                '<h2 id="wv-dialog-title">' + esc(opts.title || 'Are you sure?') + '</h2>' +
                '<p>' + esc(message).replace(/\n+/g, '<br>') + '</p>' +
                '<div class="wv-dialog-actions"><button type="button" class="wv-btn" data-a="no">' + esc(opts.cancelLabel || 'Cancel') + '</button>' +
                '<button type="button" class="wv-btn ' + (opts.danger ? 'wv-btn-danger' : 'wv-btn-primary') + '" data-a="yes">' + esc(opts.confirmLabel || 'Confirm') + '</button></div></div>';
            document.body.appendChild(wrap);
            var done = function (v) { document.removeEventListener('keydown', onKey); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); resolve(v); };
            var onKey = function (e) { if (e.key === 'Escape') done(false); };
            document.addEventListener('keydown', onKey);
            wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
            wrap.querySelector('[data-a="no"]').onclick = function () { done(false); };
            var yes = wrap.querySelector('[data-a="yes"]');
            yes.onclick = function () { done(true); };
            setTimeout(function () { yes.focus(); }, 0);
        });
    };
})();

// Email Time Modal Functions (defined globally BEFORE DOMContentLoaded)
window.openEmailTimeModal = function() {
    console.log('openEmailTimeModal called');
    const modal = document.getElementById('email-time-modal');
    console.log('Modal element:', modal);
    if (modal) {
        // Load current settings
        try {
            const user = getCurrentUser();
            if (user) {
                const saved = localStorage.getItem(`assistantSettings_${user.id}`);
                if (saved) {
                    try {
                        const settings = JSON.parse(saved);
                        const timeInput = document.getElementById('email-time');
                        const timezoneSelect = document.getElementById('email-timezone');
                        if (timeInput && settings.emailTime) {
                            timeInput.value = settings.emailTime;
                        }
                        if (timezoneSelect && settings.emailTimezone) {
                            timezoneSelect.value = settings.emailTimezone;
                        }
                    } catch (error) {
                        console.error('Error loading email time settings:', error);
                    }
                }
            }
        } catch (error) {
            console.log('getCurrentUser not available yet, continuing...');
        }
        // Use the active class which sets display: flex
        modal.classList.add('active');
        console.log('Modal active class added');
    } else {
        console.error('Email time modal not found in DOM');
    }
};

window.closeEmailTimeModal = function() {
    const modal = document.getElementById('email-time-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.saveEmailTimeSettings = function() {
    const timeInput = document.getElementById('email-time');
    const timezoneSelect = document.getElementById('email-timezone');
    
    if (!timeInput || !timezoneSelect) {
        console.error('Email time inputs not found');
        return;
    }
    
    const time = timeInput.value;
    const timezone = timezoneSelect.value;
    
    // Update display immediately
    updateEmailTimeDisplayGlobal(time, timezone);
    
    // Save to existing settings
    try {
        const user = getCurrentUser();
        if (user) {
            const saved = localStorage.getItem(`assistantSettings_${user.id}`);
            let settings = saved ? JSON.parse(saved) : {};
            settings.emailTime = time;
            settings.emailTimezone = timezone;
            localStorage.setItem(`assistantSettings_${user.id}`, JSON.stringify(settings));
        }
    } catch (error) {
        console.log('getCurrentUser not available, saving anyway');
    }
    
    closeEmailTimeModal();
};

// Global function to update email time display (can be called before DOMContentLoaded)
function updateEmailTimeDisplayGlobal(time, timezone) {
    // Format time (convert 24h to 12h)
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const timeDisplay = `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    
    // Get timezone abbreviation
    const timezoneMap = {
        'America/New_York': 'ET',
        'America/Chicago': 'CT',
        'America/Denver': 'MT',
        'America/Los_Angeles': 'PT',
        'America/Phoenix': 'MST',
        'America/Anchorage': 'AKT',
        'Pacific/Honolulu': 'HST',
        'UTC': 'UTC',
        'Europe/London': 'GMT',
        'Europe/Paris': 'CET',
        'Asia/Tokyo': 'JST',
        'Asia/Shanghai': 'CST',
        'Australia/Sydney': 'AEST'
    };
    const tzAbbr = timezoneMap[timezone] || timezone;
    
    const displayText = `${timeDisplay} ${tzAbbr}`;
    
    // Update display elements
    const displayTime = document.getElementById('display-email-time');
    const displayTimeWeekly = document.getElementById('display-email-time-weekly');
    if (displayTime) {
        displayTime.textContent = displayText;
    }
    if (displayTimeWeekly) {
        displayTimeWeekly.textContent = displayText;
    }
}

// Make it globally accessible
window.updateEmailTimeDisplayGlobal = updateEmailTimeDisplayGlobal;

// Define handleQuickAddSubmit globally BEFORE DOMContentLoaded
// This ensures it's always available
window.handleQuickAddSubmit = function(e) {
    console.log('handleQuickAddSubmit called (global)');
    
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Use window variables to ensure we have the correct values
    const interactionType = window.currentQuickAddType;
    const contactId = window.currentContactIdForQuickAdd;
    console.log('Form submitted, type:', interactionType, 'contactId:', contactId);
    
    const date = document.getElementById('quick-add-date');
    const status = document.getElementById('quick-add-status');
    
    if (!date || !status) {
        console.error('Quick add form elements not found');
        return;
    }
    
    const dateValue = date.value;
    console.log('Date value:', dateValue);
    
    // Ensure hidden required fields don't block submission
    const emailTypeSelect = document.getElementById('quick-email-type');
    if (emailTypeSelect && emailTypeSelect.hasAttribute('required')) {
        emailTypeSelect.removeAttribute('required');
    }
    
    // Handle required attributes based on notes mode (handled by toggle function)
    // No need to manually manage here since toggleQuickAddNotesMode handles it
    
    // Check if interactionType is set
    if (!interactionType) {
        status.textContent = 'Error: Please try opening the form again';
        status.className = 'upload-status error';
        status.style.display = 'block';
        return;
    }
    
    // Check if contact ID is set
    if (!contactId) {
        status.textContent = 'Error: Contact not found. Please try again';
        status.className = 'upload-status error';
        status.style.display = 'block';
        return;
    }
    
    if (!dateValue) {
        status.textContent = 'Please select a date';
        status.className = 'upload-status error';
        status.style.display = 'block';
        console.error('No date value');
        return false;
    }
    
    // Validate date is not in the future (using local time, not UTC)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    if (dateValue > todayString) {
        status.textContent = 'Error: Date cannot be in the future. Please select today or a past date.';
        status.className = 'upload-status error';
        status.style.display = 'block';
        console.error('Date validation failed: future date', dateValue, '>', todayString);
        return false;
    }
    
    console.log('Date validation passed, proceeding with submission');
    
    if (interactionType === 'email-sent' || interactionType === 'email-received') {
        const notes = document.getElementById('quick-email-subject').value.trim();
        
        const contacts = getContacts();
        const contact = contacts.find(c => c.id === contactId);
        
        if (!contact) {
            status.textContent = 'Contact not found';
            status.className = 'upload-status error';
            status.style.display = 'block';
            return;
        }
        
        if (!contact.emails) contact.emails = [];
        
        // Determine direction from interactionType
        const direction = interactionType === 'email-sent' ? 'sent' : 'received';
        
        // Determine if it's cold or follow-up (only for sent emails)
        let emailType = 'received';
        if (direction === 'sent') {
            const sentEmails = contact.emails.filter(e => e.direction === 'sent' || !e.direction);
            emailType = sentEmails.length === 0 ? 'cold' : 'follow-up';
        }
        
        // Add the email
        contact.emails.push({
            date: dateValue,
            direction: direction,
            type: emailType,
            subject: notes || ''
        });
            
        // Update first email date if needed
        if (!contact.firstEmailDate) {
            contact.firstEmailDate = dateValue;
        }
            
        // Update the contact in the array
        const contactIndex = contacts.findIndex(c => c.id === contactId);
        if (contactIndex !== -1) {
            contacts[contactIndex] = contact;
        }
        
        // Save and refresh
        saveContacts(contacts);
        console.log('Email saved, closing modal');
        
        // Save contact ID before clearing
        const savedContactId = contactId;
        
        // Close modal immediately
        const quickAddModal = document.getElementById('quick-add-modal');
        if (quickAddModal) {
            quickAddModal.classList.remove('active');
            console.log('Modal closed');
        }
        
        // Reset form
        const quickAddForm = document.getElementById('quick-add-form');
        if (quickAddForm) {
            quickAddForm.reset();
        }
        
        // Clear status
        if (status) {
            status.textContent = '';
            status.className = '';
            status.style.display = 'none';
        }
        
        // Clear variables
        window.currentQuickAddType = null;
        window.currentContactIdForQuickAdd = null;
        
        // Then refresh the contact detail view to show the new email on timeline
        // Use a small delay to ensure modal closes first
        setTimeout(() => {
            if (savedContactId && typeof showContactDetail === 'function') {
                console.log('Refreshing contact detail for:', savedContactId);
                showContactDetail(savedContactId);
            }
        }, 150);
    } else if (interactionType === 'call') {
        console.log('Processing call interaction, mode:', quickAddNotesMode);
        
        let notesText = null;
        let notesFile = null;
        
        // Get the appropriate input based on mode
        if (quickAddNotesMode === 'text') {
            notesText = document.getElementById('quick-notes-text').value.trim();
            if (!notesText) {
                status.textContent = 'Please enter call notes';
                status.className = 'upload-status error';
                status.style.display = 'block';
                console.error('No notes provided');
                return;
            }
        } else {
            notesFile = document.getElementById('quick-notes-image').files[0];
            if (!notesFile) {
                status.textContent = 'Please upload an image';
                status.className = 'upload-status error';
                status.style.display = 'block';
                console.error('No image provided');
                return;
            }
        }
        
        console.log('Call notes - Mode:', quickAddNotesMode, 'Text:', notesText ? 'Yes' : 'No', 'Image:', notesFile ? 'Yes' : 'No');
        
        // Show processing status immediately
        status.textContent = notesFile ? 'Processing image with AI...' : 'Adding call notes...';
        status.className = 'upload-status';
        status.style.display = 'block';
        
        console.log('Calling processCallNotes with:', {
            hasFile: !!notesFile,
            hasText: !!notesText,
            contactId: contactId,
            date: dateValue
        });
        
        // Use the same processCallNotes function that the "Add Contact" tab uses
        // This will handle both text and image processing with AI
        processCallNotes(notesFile, contactId, dateValue, notesText)
            .then(() => {
                // Success - processCallNotes will handle closing modal and refreshing view
                console.log('Call notes processed successfully');
            })
            .catch((error) => {
                console.error('Error processing call notes:', error);
                // Error is already handled in processCallNotes, but ensure status is visible
                if (status) {
                    status.style.display = 'block';
                }
            });
    } else {
        console.log('Unknown interaction type:', interactionType);
        status.textContent = 'Error: Unknown interaction type';
        status.className = 'upload-status error';
        status.style.display = 'block';
    }
};

// Show / hide landing page vs app container
function showAppView() {
    var landing = document.getElementById('landing-page');
    var app = document.getElementById('app-container');
    if (landing) landing.style.display = 'none';
    if (app) app.style.display = 'block';
}
function showLandingView() {
    var landing = document.getElementById('landing-page');
    var app = document.getElementById('app-container');
    if (landing) landing.style.display = '';
    if (app) app.style.display = 'none';
}

// Update sidebar user info
function updateSidebarUser() {
    var user = getCurrentUser();
    var avatarEl = document.getElementById('sb-avatar-initials');
    var nameEl = document.getElementById('sb-user-name');
    var planEl = document.getElementById('sb-plan-display');
    if (user) {
        var settings = typeof getUserSettings === 'function' ? getUserSettings() : {};
        var displayName = typeof getUserDisplayName === 'function' ? getUserDisplayName() : (user.email || '').split('@')[0];
        var initials = typeof getInitials === 'function' ? getInitials() : (user.email || '').substring(0, 2).toUpperCase();

        if (avatarEl) {
            if (settings.profilePhoto) {
                avatarEl.innerHTML = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(String(settings.profilePhoto)) ? '<img src="' + settings.profilePhoto + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : escapeHtmlClub(initials);
            } else {
                avatarEl.textContent = initials;
            }
        }
        if (nameEl) nameEl.textContent = displayName || user.email || 'User';
        if (planEl) planEl.textContent = ((user.plan && user.plan.label) || (hasActiveSubscription(user) ? 'Pro' : 'Starter')) + ' plan';
    } else {
        if (avatarEl) avatarEl.textContent = '--';
        if (nameEl) nameEl.textContent = 'User';
        if (planEl) planEl.textContent = '';
    }
}

// On page load: render from the local copy right away, then confirm the session
// with the server. If it has ended, return to the landing page.
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showLandingView();
        return;
    }
    enterApp({ sessionVerified: false });
    refreshSessionUser().then(function (u) {
        if (!u) {
            endSession('Your session ended. Sign in again to continue.');
            return;
        }
        updateSidebarUser();
        if (window.wvApplyRole) window.wvApplyRole();
        maybeShowOnboarding();
    });
}

// Dashboard
function updateDashboard() {
    var contacts = getContacts();
    var totalContacts = contacts.length;

    // Total distinct firms
    var firmSet = {};
    for (var i = 0; i < contacts.length; i++) {
        var f = (contacts[i].firm || '').trim();
        if (f && f !== 'N/A') firmSet[f.toLowerCase()] = f;
    }
    var firmNames = Object.keys(firmSet);
    var totalFirms = firmNames.length;

    // Response rate: contacts that have at least one received email
    var contactsWithResponse = 0;
    var totalEmails = 0;
    var totalCalls = 0;
    var totalVIP = 0;
    var overdueCount = 0;
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var newThisMonth = 0;

    for (var i = 0; i < contacts.length; i++) {
        var c = contacts[i];
        var emails = c.emails || [];
        var notes = c.notes || [];
        var sentCount = 0;
        var receivedCount = 0;

        for (var j = 0; j < emails.length; j++) {
            totalEmails++;
            if (emails[j].type === 'received' || emails[j].direction === 'received') {
                receivedCount++;
            } else {
                sentCount++;
            }
        }
        totalCalls += notes.length;
        if (receivedCount > 0) contactsWithResponse++;
        if (c.vip) totalVIP++;

        // Overdue: last contact > 30 days ago
        var lastDate = null;
        for (var j = 0; j < emails.length; j++) {
            var d = new Date(emails[j].date);
            if (!lastDate || d > lastDate) lastDate = d;
        }
        for (var j = 0; j < notes.length; j++) {
            var d = new Date(notes[j].date);
            if (!lastDate || d > lastDate) lastDate = d;
        }
        if (c.firstEmailDate) {
            var fed = new Date(c.firstEmailDate);
            if (!lastDate || fed > lastDate) lastDate = fed;
        }
        if (lastDate) {
            var daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (daysSince > 30) overdueCount++;
        }

        // New this month
        if (c.firstEmailDate) {
            var fed = new Date(c.firstEmailDate);
            if (fed >= monthStart) newThisMonth++;
        }
    }

    var responseRate = totalContacts > 0 ? Math.round((contactsWithResponse / totalContacts) * 100) : 0;
    var avgEmails = totalContacts > 0 ? (totalEmails / totalContacts).toFixed(1) : '0';

    // Update stat cards
    var el;
    el = document.getElementById('dash-total-contacts'); if (el) el.textContent = totalContacts;
    el = document.getElementById('dash-total-firms'); if (el) el.textContent = totalFirms;
    el = document.getElementById('dash-response-rate'); if (el) el.textContent = responseRate + '%';
    el = document.getElementById('dash-overdue'); if (el) el.textContent = overdueCount;
    el = document.getElementById('dash-vip-count'); if (el) el.textContent = totalVIP;
    el = document.getElementById('dash-total-emails'); if (el) el.textContent = totalEmails;
    el = document.getElementById('dash-total-calls'); if (el) el.textContent = totalCalls;
    el = document.getElementById('dash-avg-emails'); if (el) el.textContent = avgEmails;
    el = document.getElementById('dash-new-month'); if (el) el.textContent = newThisMonth;

    // Greeting
    var user = getCurrentUser();
    var greetEl = document.getElementById('dashboard-greeting');
    if (greetEl && user) {
        var hour = now.getHours();
        var timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        var name = typeof getUserDisplayName === 'function' ? getUserDisplayName() : (user.email || '').split('@')[0];
        greetEl.textContent = timeGreet + (name ? ', ' + name : '');
    }

    // Bar chart: last 6 months activity
    var barChart = document.getElementById('dash-bar-chart');
    if (barChart) {
        var months = [];
        for (var m = 5; m >= 0; m--) {
            var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) });
        }
        var monthData = [];
        for (var m = 0; m < months.length; m++) {
            monthData.push({ sent: 0, received: 0, calls: 0, label: months[m].label });
        }
        for (var i = 0; i < contacts.length; i++) {
            var emails = contacts[i].emails || [];
            var notes = contacts[i].notes || [];
            for (var j = 0; j < emails.length; j++) {
                var ed = new Date(emails[j].date);
                for (var m = 0; m < months.length; m++) {
                    if (ed.getFullYear() === months[m].year && ed.getMonth() === months[m].month) {
                        if (emails[j].type === 'received' || emails[j].direction === 'received') monthData[m].received++;
                        else monthData[m].sent++;
                    }
                }
            }
            for (var j = 0; j < notes.length; j++) {
                var nd = new Date(notes[j].date);
                for (var m = 0; m < months.length; m++) {
                    if (nd.getFullYear() === months[m].year && nd.getMonth() === months[m].month) {
                        monthData[m].calls++;
                    }
                }
            }
        }
        var maxVal = 1;
        for (var m = 0; m < monthData.length; m++) {
            var total = monthData[m].sent + monthData[m].received + monthData[m].calls;
            if (total > maxVal) maxVal = total;
        }
        var chartHtml = '';
        for (var m = 0; m < monthData.length; m++) {
            var d = monthData[m];
            var sentH = Math.max(2, (d.sent / maxVal) * 120);
            var recvH = Math.max(d.received > 0 ? 2 : 0, (d.received / maxVal) * 120);
            var callH = Math.max(d.calls > 0 ? 2 : 0, (d.calls / maxVal) * 120);
            chartHtml += '<div class="dash-bar-group">';
            chartHtml += '<div class="dash-bar-stack">';
            if (d.calls > 0) chartHtml += '<div class="dash-bar" style="height:' + callH + 'px;background:var(--amber);border-radius:4px;"></div>';
            if (d.received > 0) chartHtml += '<div class="dash-bar" style="height:' + recvH + 'px;background:var(--green);border-radius:4px;"></div>';
            chartHtml += '<div class="dash-bar" style="height:' + sentH + 'px;background:var(--blue);border-radius:4px 4px 0 0;"></div>';
            chartHtml += '</div>';
            chartHtml += '<span class="dash-bar-label">' + d.label + '</span>';
            chartHtml += '</div>';
        }
        barChart.innerHTML = chartHtml;
    }

    // Notifications: overdue contacts + VIP needing attention
    var notifEl = document.getElementById('dash-notifications');
    if (notifEl) {
        var notifs = [];
        for (var i = 0; i < contacts.length; i++) {
            var c = contacts[i];
            var lastDate = null;
            var emails = c.emails || [];
            var notes = c.notes || [];
            for (var j = 0; j < emails.length; j++) {
                var d = new Date(emails[j].date);
                if (!lastDate || d > lastDate) lastDate = d;
            }
            for (var j = 0; j < notes.length; j++) {
                var d = new Date(notes[j].date);
                if (!lastDate || d > lastDate) lastDate = d;
            }
            if (c.firstEmailDate) {
                var fed = new Date(c.firstEmailDate);
                if (!lastDate || fed > lastDate) lastDate = fed;
            }
            if (lastDate) {
                var daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                if (daysSince > 30) {
                    notifs.push({ type: 'overdue', name: c.name, firm: c.firm || '', days: daysSince, id: c.id, vip: c.vip });
                }
            }
        }
        notifs.sort(function(a, b) { return (b.vip ? 1 : 0) - (a.vip ? 1 : 0) || b.days - a.days; });
        if (notifs.length === 0) {
            notifEl.innerHTML = '<p class="dash-empty">No follow-ups are due.</p>';
        } else {
            var html = '';
            var shown = Math.min(notifs.length, 5);
            for (var i = 0; i < shown; i++) {
                var n = notifs[i];
                var iconClass = n.vip ? 'vip' : 'overdue';
                var icon = wvIcon(n.vip ? 'star' : 'clock');
                html += '<div class="dash-notif-item" onclick="showContactDetail(\'' + n.id + '\')">';
                html += '<div class="dash-notif-icon ' + iconClass + '">' + icon + '</div>';
                html += '<div class="dash-notif-info">';
                html += '<div class="dash-notif-text">' + wvEsc(n.name) + (n.vip ? ' (VIP)' : '') + '</div>';
                html += '<div class="dash-notif-sub">' + (n.firm ? wvEsc(n.firm) + ', ' : '') + n.days + ' days since last contact</div>';
                html += '</div></div>';
            }
            if (notifs.length > 5) {
                html += '<p style="text-align:center;font-size:12px;color:var(--slate);margin-top:8px;">+ ' + (notifs.length - 5) + ' more overdue</p>';
            }
            notifEl.innerHTML = html;
        }
    }

    // Top firms
    var firmsEl = document.getElementById('dash-firms-list');
    if (firmsEl) {
        var firmCounts = {};
        for (var i = 0; i < contacts.length; i++) {
            var f = (contacts[i].firm || '').trim();
            if (f && f !== 'N/A') {
                var key = f.toLowerCase();
                if (!firmCounts[key]) firmCounts[key] = { name: f, count: 0 };
                firmCounts[key].count++;
            }
        }
        var sorted = Object.values(firmCounts).sort(function(a, b) { return b.count - a.count; });
        if (sorted.length === 0) {
            firmsEl.innerHTML = '<p class="dash-empty">No firms yet.</p>';
        } else {
            var html = '';
            var shown = Math.min(sorted.length, 6);
            for (var i = 0; i < shown; i++) {
                var escapedName = sorted[i].name.replace(/'/g, "\\'");
                html += '<div class="dash-firm-row" onclick="goToFirmFilter(\'' + escapedName + '\')" style="cursor:pointer;">';
                html += '<span class="dash-firm-name">' + escapeHtmlClub(sorted[i].name) + '</span>';
                html += '<span class="dash-firm-count">' + sorted[i].count + '</span>';
                html += '</div>';
            }
            firmsEl.innerHTML = html;
        }
    }
}

window.goToFirmFilter = function(firmName) {
    var firmSelect = document.getElementById('firm-filter');
    if (firmSelect) {
        for (var i = 0; i < firmSelect.options.length; i++) {
            if (firmSelect.options[i].value === firmName) {
                firmSelect.value = firmName;
                break;
            }
        }
    }
    var link = document.querySelector('.nav-link[href="#contacts"]');
    if (link) link.click();
    setTimeout(function() { filterContacts(); }, 50);
};

// Show auth modal, optionally in 'login' or 'signup' mode
function showAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('active');
    }
    if (mode === 'login' && isSignupMode) {
        toggleAuthMode();
    } else if (mode === 'signup' && !isSignupMode) {
        toggleAuthMode();
    }
}
window.openAuthModal = showAuthModal;

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Toggle between login and signup
let isSignupMode = false;
function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    const title = document.getElementById('auth-title');
    const submitText = document.getElementById('auth-submit-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const passwordLabel = document.querySelector('label[for="auth-password"]');
    
    const pw = document.getElementById('auth-password');
    if (isSignupMode) {
        title.textContent = 'Create your Weaver account';
        submitText.textContent = 'Create account';
        toggleLink.textContent = 'Already have an account? Sign in';
        if (passwordLabel) passwordLabel.innerHTML = 'Password <span style="font-size:12px;color:var(--slate);font-weight:400;">at least 8 characters</span>';
        if (pw) { pw.setAttribute('autocomplete', 'new-password'); pw.setAttribute('placeholder', 'Create a password'); }
    } else {
        title.textContent = 'Sign in to Weaver';
        submitText.textContent = 'Sign in';
        toggleLink.textContent = 'New to Weaver? Create an account';
        if (passwordLabel) passwordLabel.textContent = 'Password';
        if (pw) { pw.setAttribute('autocomplete', 'current-password'); pw.setAttribute('placeholder', 'Your password'); }
    }
    
    // Clear form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-status').style.display = 'none';
}

// Clean password: remove whitespace and invisible characters (matches the server)
function cleanPassword(str) {
    if (!str || typeof str !== 'string') return '';
    let s = str.replace(/\s/g, '');
    s = s.replace(/[​-‍﻿]/g, '');
    s = s.replace(/[\x00-\x1F\x7F]/g, '');
    return s;
}

// The server returns the signed-in user with their plan, role and clubs.
function storeSessionUser(u) {
    if (!u) return;
    setCurrentUser({
        id: u.id,
        email: u.email,
        accountType: u.accountType || null,
        role: u.role || 'student',
        plan: u.plan || null,
        orgs: u.orgs || [],
        clubCovered: u.clubCovered === true,
        subscriptionStatus: u.subscriptionStatus || 'free',
        subscriptionPlan: u.subscriptionPlan || null,
        hasBillingAccount: !!u.hasBillingAccount,
        onboardedAt: u.onboardedAt || null
    });
}
window.storeSessionUser = storeSessionUser;

function setAuthStatus(text, kind) {
    const status = document.getElementById('auth-status');
    if (!status) return;
    status.textContent = text;
    status.className = 'upload-status ' + (kind || 'error');
    status.style.display = text ? 'block' : 'none';
}

// Handle auth form submission. Sign-in creates a server session (httpOnly cookie);
// the browser keeps only a copy of the public profile for rendering.
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = cleanPassword(document.getElementById('auth-password').value);
    if (!email || !password) { setAuthStatus('Enter your email and password.'); return; }
    if (isSignupMode && password.length < 8) { setAuthStatus('Use at least 8 characters for your password.'); return; }

    const submitBtn = document.getElementById('auth-submit');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isSignupMode ? 'Creating account…' : 'Signing in…'; }
    setAuthStatus('');

    try {
        const response = await fetch(isSignupMode ? '/api/auth/signup' : '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: weaverTimeoutSignal(20000)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setAuthStatus(data.error || (isSignupMode ? 'Could not create your account.' : 'Could not sign you in.'));
            return;
        }
        storeSessionUser(data.user);
        closeAuthModal();
        if (isSignupMode) {
            // New users choose Student or Manager before entering the app.
            showOnboardingModal();
            return;
        }
        enterApp();
    } catch (error) {
        setAuthStatus(error && error.name === 'AbortError' ? 'The server took too long to respond. Try again.' : 'Could not reach Weaver. Check your connection and try again.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
    }
}

// Show the app immediately and hydrate data in the background.
// opts.sessionVerified: false when entering from a remembered login on page load; the
// server hasn't confirmed the session yet, so onboarding waits until it does.
function enterApp(opts) {
    const verified = !opts || opts.sessionVerified !== false;
    showAppView();
    updateUserDisplay();
    updateSidebarUser();
    updateDashboard();
    filterContacts();
    if (window.wvApplyRole) window.wvApplyRole();
    if (verified) maybeShowOnboarding();
    Promise.allSettled([loadContactsFromAPI(), loadSettingsFromAPI()]).then(() => {
        updateUserDisplay();
        updateSidebarUser();
        updateDashboard();
        filterContacts();
        if (window.renderAssistantHome) window.renderAssistantHome();
    });
}
window.enterApp = enterApp;

// Ask the server who is signed in. Returns the user or null (session expired).
async function refreshSessionUser() {
    try {
        const res = await fetch('/api/auth/me', { signal: weaverTimeoutSignal(8000) });
        if (res.status === 401) return null;
        if (!res.ok) return getCurrentUser();
        const data = await res.json();
        storeSessionUser(data.user);
        return getCurrentUser();
    } catch (e) {
        return getCurrentUser(); // offline: keep the local copy
    }
}
window.refreshSessionUser = refreshSessionUser;

// Update user display
function updateUserDisplay() {
    const currentUser = getCurrentUser();
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay && currentUser) {
        userEmailDisplay.textContent = currentUser.email;
    }
    
    updateSidebarUser();
    
    // Check Gmail connection status
    if (currentUser) {
        checkGmailStatus(currentUser.id);
    }
}

// Check Gmail connection status - always verify with server (database) as source of truth
async function checkGmailStatus(userId) {
    try {
        const response = await fetch(`/api/gmail/status?userId=${userId}`);
        const data = await response.json();
        
        if (data.connected) {
            localStorage.setItem(`weaver_gmail_connected_${userId}`, 'true');
        } else {
            // Server says not connected - clear local state
            // Only clear if server explicitly returned connected: false (not a network error)
            localStorage.removeItem(`weaver_gmail_connected_${userId}`);
        }
    } catch (error) {
        // Network error - don't change local state, keep existing connection status
        // This prevents a temporary network glitch from disconnecting Gmail
        console.log('Could not check Gmail status (keeping existing state):', error.message);
    }
}

// Toggle profile menu
function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    if (menu) {
        const isVisible = menu.style.display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';
        
        // Update menu content
        const menuContent = document.getElementById('profile-menu-content');
        if (menuContent) {
            // Check if Gmail is connected
            const gmailConnected = localStorage.getItem(`weaver_gmail_connected_${currentUser.id}`) === 'true';
            
            // Check subscription status
            const subscriptionStatus = getSubscriptionStatus(currentUser);
            const isPro = hasActiveSubscription(currentUser);
            
            const planLabel = (currentUser.plan && currentUser.plan.label) || (isPro ? 'Pro' : 'Starter');
            const esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
            menuContent.innerHTML = `
                <div class="wv-menu">
                    <div class="wv-menu-head">
                        <div class="wv-menu-email">${esc(currentUser.email)}</div>
                        <div class="wv-menu-plan">${esc(planLabel)} plan</div>
                    </div>
                    <button type="button" class="wv-menu-item" onclick="toggleProfileMenu(); var l=document.querySelector('.nav-link[href=&quot;#settings&quot;]'); if(l) l.click();">Settings and plan</button>
                    ${isPro ? '<button type="button" class="wv-menu-item" onclick="window.openCustomerPortal()">Manage billing</button>' : '<button type="button" class="wv-menu-item" onclick="toggleProfileMenu(); openSubscriptionModal();">Upgrade to Pro</button>'}
                    <button type="button" class="wv-menu-item" onclick="window.logout()">Log out</button>
                </div>
            `;
        }
    }
}

// Logout: end the server session, then clear the local copy.
function logout() {
    fetch('/api/auth/logout', { method: 'POST' }).catch(function () {});
    setCurrentUser(null);
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.style.display = 'none';
    updateUserDisplay();
    updateSidebarUser();
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) contactsList.innerHTML = '';
    showLandingView();
}

// Any API call that finds the session gone signs the user out once, with a message.
(function watchSession() {
    if (window.__wvFetchWrapped || typeof window.fetch !== 'function') return;
    window.__wvFetchWrapped = true;
    var nativeFetch = window.fetch.bind(window);
    var handling = false;
    window.fetch = function (input, init) {
        return nativeFetch(input, init).then(function (res) {
            try {
                var url = typeof input === 'string' ? input : (input && input.url) || '';
                if (res.status === 401 && /\/api\//.test(url) && !/\/api\/auth\/(login|signup|me)/.test(url) && getCurrentUser() && !handling) {
                    handling = true;
                    endSession('Your session ended. Sign in again to continue.');
                    setTimeout(function () { handling = false; }, 2000);
                }
            } catch (e) { /* never break the caller */ }
            return res;
        });
    };
})();

// Gmail connection functions
async function connectGmail() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        wvToast('Please log in first');
        return;
    }

    try {
        console.log('Connecting to Gmail, userId:', currentUser.id);
        
        // Get auth URL from server
        const response = await fetch(`/api/gmail/auth?userId=${currentUser.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Auth URL received:', data);
        
        if (data.authUrl) {
            // Open OAuth window
            const authWindow = window.open(
                data.authUrl,
                'Gmail Auth',
                'width=500,height=600,scrollbars=yes'
            );

            if (!authWindow) {
                wvToast('Popup blocked! Please allow popups for this site and try again.');
                return;
            }

            // Check if window was closed or connection completed
            const checkInterval = setInterval(async () => {
                if (authWindow.closed) {
                    clearInterval(checkInterval);
                    // Check connection status
                    try {
                        const statusResponse = await fetch(`/api/gmail/status?userId=${currentUser.id}`);
                        const statusData = await statusResponse.json();
                        
                        if (statusData.connected) {
                            localStorage.setItem(`weaver_gmail_connected_${currentUser.id}`, 'true');
                            // Refresh profile menu
                            toggleProfileMenu();
                            toggleProfileMenu(); // Toggle twice to refresh
                            wvToast('Gmail connected successfully!');
                        } else {
                            console.log('Gmail not connected yet');
                        }
                    } catch (statusError) {
                        console.error('Error checking status:', statusError);
                    }
                }
            }, 1000);
        } else {
            console.error('No authUrl in response:', data);
            wvToast('Failed to get Gmail authorization URL. Check server logs.');
        }
    } catch (error) {
        console.error('Gmail connection error:', error);
        console.error('Error details:', error.message, error.stack);
        
        // More specific error messages
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Load failed')) {
            wvToast('Cannot connect to server. Please check:\n1. Your internet connection\n2. The server is running\n3. No firewall is blocking the connection\n\nIf the problem persists, check the browser console (F12) for more details.');
        } else {
            wvToast(`Error connecting to Gmail: ${error.message}\n\nCheck the browser console (F12) for more details.`);
        }
    }
}

async function disconnectGmail() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return;
    }

    if (!(await wvConfirm('Weaver will stop reading this Gmail account.', { title: 'Disconnect Gmail?', confirmLabel: 'Disconnect' }))) {
        return;
    }

    try {
        const response = await fetch('/api/gmail/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();
        
        if (data.success) {
            localStorage.removeItem(`weaver_gmail_connected_${currentUser.id}`);
            // Refresh profile menu
            toggleProfileMenu();
            toggleProfileMenu(); // Toggle twice to refresh
            wvToast('Gmail disconnected');
        }
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        wvToast('Error disconnecting Gmail');
    }
}


// Make functions globally accessible for onclick handlers
window.toggleProfileMenu = toggleProfileMenu;

// ============ PLANS & BILLING ============

// Pro = an individual subscription. Club members get their allowance through the club.
function hasActiveSubscription(user) {
    if (!user) return false;
    if (user.plan && user.plan.key) return user.plan.key === 'pro';
    const s = user.subscriptionStatus || 'free';
    return s === 'active' || s === 'trialing';
}

function getSubscriptionStatus(user) {
    if (!user) return 'free';
    return user.subscriptionStatus || 'free';
}

function planContactLimit(user) {
    return (user && user.plan && user.plan.contactLimit) || 20;
}

// Can the user add another contact on their current plan?
function canAddMoreContacts() {
    const user = getCurrentUser();
    if (!user) return false;
    return getContacts().length < planContactLimit(user);
}

var pricingPromise = null;
function loadPricing() {
    if (!pricingPromise) {
        pricingPromise = fetch('/api/stripe/pricing').then(function (r) { return r.json(); }).catch(function () { return null; });
    }
    return pricingPromise;
}

function formatMoney(cents, currency) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'usd').toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100); }
    catch (e) { return '$' + (cents / 100).toFixed(2); }
}

// Plan picker: monthly / quarterly / annual, priced live from Stripe.
function openSubscriptionModal(reason) {
    const modal = document.getElementById('subscription-modal');
    if (!modal) return;
    const body = document.getElementById('wv-plan-picker');
    const user = getCurrentUser();
    const note = document.getElementById('wv-plan-reason');
    if (note) { note.textContent = reason || ''; note.style.display = reason ? 'block' : 'none'; }
    modal.classList.add('active');
    if (!body) return;
    if (hasActiveSubscription(user)) {
        body.innerHTML = '<p class="wv-muted">You’re on Pro. Change or cancel your plan in billing.</p><button type="button" class="wv-btn wv-btn-primary" onclick="openCustomerPortal()">Manage billing</button>';
        return;
    }
    body.innerHTML = '<p class="wv-muted">Loading prices…</p>';
    loadPricing().then(function (p) {
        const pro = (p && p.pro) || {};
        const options = [
            { key: 'monthly', label: 'Monthly', months: 1 },
            { key: 'quarterly', label: 'Quarterly', months: 3 },
            { key: 'annual', label: 'Annual', months: 12 }
        ].filter(function (o) { return pro[o.key]; });
        if (!options.length) {
            body.innerHTML = '<p class="wv-muted">Online checkout isn’t available right now. Email <a href="mailto:info@studentweaver.com">info@studentweaver.com</a> to upgrade.</p>';
            return;
        }
        const monthly = pro.monthly ? pro.monthly.amount : null;
        body.innerHTML = '<div class="wv-plan-options">' + options.map(function (o) {
            const price = pro[o.key];
            const perMonth = Math.round(price.amount / o.months);
            const saving = monthly && o.months > 1 ? Math.round((1 - perMonth / monthly) * 100) : 0;
            return '<button type="button" class="wv-plan-option" data-plan="' + o.key + '">' +
                '<span class="wv-plan-option-name">' + o.label + (saving > 0 ? '<span class="wv-plan-save">Save ' + saving + '%</span>' : '') + '</span>' +
                '<span class="wv-plan-option-price">' + formatMoney(price.amount, price.currency) + '<span> / ' + (o.months === 1 ? 'month' : o.months === 3 ? 'quarter' : 'year') + '</span></span>' +
                (o.months > 1 ? '<span class="wv-plan-option-sub">' + formatMoney(perMonth, price.currency) + ' a month</span>' : '<span class="wv-plan-option-sub">Cancel anytime</span>') +
                '</button>';
        }).join('') + '</div><p class="wv-fine">Promotion codes can be entered at checkout. Prices include all Pro features; usage limits are listed on the Plan page.</p>';
        body.querySelectorAll('.wv-plan-option').forEach(function (b) {
            b.onclick = function () { handleSubscription(b.getAttribute('data-plan'), b); };
        });
    });
}

function updateSubscriptionModalButtons() { /* kept for older callers */ }

function closeSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) modal.classList.remove('active');
}

// Start Stripe Checkout for a Pro plan: 'monthly' | 'quarterly' | 'annual'.
async function handleSubscription(plan, btn) {
    const user = getCurrentUser();
    if (!user) { closeSubscriptionModal(); showAuthModal('login'); return; }
    if (hasActiveSubscription(user)) { wvToast('You’re already on Pro. Manage your plan from Settings.', 'info'); return; }
    if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
    try {
        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan })
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
        window.location.href = data.url;
    } catch (error) {
        wvToast(error.message || 'Could not start checkout. Try again.', 'error');
        if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
    }
}

// Stripe billing portal (change plan, payment method, cancel).
async function openCustomerPortal() {
    try {
        const response = await fetch('/api/stripe/create-portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok || !data.url) throw new Error(data.error || 'Could not open billing.');
        window.location.href = data.url;
    } catch (error) {
        wvToast(error.message || 'Could not open billing. Try again.', 'error');
    }
}

// Re-check the subscription with Stripe (for a payment that hasn't shown up yet).
async function syncMyPlan() {
    try {
        await fetch('/api/users/refresh-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const u = await refreshSessionUser();
        updateSidebarUser();
        if (window.wvRenderPlan) window.wvRenderPlan();
        wvToast(u && u.plan ? 'Your plan: ' + u.plan.label + '.' : 'Plan refreshed.', 'info');
    } catch (error) {
        wvToast('Could not refresh your plan. Try again.', 'error');
    }
}

function updateProfileMenuWithSubscription() { /* the profile menu renders plan details itself */ }

// Shown when a feature needs a larger plan.
function showUpgradePrompt(featureName) {
    openSubscriptionModal(featureName ? featureName + ' needs Pro or a sponsored club plan.' : '');
}

window.openSubscriptionModal = openSubscriptionModal;
window.closeSubscriptionModal = closeSubscriptionModal;
window.handleSubscription = handleSubscription;
window.handleAuth = handleAuth;
window.openCustomerPortal = openCustomerPortal;
window.syncMyPlan = syncMyPlan;
window.showUpgradePrompt = showUpgradePrompt;
window.hasActiveSubscription = hasActiveSubscription;
window.getSubscriptionStatus = getSubscriptionStatus;
window.logout = logout;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.connectGmail = connectGmail;
window.disconnectGmail = disconnectGmail;

// ═══ Settings ═══

function getSettingsKey(userId) {
    return `weaver_settings_${userId}`;
}

function getUserSettings() {
    var user = getCurrentUser();
    if (!user) return {};
    try {
        return JSON.parse(localStorage.getItem(getSettingsKey(user.id)) || '{}');
    } catch (e) { return {}; }
}

function saveUserSettings(settings) {
    var user = getCurrentUser();
    if (!user) return;
    localStorage.setItem(getSettingsKey(user.id), JSON.stringify(settings));
}

function syncSettingsToBackend(settings) {
    var user = getCurrentUser();
    if (!user) return;
    fetch('/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: user.id,
            firstName: settings.firstName || null,
            lastName: settings.lastName || null,
            profilePhoto: settings.profilePhoto || null,
        })
    }).catch(function(err) { console.error('Sync settings to backend failed:', err); });
}

async function loadSettingsFromAPI() {
    var user = getCurrentUser();
    if (!user) return;
    try {
        var res = await fetch('/api/users/settings/' + encodeURIComponent(user.id), { signal: weaverTimeoutSignal(8000) });
        if (!res.ok) return;
        var data = await res.json();
        if (data.success && data.settings) {
            var s = getUserSettings();
            var serverSettings = data.settings;
            if (serverSettings.firstName) s.firstName = serverSettings.firstName;
            if (serverSettings.lastName) s.lastName = serverSettings.lastName;
            if (serverSettings.profilePhoto) s.profilePhoto = serverSettings.profilePhoto;
            if (!serverSettings.firstName && !s.firstName) delete s.firstName;
            if (!serverSettings.lastName && !s.lastName) delete s.lastName;
            if (!serverSettings.profilePhoto && !s.profilePhoto) delete s.profilePhoto;
            saveUserSettings(s);
        }
    } catch (err) {
        console.error('Load settings from API failed:', err);
    }
}

function getUserDisplayName() {
    var s = getUserSettings();
    if (s.firstName && s.lastName) return s.firstName + ' ' + s.lastName;
    if (s.firstName) return s.firstName;
    var user = getCurrentUser();
    return user ? (user.email || '').split('@')[0] : '';
}

function loadSettingsPage() {
    var user = getCurrentUser();
    if (!user) return;
    var s = getUserSettings();

    var fn = document.getElementById('settings-first-name');
    var ln = document.getElementById('settings-last-name');
    var em = document.getElementById('settings-email');
    if (fn) fn.value = s.firstName || '';
    if (ln) ln.value = s.lastName || '';
    if (em) em.value = user.email || '';

    var avatarText = document.getElementById('settings-avatar-text');
    var avatarImg = document.getElementById('settings-avatar-img');
    var removeBtn = document.getElementById('settings-remove-photo');
    if (s.profilePhoto) {
        if (avatarImg) { avatarImg.src = s.profilePhoto; avatarImg.style.display = 'block'; }
        if (avatarText) avatarText.style.display = 'none';
        if (removeBtn) removeBtn.style.display = '';
    } else {
        if (avatarImg) avatarImg.style.display = 'none';
        if (avatarText) { avatarText.style.display = ''; avatarText.textContent = getInitials(); }
        if (removeBtn) removeBtn.style.display = 'none';
    }

    var planBadge = document.getElementById('settings-plan-badge');
    var planBtn = document.getElementById('settings-manage-plan-btn');
    var isPro = hasActiveSubscription(user);
    if (planBadge) {
        planBadge.textContent = isPro ? 'PRO' : 'FREE';
        planBadge.className = 'subscription-badge ' + (isPro ? 'pro' : 'free');
    }
    if (planBtn) {
        planBtn.textContent = isPro ? 'Manage' : 'Upgrade';
        planBtn.onclick = function() {
            if (isPro) { openCustomerPortal(); } else { openSubscriptionModal(); }
        };
    }

    var gmailStatus = document.getElementById('settings-gmail-status');
    var gmailBtn = document.getElementById('settings-gmail-btn');
    var gmailConnected = localStorage.getItem('weaver_gmail_connected_' + user.id) === 'true';
    if (gmailStatus) gmailStatus.textContent = gmailConnected ? 'Connected' : 'Not connected';
    if (gmailStatus) gmailStatus.style.color = gmailConnected ? 'var(--success)' : 'var(--slate)';
    if (gmailBtn) {
        gmailBtn.textContent = gmailConnected ? 'Disconnect' : 'Connect';
        gmailBtn.style.color = gmailConnected ? 'var(--red)' : '';
        gmailBtn.style.borderColor = gmailConnected ? 'var(--red)' : '';
        gmailBtn.onclick = function() {
            if (gmailConnected) { disconnectGmail(); } else { connectGmail(); }
        };
    }

    var statusEl = document.getElementById('settings-status');
    if (statusEl) statusEl.style.display = 'none';
    if (window.wvRenderSettingsExtras) window.wvRenderSettingsExtras();
}

function getInitials() {
    var s = getUserSettings();
    if (s.firstName && s.lastName) return (s.firstName[0] + s.lastName[0]).toUpperCase();
    if (s.firstName) return s.firstName.substring(0, 2).toUpperCase();
    var user = getCurrentUser();
    return user ? (user.email || '').substring(0, 2).toUpperCase() : '--';
}

function initSettingsListeners() {
    var photoInput = document.getElementById('settings-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
                wvToast('Choose a PNG, JPG, GIF or WebP image.', 'error');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                wvToast('Photo must be under 10 MB.', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function(ev) {
                // Resize to a 256px square JPEG (about 30 KB) before saving.
                var img = new Image();
                img.onload = function () {
                    var size = 256, side = Math.min(img.width, img.height);
                    var canvas = document.createElement('canvas');
                    canvas.width = size; canvas.height = size;
                    canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                    var s = getUserSettings();
                    s.profilePhoto = canvas.toDataURL('image/jpeg', 0.85);
                    saveUserSettings(s);
                    syncSettingsToBackend(s);
                    loadSettingsPage();
                    refreshProfileDisplays();
                };
                img.onerror = function () { wvToast('That image could not be read. Try another file.', 'error'); };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    var removeBtn = document.getElementById('settings-remove-photo');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            var s = getUserSettings();
            delete s.profilePhoto;
            saveUserSettings(s);
            syncSettingsToBackend(s);
            loadSettingsPage();
            refreshProfileDisplays();
        });
    }
    var saveBtn = document.getElementById('settings-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            var s = getUserSettings();
            var fn = document.getElementById('settings-first-name');
            var ln = document.getElementById('settings-last-name');
            s.firstName = (fn ? fn.value : '').trim();
            s.lastName = (ln ? ln.value : '').trim();
            saveUserSettings(s);
            syncSettingsToBackend(s);
            refreshProfileDisplays();
            var statusEl = document.getElementById('settings-status');
            if (statusEl) {
                statusEl.textContent = 'Settings saved.';
                statusEl.className = 'upload-status success';
                statusEl.style.display = 'block';
                setTimeout(function() { statusEl.style.display = 'none'; }, 2500);
            }
        });
    }
}

function refreshProfileDisplays() {
    updateSidebarUser();
    updateDashboard();
}

window.loadSettingsPage = loadSettingsPage;
window.getUserDisplayName = getUserDisplayName;
window.getUserSettings = getUserSettings;
window.loadSettingsFromAPI = loadSettingsFromAPI;

// Gmail Label Sync - Review and Process
let gmailLabelEmails = [];
let gmailLabelReviewData = {};

async function syncGmailLabel() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        wvToast('Please log in first');
        return;
    }
    
    const gmailConnected = localStorage.getItem(`weaver_gmail_connected_${currentUser.id}`) === 'true';
    if (!gmailConnected) {
        wvToast('Please connect your Gmail account first');
        return;
    }
    
    // Close profile menu
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
        profileMenu.style.display = 'none';
    }
    
    // Show review modal
    const modal = document.getElementById('gmail-label-review-modal');
    if (modal) {
        modal.classList.add('active');
    }
    
    const content = document.getElementById('gmail-label-review-content');
    if (content) {
        content.innerHTML = '<p>Fetching emails from Gmail "Weaver" label...</p>';
    }
    
    try {
        const response = await fetch(`/api/gmail/sync-label?userId=${currentUser.id}&labelName=Weaver`);
        const data = await response.json();
        
        if (!data.success) {
            // Check if it's a token/connection error - prompt reconnect instead of generic error
            const errMsg = (data.error || '').toLowerCase();
            if (errMsg.includes('not connected') || errMsg.includes('token') || errMsg.includes('auth') || errMsg.includes('invalid_grant') || errMsg.includes('refresh')) {
                localStorage.removeItem(`weaver_gmail_connected_${currentUser.id}`);
                if (content) {
                    content.innerHTML = `
                        <p style="color: #e53e3e; font-weight: 600;">Gmail connection expired.</p>
                        <p style="color: var(--text-medium);">Please reconnect your Gmail account from the profile menu and try again.</p>
                        <button class="btn btn-primary" onclick="connectGmail()" style="margin-top: 1rem;">Reconnect Gmail</button>
                    `;
                }
                return;
            }
            throw new Error(data.error || 'Failed to fetch emails');
        }
        
        if (data.emails.length === 0) {
            content.innerHTML = `
                <p style="color: var(--text-medium);">No emails found in the "Weaver" label.</p>
                <p style="color: var(--text-medium); font-size: 0.9rem;">Make sure you have created a label called "Weaver" in Gmail and added some emails to it.</p>
            `;
            return;
        }
        
        gmailLabelEmails = data.emails;
        
        // Group emails by email address
        const emailGroups = {};
        data.emails.forEach(email => {
            if (!emailGroups[email.email]) {
                emailGroups[email.email] = {
                    email: email.email,
                    name: email.name,
                    emails: []
                };
            }
            emailGroups[email.email].emails.push(email);
        });
        
        // Get existing contacts
        const contacts = getContacts();
        const existingEmails = new Set(contacts.map(c => c.email?.toLowerCase()).filter(Boolean));
        
        // Build review interface
        let html = '<div style="margin-bottom: 1.5rem;">';
        html += `<p><strong>Found ${data.totalMessages} messages with ${Object.keys(emailGroups).length} unique email addresses</strong></p>`;
        html += '</div>';
        
        Object.values(emailGroups).forEach((group, index) => {
            const isExisting = existingEmails.has(group.email.toLowerCase());
            const contactId = isExisting ? contacts.find(c => c.email?.toLowerCase() === group.email.toLowerCase())?.id : null;
            const detectedFirm = group.emails[0]?.firm || null;

            html += `<div class="gmail-email-group" style="border: 1px solid var(--silver-gray); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">`;
            html += `<h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Email address: ${escapeHtmlClub(group.email)}</h3>`;
            if (detectedFirm) {
                html += `<p style="margin: 0 0 0.5rem 0; color: var(--accent-blue); font-weight: 600;">Detected Firm: ${detectedFirm}</p>`;
            }
            html += `<p style="margin: 0 0 1rem 0; color: var(--text-medium); font-size: 0.9rem;">${group.emails.length} email(s) found</p>`;

            // Name confirmation
            html += `<div style="margin-bottom: 1rem;">`;
            html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Name (from email):</label>`;
            html += `<input type="text" id="gmail-name-${index}" value="${escapeHtmlClub(group.name || '')}" placeholder="Enter contact name" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
            html += `<p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-medium);">Is this name correct? Edit if needed.</p>`;
            html += `</div>`;

            // Firm input (pre-filled with detected firm)
            html += `<div style="margin-bottom: 1rem;">`;
            html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Firm/Company:</label>`;
            html += `<input type="text" id="gmail-firm-${index}" value="${(detectedFirm || '').replace(/"/g, '&quot;')}" placeholder="Enter firm name (optional)" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
            html += `<p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-medium);">Auto-detected from email domain. Edit if needed.</p>`;
            html += `</div>`;

            // Contact assignment
            if (isExisting && contactId) {
                const contact = contacts.find(c => c.id === contactId);
                html += `<div style="padding: 0.75rem; background: var(--success-light); border-radius: 4px; margin-bottom: 1rem;">`;
                html += `<p style="margin: 0; font-size: 0.9rem;"><strong>Will add to existing contact:</strong> ${escapeHtmlClub(contact.name)}</p>`;
                html += `</div>`;
                gmailLabelReviewData[group.email] = {
                    action: 'existing',
                    contactId: contactId,
                    name: group.name
                };
            } else {
                html += `<div style="margin-bottom: 1rem;">`;
                html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Action:</label>`;
                html += `<select id="gmail-action-${index}" onchange="updateGmailLabelAction(${index}, ${escapeHtmlClub(JSON.stringify(String(group.email || '')))})" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
                html += `<option value="new">Create a new contact</option>`;
                html += `<option value="existing">Assign to Existing Contact</option>`;
                html += `<option value="skip">Skip</option>`;
                html += `</select>`;
                html += `</div>`;
                
                // Existing contact selector (hidden by default)
                html += `<div id="gmail-existing-select-${index}" style="display: none; margin-bottom: 1rem;">`;
                html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Contact</label>`;
                html += `<select id="gmail-contact-select-${index}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
                contacts.forEach(contact => {
                    html += `<option value="${contact.id}">${escapeHtmlClub(contact.name)}${contact.email ? ` (${escapeHtmlClub(contact.email)})` : ''}</option>`;
                });
                html += `</select>`;
                html += `</div>`;
                
                gmailLabelReviewData[group.email] = {
                    action: 'new',
                    contactId: null,
                    name: group.name
                };
            }
            
            // Email preview
            html += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--silver-gray); border-radius: 4px; padding: 0.5rem; background: var(--bg-light);">`;
            html += `<p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 0.85rem;">Preview</p>`;
            group.emails.slice(0, 5).forEach(email => {
                html += `<div style="padding: 0.25rem 0; font-size: 0.85rem;">`;
                html += `<span style="font-weight: 600;">${email.direction === 'sent' ? 'Sent' : 'Received'}:</span> `;
                html += `<span>${escapeHtmlClub(email.subject || '(No subject)')}</span> `;
                html += `<span style="color: var(--text-medium);">(${escapeHtmlClub(email.date)})</span>`;
                html += `</div>`;
            });
            if (group.emails.length > 5) {
                html += `<p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: var(--text-medium);">... and ${group.emails.length - 5} more</p>`;
            }
            html += `</div>`;
            
            html += `</div>`;
        });
        
        content.innerHTML = html;
        
        // Show action buttons
        const actions = document.getElementById('gmail-label-review-actions');
        if (actions) {
            actions.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error syncing Gmail label:', error);
        if (content) {
            content.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }
}

function updateGmailLabelAction(index, email) {
    const select = document.getElementById(`gmail-action-${index}`);
    const existingSelect = document.getElementById(`gmail-existing-select-${index}`);
    const nameInput = document.getElementById(`gmail-name-${index}`);
    
    if (!select || !gmailLabelReviewData[email]) return;
    
    const action = select.value;
    gmailLabelReviewData[email].action = action;
    
    if (action === 'existing') {
        if (existingSelect) existingSelect.style.display = 'block';
    } else {
        if (existingSelect) existingSelect.style.display = 'none';
    }
}

function closeGmailLabelReviewModal() {
    const modal = document.getElementById('gmail-label-review-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    gmailLabelEmails = [];
    gmailLabelReviewData = {};
}

async function processGmailLabelEmails() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Collect all decisions - group emails by email address
    const emailGroups = {};
    gmailLabelEmails.forEach(email => {
        if (!emailGroups[email.email]) {
            emailGroups[email.email] = [];
        }
        emailGroups[email.email].push(email);
    });

    const contacts = getContacts();
    let processed = 0;
    let skipped = 0;
    let errors = [];

    // Process each email group
    const emailArray = Object.entries(emailGroups);
    for (let index = 0; index < emailArray.length; index++) {
        const [email, emails] = emailArray[index];
        const decision = gmailLabelReviewData[email];

        if (!decision || decision.action === 'skip') {
            skipped += emails.length;
            continue;
        }

        // Get name and firm from inputs
        const nameInput = document.getElementById(`gmail-name-${index}`);
        const firmInput = document.getElementById(`gmail-firm-${index}`);
        const name = nameInput ? nameInput.value.trim() : decision.name || '';
        const firm = firmInput ? firmInput.value.trim() : (emails[0]?.firm || '');

        if (!name && decision.action === 'new') {
            errors.push(`Name required for ${email}`);
            continue;
        }

        let contact;
        let contactIndex = -1;

        if (decision.action === 'existing') {
            const contactSelect = document.getElementById(`gmail-contact-select-${index}`);
            const contactId = contactSelect ? contactSelect.value : decision.contactId;
            contactIndex = contacts.findIndex(c => c.id === contactId);
            contact = contactIndex >= 0 ? contacts[contactIndex] : null;

            if (!contact) {
                errors.push(`Contact not found for ${email}`);
                continue;
            }
            if (firm && !contact.firm) contact.firm = firm;
        } else {
            // Create new contact: use firm from modal input (pre-filled with detection) or from email entry
            const detectedFirm = (firmInput ? firmInput.value.trim() : null) || emails[0]?.firm || null;
            contact = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: name,
                email: email,
                firm: detectedFirm,
                emails: [],
                notes: [],
                createdAt: new Date().toISOString()
            };
            contacts.push(contact);
            contactIndex = contacts.length - 1;
        }

        // Initialize emails array if needed
        if (!contact.emails) contact.emails = [];

        // Add each email to the contact's timeline
        emails.forEach(emailData => {
            // Check if email already exists (same date, direction, and subject)
            const exists = contact.emails.some(e =>
                e.date === emailData.date &&
                e.direction === emailData.direction &&
                (e.subject || '') === (emailData.subject || '')
            );

            if (!exists) {
                // Determine email type based on direction and existing emails
                let emailType = 'received'; // Default for received emails

                if (emailData.direction === 'sent') {
                    // For sent emails, check if it's cold or follow-up
                    const previousSentEmails = contact.emails.filter(e =>
                        e.direction === 'sent' &&
                        e.date < emailData.date
                    );
                    emailType = previousSentEmails.length === 0 ? 'cold' : 'follow-up';
                }

                // Add the email with proper structure
                contact.emails.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    date: emailData.date,
                    direction: emailData.direction,
                    type: emailType,
                    subject: emailData.subject || ''
                });

                processed++;
                console.log(`Added ${emailData.direction} email from ${emailData.date} to ${contact.name}`);
            } else {
                console.log(`Skipped duplicate email for ${contact.name} on ${emailData.date}`);
            }
        });

        // Sort emails by date to ensure proper chronological order
        contact.emails.sort((a, b) => a.date.localeCompare(b.date));

        // Update firstEmailDate to earliest email
        if (contact.emails.length > 0) {
            const sortedEmails = [...contact.emails].sort((a, b) => a.date.localeCompare(b.date));
            contact.firstEmailDate = sortedEmails[0].date;
            console.log(`Set firstEmailDate for ${contact.name}: ${contact.firstEmailDate}`);
        }

        // Update the contact in the contacts array (critical for preserving changes)
        if (contactIndex >= 0) {
            contacts[contactIndex] = contact;
            console.log(`Updated contact ${contact.name} with ${contact.emails.length} total emails`);
        }
    }

    // CRITICAL: Save contacts array (this persists the changes)
    console.log('Saving contacts to localStorage/database...');
    saveContacts(contacts);

    // Update UI
    updateContactDropdown();
    updateFirmFilter();
    displayContacts();

    // Show results
    let message = `Processed ${processed} email(s) successfully.`;
    if (skipped > 0) {
        message += ` Skipped ${skipped} email(s).`;
    }
    if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.join('\n')}`;
    }

    wvToast(message);
    closeGmailLabelReviewModal();

    // Refresh contact list if on contacts page
    if (document.getElementById('contacts') && document.getElementById('contacts').classList.contains('active')) {
        filterContacts();
    }
}

window.syncGmailLabel = syncGmailLabel;
window.closeGmailLabelReviewModal = closeGmailLabelReviewModal;
window.updateGmailLabelAction = updateGmailLabelAction;
window.processGmailLabelEmails = processGmailLabelEmails;

// Close profile menu when clicking outside
document.addEventListener('click', (e) => {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu && profileBtn && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.style.display = 'none';
    }
});

// Navigation functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Returning from Stripe Checkout: refresh the plan, then clean the URL.
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutResult = urlParams.get('checkout');
    if (checkoutResult) window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

    // Check authentication on page load
    checkAuth();

    if (checkoutResult === 'success' && getCurrentUser()) {
        fetch('/api/users/refresh-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .catch(function () {})
            .then(function () { return refreshSessionUser(); })
            .then(function (u) {
                updateSidebarUser();
                if (u && u.plan && u.plan.key === 'pro') wvToast('Welcome to Weaver Pro. Your plan is active.', 'success');
                else wvToast('Payment received. Your plan will update in a moment.', 'info');
                if (window.wvRenderPlan) window.wvRenderPlan();
            });
    } else if (checkoutResult === 'canceled') {
        wvToast('Checkout canceled. You have not been charged.', 'info');
    }

    // Auth form uses onsubmit in HTML (window.handleAuth) so it works even if DOMContentLoaded hasn't finished
    // Close auth modal when clicking outside
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
    // Navigation — sidebar nav links
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (!href) return;
            const targetId = href.substring(1);
            
            // Update active nav link (sidebar)
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Update sidebar active state
            document.querySelectorAll('.sb-item').forEach(item => item.classList.remove('active'));
            if (link.classList.contains('sb-item')) link.classList.add('active');
            
            // Show target section
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                if (targetId === 'dashboard') {
                    updateDashboard();
                }
                
                if (targetId === 'strengthening-net' && typeof updateStrengtheningNet === 'function') {
                    setTimeout(() => {
                        updateStrengtheningNet();
                        if (typeof initNetworkingAssistant === 'function') {
                            initNetworkingAssistant();
                        }
                    }, 100);
                }
                
                if (targetId === 'tips-tricks') {
                    setTimeout(() => initTipsAccordion(), 100);
                }
                
                if (targetId === 'settings' && typeof loadSettingsPage === 'function') {
                    loadSettingsPage();
                }
            }
            
            window.scrollTo(0, 0);
        });
    });

    // goToMyNetwork helper for back button
    window.goToMyNetwork = function() {
        var link = document.querySelector('.nav-link[href="#contacts"]');
        if (link) link.click();
    };

    // Load contacts and settings from the backend in the BACKGROUND (so data persists across
    // devices). Previously this was awaited here, which delayed every event handler attached
    // below — the page rendered but buttons were dead until the server answered.
    if (getCurrentUser()) {
        Promise.allSettled([loadContactsFromAPI(), loadSettingsFromAPI()]).then(function () {
            updateSidebarUser();
            loadContacts();
            updateContactDropdown();
            updateFirmFilter();
            filterContacts();
            updateDashboard();
            var all = getContacts();
            updateContactCount(all.length, all.length);
            if (window.renderAssistantHome) window.renderAssistantHome();
        });
    }
    // Initialize contacts from localStorage
    loadContacts();
    updateContactDropdown();
    updateFirmFilter();
    
    // Initial load should show alphabetical sorting
    filterContacts();
    
    // Refresh dashboard now that contacts are loaded from the server
    if (getCurrentUser()) updateDashboard();
    
    // Initialize contact count on page load
    const allContacts = getContacts();
    updateContactCount(allContacts.length, allContacts.length);
    
    // Debug: Check if spreadsheet elements exist
    console.log('Spreadsheet elements check:', {
        input: !!document.getElementById('spreadsheet-input'),
        button: !!document.getElementById('process-spreadsheet'),
        status: !!document.getElementById('spreadsheet-status')
    });
    
    // Set default call date to today and max date to today (prevent future dates)
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = [
        document.getElementById('call-date'),
        document.getElementById('new-contact-call-date'),
        document.getElementById('new-contact-first-email'),
        document.getElementById('quick-add-date'),
        document.getElementById('timeline-edit-date')
    ];
    
    dateInputs.forEach(input => {
        if (input) {
            input.setAttribute('max', today);
            if (input.id === 'call-date') {
                input.value = today;
            }
        }
    });

    // Search functionality
    const contactSearch = document.getElementById('contact-search');
    contactSearch.addEventListener('input', filterContacts);

    // Firm filter functionality
    const firmFilter = document.getElementById('firm-filter');
    firmFilter.addEventListener('change', filterContacts);

    // Sort by days functionality
    const sortByDays = document.getElementById('sort-by-days');
    sortByDays.addEventListener('change', filterContacts);
    
    // VIP filter functionality
    const vipFilter = document.getElementById('vip-filter');
    if (vipFilter) {
        vipFilter.addEventListener('change', filterContacts);
    }
    

    // Export to Excel
    const exportExcelBtn = document.getElementById('export-excel');
    exportExcelBtn.addEventListener('click', exportToExcel);
    
    // Delete all contacts button
    const deleteAllBtn = document.getElementById('delete-all-contacts');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', deleteAllContacts);
    }

    // Strengthening the Net functionality
    const followUpDaysInput = document.getElementById('follow-up-days');
    const coldEmailFilter = document.getElementById('cold-email-filter');
    
    if (followUpDaysInput) {
        // Update on input change
        followUpDaysInput.addEventListener('input', updateStrengtheningNet);
        // Also update when the section becomes active
        const strengtheningNetSection = document.getElementById('strengthening-net');
        if (strengtheningNetSection) {
            // Use MutationObserver or check on navigation
            const observer = new MutationObserver((mutations) => {
                if (strengtheningNetSection.classList.contains('active')) {
                    updateStrengtheningNet();
                }
            });
            observer.observe(strengtheningNetSection, { attributes: true, attributeFilter: ['class'] });
        }
        // Initial update
        updateStrengtheningNet();
    }
    
    if (coldEmailFilter) {
        coldEmailFilter.addEventListener('change', updateStrengtheningNet);
    }
    
    // VIP filter for Strengthening the Net
    const strengtheningVipFilter = document.getElementById('strengthening-vip-filter');
    if (strengtheningVipFilter) {
        strengtheningVipFilter.addEventListener('change', updateStrengtheningNet);
    }

    // Settings page listeners
    if (typeof initSettingsListeners === 'function') initSettingsListeners();

    // Mobile tab bar navigation
    (function initMobileTabBar() {
        var moreBtn = document.getElementById('mobile-more-btn');
        var moreMenu = document.getElementById('mobile-more-menu');
        var tabBar = document.getElementById('mobile-tab-bar');
        if (!tabBar) return;

        var mobileTabs = tabBar.querySelectorAll('.mobile-tab[data-section]');
        var moreItems = tabBar.querySelectorAll('.mobile-more-item[data-section]');
        var allMobileNavs = tabBar.querySelectorAll('[data-section]');

        function setMobileActive(sectionId) {
            mobileTabs.forEach(function(t) {
                t.classList.toggle('active', t.getAttribute('data-section') === sectionId);
            });
            moreItems.forEach(function(t) {
                t.classList.toggle('active', t.getAttribute('data-section') === sectionId);
            });
            var inMore = false;
            moreItems.forEach(function(t) { if (t.getAttribute('data-section') === sectionId) inMore = true; });
            if (moreBtn) moreBtn.classList.toggle('active', inMore);
        }

        function navigateToSection(sectionId) {
            var sidebarLink = document.querySelector('.nav-link[href="#' + sectionId + '"]');
            if (sidebarLink) {
                sidebarLink.click();
            }
            setMobileActive(sectionId);
            if (moreMenu) moreMenu.classList.remove('open');
        }

        mobileTabs.forEach(function(tab) {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToSection(tab.getAttribute('data-section'));
            });
        });

        moreItems.forEach(function(item) {
            if (!item.getAttribute('data-section')) return;
            item.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToSection(item.getAttribute('data-section'));
            });
        });

        if (moreBtn) {
            moreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (moreMenu) moreMenu.classList.toggle('open');
            });
        }

        document.addEventListener('click', function(e) {
            if (moreMenu && !moreMenu.contains(e.target) && e.target !== moreBtn) {
                moreMenu.classList.remove('open');
            }
        });

        // Keep mobile tabs in sync when sidebar nav is clicked
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function() {
                var href = link.getAttribute('href');
                if (href) setMobileActive(href.substring(1));
            });
        });
    })();

    // Research quotes carousel (arrows + scroll)
    initResearchQuotesScroll();

    // Call notes modal
    const callNotesModal = document.getElementById('call-notes-modal');
    const callNotesClose = callNotesModal.querySelector('.close-modal');
    callNotesClose.addEventListener('click', () => {
        callNotesModal.classList.remove('active');
    });

    // Spreadsheet upload
    const spreadsheetInput = document.getElementById('spreadsheet-input');
    const processSpreadsheetBtn = document.getElementById('process-spreadsheet');
    const processButtonContainer = document.getElementById('process-button-container');
    const spreadsheetStatus = document.getElementById('spreadsheet-status');

    // Check if elements exist
    if (!spreadsheetInput) {
        console.error('spreadsheet-input element not found!');
    }
    if (!processSpreadsheetBtn) {
        console.error('process-spreadsheet button not found!');
    }
    if (!spreadsheetStatus) {
        console.error('spreadsheet-status element not found!');
    }

    // Local function to reset upload state (for use within DOMContentLoaded)
    // Note: The global resetUploadState function is used elsewhere
    function resetUploadStateLocal(clearFile = false, hideButton = false) {
        if (spreadsheetInput && clearFile) {
            spreadsheetInput.value = ''; // Clear file input
        }
        if (spreadsheetStatus && clearFile) {
            spreadsheetStatus.style.display = 'none';
            spreadsheetStatus.textContent = '';
            spreadsheetStatus.className = '';
        }
        if (processSpreadsheetBtn && hideButton) {
            processSpreadsheetBtn.style.display = 'none';
        }
    }

    // Clear error when user clicks to select a file
    spreadsheetInput.addEventListener('click', () => {
        // Clear any previous error messages when user starts selecting a new file
        if (spreadsheetStatus.className.includes('error')) {
            spreadsheetStatus.style.display = 'none';
            spreadsheetStatus.textContent = '';
            spreadsheetStatus.className = '';
        }
    });

    spreadsheetInput.addEventListener('change', (e) => {
        console.log('File input changed');
        const file = e.target.files[0];
        console.log('Selected file:', file ? file.name : 'none');
        
        if (file) {
            // Clear any previous messages/errors when a new file is selected
            spreadsheetStatus.className = '';
            spreadsheetStatus.textContent = `File selected: ${file.name}`;
            spreadsheetStatus.className = 'upload-status success';
            spreadsheetStatus.style.display = 'block';
            
            // Always show the process button container when a file is selected
            if (processButtonContainer) {
                processButtonContainer.style.display = 'block';
                console.log('Process button container should now be visible');
            } else if (processSpreadsheetBtn) {
                // Fallback to showing just the button if container doesn't exist
                processSpreadsheetBtn.style.display = 'block';
                console.log('Process button should now be visible');
            } else {
                console.error('Process spreadsheet button not found!');
            }
        } else {
            // If no file selected, hide button container but keep status if there's an error
            if (processButtonContainer) {
                processButtonContainer.style.display = 'none';
            } else if (processSpreadsheetBtn) {
                processSpreadsheetBtn.style.display = 'none';
            }
        }
    });

    if (processSpreadsheetBtn) {
        processSpreadsheetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Process button clicked');
            
            const file = spreadsheetInput.files[0];
            if (file) {
                console.log('Processing file:', file.name, file.type, file.size);
                processSpreadsheet(file);
            } else {
                console.error('No file selected when button clicked');
                spreadsheetStatus.textContent = 'Please select a file first';
                spreadsheetStatus.className = 'upload-status error';
                spreadsheetStatus.style.display = 'block';
            }
        });
    } else {
        console.error('Process spreadsheet button element not found!');
    }

    // Notes input toggle
    const notesToggleBtns = document.querySelectorAll('.toggle-btn');
    const textNotesMode = document.getElementById('text-notes-mode');
    const imageNotesMode = document.getElementById('image-notes-mode');
    const notesTextInput = document.getElementById('notes-text');
    const notesInput = document.getElementById('notes-input');
    const notesPreview = document.getElementById('notes-preview');
    const processNotesBtn = document.getElementById('process-notes');
    const notesStatus = document.getElementById('notes-status');
    const contactSelect = document.getElementById('contact-select');

    notesToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            
            // Update button states
            notesToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide modes
            textNotesMode.classList.remove('active');
            imageNotesMode.classList.remove('active');
            
            if (mode === 'text') {
                textNotesMode.classList.add('active');
                notesTextInput.required = true;
                notesInput.required = false;
            } else {
                imageNotesMode.classList.add('active');
                notesTextInput.required = false;
                notesInput.required = true;
            }
        });
    });

    notesInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                notesPreview.innerHTML = `<img src="${event.target.result}" alt="Call notes preview">`;
                notesPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    processNotesBtn.addEventListener('click', () => {
        const contactId = contactSelect.value;
        const callDate = document.getElementById('call-date').value;
        const isTextMode = textNotesMode.classList.contains('active');
        const notesText = notesTextInput.value.trim();
        const notesFile = notesInput.files[0];
        
        if (!contactId) {
            notesStatus.textContent = 'Please select a contact first';
            notesStatus.className = 'upload-status error';
            notesStatus.style.display = 'block';
            return;
        }
        
        if (!callDate) {
            notesStatus.textContent = 'Please select a call date';
            notesStatus.className = 'upload-status error';
            notesStatus.style.display = 'block';
            return;
        }
        
        // Validate date is not in the future
        const dateValidation = validateDateNotFuture(callDate, 'Call date');
        if (!dateValidation.valid) {
            notesStatus.textContent = dateValidation.message;
            notesStatus.className = 'upload-status error';
            notesStatus.style.display = 'block';
            return;
        }
        
        if (isTextMode) {
            if (!notesText) {
                notesStatus.textContent = 'Please enter call notes';
                notesStatus.className = 'upload-status error';
                notesStatus.style.display = 'block';
                return;
            }
            processCallNotes(null, contactId, callDate, notesText);
        } else {
            if (!notesFile) {
                notesStatus.textContent = 'Please select an image';
                notesStatus.className = 'upload-status error';
                notesStatus.style.display = 'block';
                return;
            }
            processCallNotes(notesFile, contactId, callDate, null);
        }
    });

    // Mode toggle functionality
    const modeButtons = document.querySelectorAll('.mode-btn');
    const existingMode = document.getElementById('existing-contact-mode');
    const newMode = document.getElementById('new-contact-mode');
    const spreadsheetMode = document.getElementById('spreadsheet-mode');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            
            // Update button states
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide modes
            existingMode.classList.remove('active');
            newMode.classList.remove('active');
            if (spreadsheetMode) spreadsheetMode.classList.remove('active');
            
            if (mode === 'existing') {
                existingMode.classList.add('active');
            } else if (mode === 'new') {
                newMode.classList.add('active');
            } else if (mode === 'spreadsheet' && spreadsheetMode) {
                spreadsheetMode.classList.add('active');
            }
        });
    });

    // New contact form (in section, not modal)
    const newContactForm = document.getElementById('new-contact-form');
    const newContactNotesInput = document.getElementById('new-contact-notes-input');
    const newContactNotesPreview = document.getElementById('new-contact-notes-preview');
    const newContactTextNotesMode = document.getElementById('new-contact-text-notes-mode');
    const newContactImageNotesMode = document.getElementById('new-contact-image-notes-mode');
    let newContactNotesFile = null;
    let newContactNotesMode = 'text'; // 'text' or 'image'

    // Toggle function for new contact notes mode (called from HTML onclick)
    window.toggleNewContactNotesMode = function(mode) {
        newContactNotesMode = mode;
        const toggleBtns = document.querySelectorAll('#new-contact-mode .toggle-btn');
        toggleBtns.forEach(btn => {
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        newContactTextNotesMode.classList.remove('active');
        newContactImageNotesMode.classList.remove('active');
        
        if (mode === 'text') {
            newContactTextNotesMode.classList.add('active');
        } else {
            newContactImageNotesMode.classList.add('active');
        }
    };

    newContactNotesInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            newContactNotesFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                newContactNotesPreview.innerHTML = `<img src="${event.target.result}" alt="Call notes preview">`;
                newContactNotesPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    newContactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Check if user is logged in
        const user = getCurrentUser();
        if (!user) {
            wvToast('Please create a free account to add contacts. It only takes a moment!');
            showAuthModal();
            // Switch to signup mode
            if (typeof toggleAuthMode === 'function') {
                const isSignup = document.getElementById('auth-mode-toggle')?.textContent.includes('Sign up');
                if (!isSignup) {
                    toggleAuthMode();
                }
            }
            return;
        }

        const name = document.getElementById('new-contact-name').value;
        const firm = document.getElementById('new-contact-firm').value;
        const position = document.getElementById('new-contact-position').value;
        const email = document.getElementById('new-contact-email').value;
        const firstEmailDate = document.getElementById('new-contact-first-email').value;
        const priority = document.getElementById('new-contact-priority').value;
        const callDate = document.getElementById('new-contact-call-date').value;
        const notesText = document.getElementById('new-contact-notes-text').value.trim();
        const status = document.getElementById('new-contact-status');

        // Validate dates are not in the future
        if (firstEmailDate) {
            const firstDateValidation = validateDateNotFuture(firstEmailDate, 'First contact date');
            if (!firstDateValidation.valid) {
                status.textContent = firstDateValidation.message;
                status.className = 'upload-status error';
                status.style.display = 'block';
                return;
            }
        }

        if (callDate) {
            const callDateValidation = validateDateNotFuture(callDate, 'Call date');
            if (!callDateValidation.valid) {
                status.textContent = callDateValidation.message;
                status.className = 'upload-status error';
                status.style.display = 'block';
                return;
            }
        }

        const contact = {
            id: Date.now().toString(),
            name,
            firm,
            position,
            email,
            firstEmailDate: firstEmailDate || null,
            numberOfCalls: 0,
            lastEmailDate: null,
            emails: [],
            notes: [],
            priority: priority || 'medium'
        };

        // If firstEmailDate is provided, create a sent email entry for it
        if (firstEmailDate) {
            contact.emails.push({
                date: firstEmailDate,
                direction: 'sent',
                type: 'cold',
                subject: ''
            });
            // Set firstEmailDate
            contact.firstEmailDate = firstEmailDate;
        }

        // If notes were provided (text or image), process them
        if (newContactNotesMode === 'text' && notesText) {
            processCallNotesForNewContact(null, contact, status, callDate, notesText);

            // Clear form after successful processing
            setTimeout(() => {
                clearNewContactForm();
            }, 1500); // Wait for success message to show

        } else if (newContactNotesMode === 'image' && newContactNotesFile) {
            processCallNotesForNewContact(newContactNotesFile, contact, status, callDate, null);

            // Clear form after successful processing
            setTimeout(() => {
                clearNewContactForm();
            }, 1500); // Wait for success message to show

        } else {
            // No notes, just add contact (may return null if free limit reached)
            const result = addContact(contact);

            if (result !== null) {
                // Show success message
                status.textContent = `Contact "${contact.name}" added successfully!`;
                status.className = 'upload-status success';
                status.style.display = 'block';

                // Clear form immediately
                clearNewContactForm();

                // Navigate to contacts view after a brief delay
                setTimeout(() => {
                    document.querySelector('a[href="#contacts"]').click();
                }, 1500);
            }
        }
    });

    // Function to clear the new contact form
    function clearNewContactForm() {
        // Clear all text inputs
        document.getElementById('new-contact-name').value = '';
        document.getElementById('new-contact-email').value = '';
        document.getElementById('new-contact-firm').value = '';
        document.getElementById('new-contact-position').value = '';
        document.getElementById('new-contact-first-email').value = '';
        document.getElementById('new-contact-call-date').value = '';

        // Reset priority to default (medium)
        document.getElementById('new-contact-priority').value = 'medium';

        // Clear notes textarea
        document.getElementById('new-contact-notes-text').value = '';

        // Clear image file input
        const imageInput = document.getElementById('new-contact-notes-input');
        if (imageInput) {
            imageInput.value = '';
        }

        // Hide and clear image preview
        const imagePreview = document.getElementById('new-contact-notes-preview');
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }

        // Clear newContactNotesFile variable
        newContactNotesFile = null;

        // Reset notes mode to text (default)
        newContactNotesMode = 'text';
        toggleNewContactNotesMode('text');

        // Clear status message after a delay
        const status = document.getElementById('new-contact-status');
        if (status) {
            setTimeout(() => {
                status.textContent = '';
                status.className = '';
                status.style.display = 'none';
            }, 3000); // Clear status after 3 seconds
        }

        console.log('New contact form cleared');
    }

    // Make it globally accessible
    window.clearNewContactForm = clearNewContactForm;

    // Subscribe form
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeStatus = document.getElementById('subscribe-status');

    // Guarded: this form no longer exists in index.html. Unguarded, the null access threw
    // here and aborted ALL page initialization below (handlers never attached).
    if (subscribeForm) subscribeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('subscriber-email').value;
        const frequency = document.getElementById('reminder-frequency').value;

        // Simulate subscription
        subscribeStatus.textContent = `Successfully subscribed! You will receive ${frequency} reminders at ${email}`;
        subscribeStatus.className = 'subscribe-status success';
        subscribeStatus.style.display = 'block';
        subscribeForm.reset();

        // In a real application, this would send data to a backend
        console.log('Subscription:', { email, frequency });
    });

    // Tips & Tricks Accordion - function to initialize
    function initTipsAccordion() {
        const tipsAccordion = document.querySelector('.tips-accordion');
        if (!tipsAccordion) {
            return;
        }
        
        const accordionHeaders = tipsAccordion.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach((header) => {
            // Check if already initialized
            if (header.dataset.initialized === 'true') {
                return;
            }
            
            // Mark as initialized
            header.dataset.initialized = 'true';
            
            header.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const accordionItem = this.closest('.accordion-item');
                if (!accordionItem) {
                    return;
                }
                
                const isActive = accordionItem.classList.contains('active');
                const icon = this.querySelector('.accordion-icon');
                
                // Close all accordion items in Tips & Tricks section
                tipsAccordion.querySelectorAll('.accordion-item').forEach(otherItem => {
                    otherItem.classList.remove('active');
                    const otherIcon = otherItem.querySelector('.accordion-icon');
                    if (otherIcon) otherIcon.textContent = '+';
                });
                
                // Open clicked item if it wasn't active
                if (!isActive) {
                    accordionItem.classList.add('active');
                    if (icon) icon.textContent = '−';
                }
            });
        });
    }
    
    // Research Quotes Horizontal Scroll with Manual Control
 function initResearchQuotesScroll() {
    var slider = document.getElementById('rq-slider');
    var track = document.getElementById('rq-track');
    var controls = document.getElementById('rq-controls');
    var prevBtn = document.getElementById('rq-prev');
    var nextBtn = document.getElementById('rq-next');
    if (!slider || !track) return;
    var cards = slider.querySelectorAll('.rq-card');
    var totalCards = cards.length;
    function getVisibleCount() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }
    var visibleCount = getVisibleCount();
    var currentIndex = 0;
    var totalPages = Math.ceil(totalCards / visibleCount);
    var autoInterval = null;
    function buildDots() {
        controls.innerHTML = '';
        totalPages = Math.ceil(totalCards / visibleCount);
        for (var i = 0; i < totalPages; i++) {
            var dot = document.createElement('button');
            dot.className = 'rq-dot' + (i === currentIndex ? ' active' : '');
            (function(idx) { dot.addEventListener('click', function() { goTo(idx); }); })(i);
            controls.appendChild(dot);
        }
    }
    function updateSlider() {
        var gap = 16;
        var trackWidth = track.clientWidth;
        var cardWidth = (trackWidth - (visibleCount - 1) * gap) / visibleCount;
        for (var c = 0; c < cards.length; c++) { cards[c].style.flex = '0 0 ' + cardWidth + 'px'; }
        var offset = currentIndex * (cardWidth + gap) * visibleCount;
        var maxOffset = Math.max(0, (totalCards - visibleCount) * (cardWidth + gap));
        slider.style.transform = 'translateX(-' + Math.min(offset, maxOffset) + 'px)';
        var dots = controls.querySelectorAll('.rq-dot');
        for (var d = 0; d < dots.length; d++) { dots[d].className = 'rq-dot' + (d === currentIndex ? ' active' : ''); }
    }
    function goTo(index) { currentIndex = Math.max(0, Math.min(index, totalPages - 1)); updateSlider(); resetAuto(); }
    function next() { goTo(currentIndex >= totalPages - 1 ? 0 : currentIndex + 1); }
    function prev() { goTo(currentIndex <= 0 ? totalPages - 1 : currentIndex - 1); }
    function resetAuto() { if (autoInterval) clearInterval(autoInterval); autoInterval = setInterval(next, 6000); }
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    track.addEventListener('mouseenter', function() { if (autoInterval) clearInterval(autoInterval); });
    track.addEventListener('mouseleave', resetAuto);
    var resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            var newVisible = getVisibleCount();
            if (newVisible !== visibleCount) { visibleCount = newVisible; currentIndex = 0; buildDots(); }
            updateSlider();
        }, 150);
    });
    buildDots();
    updateSlider();
    resetAuto();
}
    
    // updateEmailTimeDisplay function (defined inside DOMContentLoaded)
    // Uses the global function for consistency
    function updateEmailTimeDisplay(time, timezone) {
        if (typeof updateEmailTimeDisplayGlobal === 'function') {
            updateEmailTimeDisplayGlobal(time, timezone);
        }
    }
    
    // Make updateEmailTimeDisplay globally accessible
    window.updateEmailTimeDisplay = updateEmailTimeDisplay;
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('email-time-modal');
        if (event.target === modal) {
            closeEmailTimeModal();
        }
    });
    
    // Networking Assistant Setup
    function initNetworkingAssistant() {
        const assistantSettings = document.getElementById('assistant-settings');
        const saveButton = document.getElementById('save-assistant-settings');
        const saveStatus = document.getElementById('assistant-save-status');
        
        if (!assistantSettings) {
            return;
        }
        
        // Show success popup for assistant settings
        function showAssistantSuccessPopup() {
            const popup = document.getElementById('assistant-success-popup');
            
            if (popup) {
                // Remove any existing event listeners by cloning and replacing
                const newPopup = popup.cloneNode(true);
                popup.parentNode.replaceChild(newPopup, popup);
                
                // Get the new popup reference
                const popupRef = document.getElementById('assistant-success-popup');
                
                // Hide any existing popup first
                popupRef.style.display = 'none';
                
                // Show the popup
                setTimeout(() => {
                    popupRef.style.display = 'block';
                }, 10);
                
                // Hide popup function
                const hidePopup = () => {
                    popupRef.style.display = 'none';
                };
                
                // Hide after 3 seconds
                setTimeout(hidePopup, 3000);
                
                // Hide when clicking anywhere (with a small delay to allow the save click to complete)
                setTimeout(() => {
                    const clickHandler = (e) => {
                        // Don't hide if clicking inside the popup or the save button
                        if (!popupRef.contains(e.target) && e.target.id !== 'save-assistant-settings') {
                            hidePopup();
                            document.removeEventListener('click', clickHandler);
                        }
                    };
                    document.addEventListener('click', clickHandler);
                }, 200);
                
                // Hide when any form input changes
                const inputs = assistantSettings.querySelectorAll('input, select');
                inputs.forEach(input => {
                    const changeHandler = () => {
                        hidePopup();
                        input.removeEventListener('change', changeHandler);
                    };
                    input.addEventListener('change', changeHandler, { once: true });
                });
            }
        }
        
        // Initialize email time display
        function initEmailTimeDisplay() {
            const user = getCurrentUser();
            if (user) {
                const saved = localStorage.getItem(`assistantSettings_${user.id}`);
                if (saved) {
                    try {
                        const settings = JSON.parse(saved);
                        const time = settings.emailTime || '09:00';
                        const timezone = settings.emailTimezone || 'America/New_York';
                        updateEmailTimeDisplay(time, timezone);
                    } catch (error) {
                        console.error('Error loading email time display:', error);
                    }
                } else {
                    // Default values
                    updateEmailTimeDisplay('09:00', 'America/New_York');
                }
            }
        }
        
        initEmailTimeDisplay();
        
        // Save settings handler
        if (saveButton) {
            saveButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Save Settings button clicked');
                
                const settings = {
                    coldContactDays: parseInt(document.getElementById('cold-contact-days').value) || 12,
                    establishedContactDays: parseInt(document.getElementById('established-contact-days').value) || 90,
                    reminderColdContacts: document.getElementById('reminder-cold-contacts').checked,
                    reminderEstablishedContacts: document.getElementById('reminder-established-contacts').checked,
                    vipOnly: document.getElementById('reminder-vip-only').checked,
                    emailFrequency: document.querySelector('input[name="email-frequency"]:checked')?.value || 'realtime',
                    emailTime: document.getElementById('email-time').value || '09:00',
                    emailTimezone: document.getElementById('email-timezone').value || 'America/New_York'
                };
                
                console.log('Settings collected:', settings);
                
                // Validate settings
                if (!settings.reminderColdContacts && !settings.reminderEstablishedContacts) {
                    if (saveStatus) {
                        saveStatus.textContent = 'Please select at least one reminder type.';
                        saveStatus.style.color = 'var(--error)';
                        saveStatus.style.display = 'block';
                    }
                    return;
                }
                
                // Save to database
                const user = getCurrentUser();
                if (!user) {
                    if (saveStatus) {
                        saveStatus.textContent = 'Please log in to save settings.';
                        saveStatus.style.color = 'var(--error)';
                        saveStatus.style.display = 'block';
                    }
                    return;
                }
                
                // Save to database via API
                try {
                    const response = await fetch('/api/assistant/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, ...settings })
                    });
                    
                    const data = await response.json();
                    
                    console.log('Save settings response:', data);
                    
                    if (data.success) {
                        // Also save to localStorage as backup
                        localStorage.setItem(`assistantSettings_${user.id}`, JSON.stringify(settings));
                        showAssistantSuccessPopup();
                    } else {
                        console.error('Failed to save settings:', data);
                        if (saveStatus) {
                            saveStatus.textContent = data.message || data.error || 'Error saving settings. Please try again.';
                            saveStatus.style.color = 'var(--error)';
                            saveStatus.style.display = 'block';
                        }
                    }
                } catch (error) {
                    console.error('Error saving settings:', error);
                    if (saveStatus) {
                        saveStatus.textContent = `Error saving settings: ${error.message}. Please try again.`;
                        saveStatus.style.color = 'var(--error)';
                        saveStatus.style.display = 'block';
                    }
                }
            });
        } else {
            console.error('Save button not found!');
        }
        
        // Load saved settings
        async function loadSavedSettings() {
            const user = getCurrentUser();
            if (!user) return;
            
            // Try to load from database first
            try {
                const response = await fetch(`/api/assistant/settings/${user.id}`);
                const data = await response.json();
                
                if (data.success && data.settings) {
                    const settings = data.settings;
                    if (settings.coldContactDays) {
                        document.getElementById('cold-contact-days').value = settings.coldContactDays;
                    }
                    if (settings.establishedContactDays) {
                        document.getElementById('established-contact-days').value = settings.establishedContactDays;
                    }
                    if (settings.reminderColdContacts !== undefined) {
                        document.getElementById('reminder-cold-contacts').checked = settings.reminderColdContacts;
                    }
                    if (settings.reminderEstablishedContacts !== undefined) {
                        document.getElementById('reminder-established-contacts').checked = settings.reminderEstablishedContacts;
                    }
                    if (settings.vipOnly !== undefined) {
                        document.getElementById('reminder-vip-only').checked = settings.vipOnly;
                    }
                    if (settings.emailFrequency) {
                        const frequencyRadio = document.getElementById(`frequency-${settings.emailFrequency}`);
                        if (frequencyRadio) {
                            frequencyRadio.checked = true;
                        }
                    }
                    if (settings.emailTime && settings.emailTimezone) {
                        document.getElementById('email-time').value = settings.emailTime;
                        document.getElementById('email-timezone').value = settings.emailTimezone;
                        if (typeof updateEmailTimeDisplayGlobal === 'function') {
                            updateEmailTimeDisplayGlobal(settings.emailTime, settings.emailTimezone);
                        } else if (typeof updateEmailTimeDisplay === 'function') {
                            updateEmailTimeDisplay(settings.emailTime, settings.emailTimezone);
                        }
                    }
                    return;
                }
            } catch (error) {
                console.error('Error loading settings from database:', error);
            }
            
            // Fallback to localStorage
            const saved = localStorage.getItem(`assistantSettings_${user.id}`);
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    if (settings.coldContactDays) {
                        document.getElementById('cold-contact-days').value = settings.coldContactDays;
                    }
                    if (settings.establishedContactDays) {
                        document.getElementById('established-contact-days').value = settings.establishedContactDays;
                    }
                    if (settings.reminderColdContacts !== undefined) {
                        document.getElementById('reminder-cold-contacts').checked = settings.reminderColdContacts;
                    }
                    if (settings.reminderEstablishedContacts !== undefined) {
                        document.getElementById('reminder-established-contacts').checked = settings.reminderEstablishedContacts;
                    }
                    if (settings.vipOnly !== undefined) {
                        document.getElementById('reminder-vip-only').checked = settings.vipOnly;
                    }
                    if (settings.emailFrequency) {
                        const frequencyRadio = document.getElementById(`frequency-${settings.emailFrequency}`);
                        if (frequencyRadio) {
                            frequencyRadio.checked = true;
                        }
                    }
                    if (settings.emailTime && settings.emailTimezone) {
                        document.getElementById('email-time').value = settings.emailTime;
                        document.getElementById('email-timezone').value = settings.emailTimezone;
                        if (typeof updateEmailTimeDisplayGlobal === 'function') {
                            updateEmailTimeDisplayGlobal(settings.emailTime, settings.emailTimezone);
                        } else if (typeof updateEmailTimeDisplay === 'function') {
                            updateEmailTimeDisplay(settings.emailTime, settings.emailTimezone);
                        }
                    }
                } catch (error) {
                    console.error('Error loading saved settings:', error);
                }
            }
        }
        
        // Load settings when section becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const section = document.getElementById('strengthening-net');
                    if (section && section.classList.contains('active')) {
                        loadSavedSettings();
                    }
                }
            });
        });
        
        const strengtheningNetSection = document.getElementById('strengthening-net');
        if (strengtheningNetSection) {
            observer.observe(strengtheningNetSection, { attributes: true });
        }
        
        // Initialize on page load if section is already active
        if (strengtheningNetSection && strengtheningNetSection.classList.contains('active')) {
            loadSavedSettings();
        }
    }
    
    // Call initNetworkingAssistant when DOM is ready
    initNetworkingAssistant();

    // Back to network button - always go to My Network tab
    // Use event delegation with a more specific check
    document.body.addEventListener('click', function(e) {
        // Check if clicked element is the button or inside the button
        if (e.target.id === 'back-to-network' || e.target.closest('#back-to-network')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Back to My Network button clicked');
            
            // Get the nav link and click it
            const navLink = document.querySelector('a[href="#contacts"]');
            if (navLink) {
                console.log('Found nav link, clicking it');
                // Create a new click event and dispatch it
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                navLink.dispatchEvent(clickEvent);
            } else {
                console.error('Nav link not found, using fallback');
                // Fallback: do what the nav link handler does
                const targetId = 'contacts';
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                const targetNavLink = document.querySelector(`a[href="#${targetId}"]`);
                if (targetNavLink) {
                    targetNavLink.classList.add('active');
                }
                
                // Show target section
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
                
                // Close mobile menu
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu) {
                    navMenu.classList.remove('active');
                }
                
                // Refresh contacts
                if (typeof filterContacts === 'function') {
                    filterContacts();
                }
            }
        }
    });

    // Quick add modal handlers
    const quickAddForm = document.getElementById('quick-add-form');
    const quickAddModal = document.getElementById('quick-add-modal');
    const quickAddClose = quickAddModal ? quickAddModal.querySelector('.close-modal') : null;
    const quickNotesImageInput = document.getElementById('quick-notes-image');
    const quickNotesPreview = document.getElementById('quick-notes-preview');
    
    // Note: handleQuickAddSubmit is already defined globally at the top of the file
    // No need to redefine it here
    
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form submit event fired');
            window.handleQuickAddSubmit(e);
            return false;
        });
        
        // Also add click handler to submit button (now type="button" so we handle it directly)
        const submitButton = document.getElementById('quick-add-submit-btn');
        if (submitButton) {
            submitButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Submit button clicked');
                window.handleQuickAddSubmit(e);
                return false;
            });
        }
    }
    
    if (quickAddClose) {
        quickAddClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked');
            if (quickAddModal) {
                quickAddModal.classList.remove('active');
                console.log('Modal closed');
            }
            if (quickAddForm) {
                quickAddForm.reset();
            }
            // Clear status
            const status = document.getElementById('quick-add-status');
            if (status) {
                status.textContent = '';
                status.className = '';
                status.style.display = 'none';
            }
            // Clear variables
            currentQuickAddType = null;
            currentContactIdForQuickAdd = null;
        });
    }
    
    if (quickAddModal) {
        // Close modal when clicking outside of modal content
        quickAddModal.addEventListener('click', (e) => {
            if (e.target === quickAddModal) {
                console.log('Clicked outside modal, closing');
                quickAddModal.classList.remove('active');
                if (quickAddForm) {
                    quickAddForm.reset();
                }
                // Clear status
                const status = document.getElementById('quick-add-status');
                if (status) {
                    status.textContent = '';
                    status.className = '';
                    status.style.display = 'none';
                }
                // Clear variables
                currentQuickAddType = null;
                currentContactIdForQuickAdd = null;
            }
        });
        
        // Prevent clicks inside modal content from closing the modal
        const modalContent = quickAddModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
    
    if (quickNotesImageInput && quickNotesPreview) {
        quickNotesImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const status = document.getElementById('quick-add-status');
            
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    quickNotesPreview.innerHTML = `<img src="${event.target.result}" alt="Call notes preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
                    quickNotesPreview.style.display = 'block';
                    
                    // Show green success message with file name
                    if (status) {
                        status.innerHTML = `File selected<br><span style="font-size: 0.9rem; color: var(--text-medium);">${escapeHtmlClub(file.name)}</span>`;
                        status.className = 'upload-status success';
                        status.style.display = 'block';
                    }
                };
                reader.onerror = () => {
                    console.error('Error reading image file');
                    quickNotesPreview.innerHTML = '<p style="color: red;">Error loading image preview</p>';
                    quickNotesPreview.style.display = 'block';
                    if (status) {
                        status.textContent = 'Error loading image preview';
                        status.className = 'upload-status error';
                        status.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            } else if (file) {
                // Not an image file
                quickNotesPreview.innerHTML = '<p style="color: red;">Please select an image file</p>';
                quickNotesPreview.style.display = 'block';
                if (status) {
                    status.textContent = 'Please select an image file';
                    status.className = 'upload-status error';
                    status.style.display = 'block';
                }
            } else {
                // No file selected
                quickNotesPreview.style.display = 'none';
                if (status && quickAddNotesMode === 'image') {
                    // Only clear status if we're in image mode
                    status.textContent = '';
                    status.className = '';
                    status.style.display = 'none';
                }
            }
        });
    }
});

// Contact management functions
// User management functions
// Abort signal that fires after `ms` (prevents fetches from hanging the UI forever)
function weaverTimeoutSignal(ms) {
    try {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
        var ctrl = new AbortController();
        setTimeout(function () { ctrl.abort(); }, ms);
        return ctrl.signal;
    } catch (e) { return undefined; }
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem('weaver_current_user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.warn('getCurrentUser: invalid stored user', e);
        return null;
    }
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem('weaver_current_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('weaver_current_user');
    }
}

function getUserKey(userId) {
    return `weaver_contacts_${userId}`;
}

function getContacts() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return [];
    }
    try {
        const contacts = localStorage.getItem(getUserKey(currentUser.id));
        return contacts ? JSON.parse(contacts) : [];
    } catch (e) {
        console.warn('getContacts: invalid stored contacts', e);
        return [];
    }
}

function saveContacts(contacts) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    // Give every email/note a stable id. The server sync skips items without an id,
    // so notes created in the UI (which had none) never reached the database —
    // which also zeroed "calls" on the club leaderboard.
    (contacts || []).forEach(function (c) {
        (c.emails || []).forEach(function (e) { if (e && e.id == null) e.id = 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); });
        (c.notes || []).forEach(function (n) { if (n && n.id == null) n.id = 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); });
    });
    localStorage.setItem(getUserKey(currentUser.id), JSON.stringify(contacts));
    syncContactsToBackend(contacts).catch(err => console.error('Sync contacts to backend failed:', err));
}

// Load contacts from backend (used on login and page load so data persists across devices)
async function loadContactsFromAPI() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/contacts?userId=${encodeURIComponent(currentUser.id)}`, { signal: weaverTimeoutSignal(10000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.contacts && Array.isArray(data.contacts)) {
            const key = getUserKey(currentUser.id);
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            // Don't overwrite local list with a much smaller server list (prevents losing data after a bad sync)
            const LOAD_REPLACE_THRESHOLD = 20;
            if (existing.length > LOAD_REPLACE_THRESHOLD && data.contacts.length < existing.length - LOAD_REPLACE_THRESHOLD) {
                console.warn('Load contacts: server has fewer contacts than this device. Keeping local list to prevent data loss.', { server: data.contacts.length, local: existing.length });
                return;
            }
            localStorage.setItem(key, JSON.stringify(data.contacts));
        }
    } catch (err) {
        console.error('Load contacts from API failed:', err);
    }
}

// Persist current contact list to backend (called from saveContacts).
// Sync is merge-only: adds/updates contacts, never deletes contacts not in the list.
// Empty list = explicit "Delete all" – call DELETE /api/contacts.
async function syncContactsToBackend(contacts) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        if (Array.isArray(contacts) && contacts.length === 0) {
            const res = await fetch(`/api/contacts?userId=${encodeURIComponent(currentUser.id)}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || res.statusText);
            }
            return;
        }
        if (!contacts) return;
        const res = await fetch('/api/contacts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, contacts })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
    } catch (err) {
        throw err;
    }
}

// Check if a contact is a duplicate (same name or email)
function findDuplicateContact(newContact, existingContacts) {
    if (!newContact) return null;
    
    const newName = (newContact.name || '').toLowerCase().trim();
    const newEmail = (newContact.email || '').toLowerCase().trim();
    
    if (!newName && !newEmail) return null;
    
    return existingContacts.find(existing => {
        const existingName = (existing.name || '').toLowerCase().trim();
        const existingEmail = (existing.email || '').toLowerCase().trim();
        
        // Match by email if both have emails
        if (newEmail && existingEmail && newEmail === existingEmail) {
            return true;
        }
        
        // Match by name if both have names
        if (newName && existingName && newName === existingName) {
            return true;
        }
        
        return false;
    });
}

// Merge two contacts, combining all their data
function mergeContacts(existingContact, newContact) {
    console.log('Merging contacts:', existingContact.name, 'with', newContact.name);
    
    // Keep the existing contact's ID
    const merged = { ...existingContact };
    
    // Merge emails - combine and remove duplicates
    const existingEmails = existingContact.emails || [];
    const newEmails = newContact.emails || [];
    const allEmails = [...existingEmails, ...newEmails];
    
    // Remove duplicate emails (same date, direction, and subject)
    const uniqueEmails = [];
    const emailKeys = new Set();
    allEmails.forEach(email => {
        const key = `${email.date}_${email.direction}_${email.subject || ''}`;
        if (!emailKeys.has(key)) {
            emailKeys.add(key);
            uniqueEmails.push(email);
        }
    });
    
    // Sort emails by date
    uniqueEmails.sort((a, b) => a.date.localeCompare(b.date));
    merged.emails = uniqueEmails;
    
    // Merge notes - combine and remove duplicates
    const existingNotes = existingContact.notes || [];
    const newNotes = newContact.notes || [];
    const allNotes = [...existingNotes, ...newNotes];
    
    // Remove duplicate notes (same date and summary)
    const uniqueNotes = [];
    const noteKeys = new Set();
    allNotes.forEach(note => {
        const key = `${note.date}_${(note.summary || '').substring(0, 50)}`;
        if (!noteKeys.has(key)) {
            noteKeys.add(key);
            uniqueNotes.push(note);
        }
    });
    
    // Sort notes by date
    uniqueNotes.sort((a, b) => a.date.localeCompare(b.date));
    merged.notes = uniqueNotes;
    
    // Merge general notes - combine if both exist
    if (newContact.generalNotes && existingContact.generalNotes) {
        merged.generalNotes = existingContact.generalNotes + '\n\n--- Merged Notes ---\n\n' + newContact.generalNotes;
    } else if (newContact.generalNotes) {
        merged.generalNotes = newContact.generalNotes;
    }
    
    // Update fields if new contact has more complete data
    if (!merged.email && newContact.email) merged.email = newContact.email;
    if (!merged.firm && newContact.firm) merged.firm = newContact.firm;
    if (!merged.position && newContact.position) merged.position = newContact.position;
    if (!merged.phone && newContact.phone) merged.phone = newContact.phone;
    if (!merged.location && newContact.location) merged.location = newContact.location;
    
    // Update first email date if new contact has an earlier date
    if (newContact.firstEmailDate) {
        if (!merged.firstEmailDate || newContact.firstEmailDate < merged.firstEmailDate) {
            merged.firstEmailDate = newContact.firstEmailDate;
        }
    }
    
    // Keep the earlier priority if both exist, or use the new one if existing doesn't have one
    if (!merged.priority && newContact.priority) {
        merged.priority = newContact.priority;
    }
    
    // Merge additional data if it exists
    if (newContact.additionalData) {
        merged.additionalData = { ...(merged.additionalData || {}), ...newContact.additionalData };
    }
    
    return merged;
}

function addContact(contact, skipDuplicateCheck = false) {
    // Initialize emails and notes arrays if they don't exist
    if (!contact.emails) {
        contact.emails = [];
    }
    if (!contact.notes) {
        contact.notes = [];
    }
    
    const contacts = getContacts();
    
    // Check for duplicates if not skipping
    if (!skipDuplicateCheck) {
        const duplicate = findDuplicateContact(contact, contacts);
        
        if (duplicate) {
            // Ask user if they want to merge
            const duplicateInfo = [];
            if (duplicate.name) duplicateInfo.push(`Name: ${duplicate.name}`);
            if (duplicate.email) duplicateInfo.push(`Email: ${duplicate.email}`);
            if (duplicate.firm) duplicateInfo.push(`Company: ${duplicate.firm}`);
            
            const newInfo = [];
            if (contact.name) newInfo.push(`Name: ${contact.name}`);
            if (contact.email) newInfo.push(`Email: ${contact.email}`);
            if (contact.firm) newInfo.push(`Company: ${contact.firm}`);
            
            // Combine automatically only when it is clearly the same person: same email,
            // or same name at the same firm (or one side has no firm yet).
            const sameEmail = contact.email && duplicate.email && contact.email.toLowerCase().trim() === duplicate.email.toLowerCase().trim();
            const firmA = (duplicate.firm || '').toLowerCase().trim(), firmB = (contact.firm || '').toLowerCase().trim();
            const sameFirm = !firmA || !firmB || firmA === firmB;
            if (sameEmail || sameFirm) {
                // Merge contacts
                const merged = mergeContacts(duplicate, contact);
                const duplicateIndex = contacts.findIndex(c => c.id === duplicate.id);
                if (duplicateIndex !== -1) {
                    contacts[duplicateIndex] = merged;
                    saveContacts(contacts);
                    updateContactDropdown();
                    updateFirmFilter();
                    filterContacts();
                    wvToast('Added to your existing contact ' + (merged.name || '') + '.', 'info');
                    return merged; // Return the merged contact
                }
            } else {
                // Same name at a different firm: treat as a different person.
            }
        }
    }
    
    // Plan contact limit (checked before adding a new contact, not when merging)
    if (!canAddMoreContacts()) {
        const u = getCurrentUser();
        showUpgradePrompt('Your ' + ((u && u.plan && u.plan.label) || 'current') + ' plan includes ' + planContactLimit(u) + ' contacts. Adding more');
        return null;
    }
    
    // Add the contact (either new or user chose not to merge)
    contacts.push(contact);
    saveContacts(contacts);
    updateContactDropdown();
    updateFirmFilter();
    // Use filterContacts to maintain proper sorting
    filterContacts();
    return contact;
}

async function deleteContact(contactId) {
    const contact = getContacts().find(c => c.id === contactId);
    if (!contact) {
        console.error('Contact not found:', contactId);
        return;
    }
    
    // Confirm deletion
    const confirmMessage = `${contact.name}${contact.firm ? ` (${contact.firm})` : ''} and all their emails and notes will be removed. This can’t be undone.`;
    if (!(await wvConfirm(confirmMessage, { title: 'Delete contact?', confirmLabel: 'Delete', danger: true }))) {
        return;
    }
    
    // Remove contact from array
    const contacts = getContacts();
    const filteredContacts = contacts.filter(c => c.id !== contactId);
    saveContacts(filteredContacts);
    
    // Update UI
    updateContactDropdown();
    updateFirmFilter();
    filterContacts();
    
    // If we're viewing this contact's detail page, go back to network list
    const contactDetail = document.getElementById('contact-detail');
    if (contactDetail && contactDetail.classList.contains('active')) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('contacts').classList.add('active');
    }
}

// Make deleteContact globally accessible
window.deleteContact = deleteContact;

// Toggle VIP status for a contact
function toggleVIP(contactId) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) {
        console.error('Contact not found:', contactId);
        return;
    }
    
    // Toggle VIP status
    contact.vip = !contact.vip;
    
    // Save updated contacts
    saveContacts(contacts);
    
    // Refresh the display
    filterContacts();
    
    // Also update strengthening net if it's active
    const strengtheningNetSection = document.getElementById('strengthening-net');
    if (strengtheningNetSection && strengtheningNetSection.classList.contains('active')) {
        updateStrengtheningNet();
    }
}

// Make toggleVIP globally accessible
window.toggleVIP = toggleVIP;

function loadContacts() {
    // Sort alphabetically by default
    const contacts = getContacts();
    const sortedContacts = [...contacts].sort((a, b) => {
        const lastNameA = getLastName(a.name || '').toLowerCase();
        const lastNameB = getLastName(b.name || '').toLowerCase();
        return lastNameA.localeCompare(lastNameB);
    });
    displayContacts(sortedContacts);
}

function getLastName(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1] || name;
}

// Parse a date string (YYYY-MM-DD) as local date (not UTC) to avoid timezone issues
function parseLocalDate(dateString) {
    if (!dateString) return null;
    
    // Parse the date string as local date components (not UTC)
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const day = parseInt(parts[2]);
        
        // Create date using local timezone (not UTC)
        return new Date(year, month, day);
    }
    
    // Fallback to original method if format is unexpected
    return new Date(dateString);
}

// Format a date string (YYYY-MM-DD) to local date string without timezone issues
function formatLocalDate(dateString) {
    if (!dateString) return '';
    
    const date = parseLocalDate(dateString);
    if (!date) return '';
    
    // Format using local date components
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
}

// Validate that a date is not in the future
function validateDateNotFuture(dateString, fieldName = 'Date') {
    if (!dateString) return { valid: false, message: `${fieldName} is required.` };
    
    // Compare dates as strings (YYYY-MM-DD format) to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    if (dateString > todayString) {
        return { 
            valid: false, 
            message: `${fieldName} cannot be in the future. Please select today or a past date.` 
        };
    }
    
    return { valid: true };
}

// Update contact count display
function updateContactCount(filteredCount, totalCount) {
    const countElement = document.getElementById('contact-count');
    if (!countElement) return;
    
    if (filteredCount === totalCount) {
        // No filters applied - show total
        countElement.textContent = `${totalCount} contact${totalCount !== 1 ? 's' : ''}`;
    } else {
        // Filters applied - show filtered count
        countElement.textContent = `${filteredCount} of ${totalCount} contact${totalCount !== 1 ? 's' : ''}`;
    }
}

function displayContacts(contactsToShow = null) {
    let contacts = contactsToShow || getContacts();
    const contactsList = document.getElementById('contacts-list');
    
    // Update count when displaying
    if (contactsToShow !== null) {
        const totalContacts = getContacts();
        updateContactCount(contacts.length, totalContacts.length);
    }
    
    if (contacts.length === 0) {
        contactsList.innerHTML = getContacts().length ? '<div class="wv-empty"><h2>No matches</h2><p>No contacts match these filters.</p></div>' : '<div class="wv-empty"><h2>No contacts yet</h2><p>Add people you’re talking to, or import a spreadsheet.</p><button type="button" class="wv-btn wv-btn-primary" onclick="var l=document.querySelector(\'.nav-link[href=&quot;#upload-notes&quot;]\'); if(l) l.click();">Add contacts</button></div>';
        // Update count to show 0
        const totalContacts = getContacts();
        updateContactCount(0, totalContacts.length);
        return;
    }
    
    // Sort alphabetically by last name if not sorting by days
    const sortByDays = document.getElementById('sort-by-days')?.checked || false;
    if (!sortByDays) {
        contacts = [...contacts].sort((a, b) => {
            const lastNameA = getLastName(a.name || '').toLowerCase();
            const lastNameB = getLastName(b.name || '').toLowerCase();
            return lastNameA.localeCompare(lastNameB);
        });
    }

    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const rows = contacts.map(contact => {
        const emailsSent = contact.emails ? contact.emails.filter(e => e.direction === 'sent' || !e.direction).length : 0;
        const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
        const callCount = contact.notes ? contact.notes.length : 0;
        const dates = [];
        (contact.emails || []).forEach(e => { const d = parseLocalDate(e.date); if (d) dates.push(d); });
        (contact.notes || []).forEach(n => { const d = parseLocalDate(n.date); if (d) dates.push(d); });
        let last = '<span class="wv-muted">No contact yet</span>';
        if (dates.length) {
            const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
            lastDate.setHours(0, 0, 0, 0);
            const days = Math.max(0, Math.floor((today0 - lastDate) / 86400000));
            const cls = days > 30 ? 'wv-status-inactive' : days > 14 ? 'wv-status-slowing' : 'wv-status-active';
            const label = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days + ' days ago';
            last = '<span class="wv-status ' + cls + '">' + label + '</span>';
        }
        const id = esc(contact.id);
        const role = [contact.firm && contact.firm !== 'N/A' ? contact.firm : '', contact.position && contact.position !== 'N/A' ? contact.position : ''].filter(Boolean).map(esc).join('<span class="wv-muted"> · </span>');
        return '<tr class="wv-net-row" data-contact="' + id + '" tabindex="0">' +
            '<td class="wv-net-vip"><button type="button" class="wv-icon-btn' + (contact.vip ? ' is-on' : '') + '" data-vip="' + id + '" aria-pressed="' + (contact.vip ? 'true' : 'false') + '" title="' + (contact.vip ? 'Remove VIP' : 'Mark as VIP') + '">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (contact.vip ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                '<span class="wv-sr">' + (contact.vip ? 'VIP' : 'Not VIP') + '</span></button></td>' +
            '<td><div class="wv-cell-strong">' + esc(contact.name) + '</div>' + (contact.email ? '<div class="wv-cell-sub">' + esc(contact.email) + '</div>' : '') + '</td>' +
            '<td>' + (role || '<span class="wv-muted">Not recorded</span>') + '</td>' +
            '<td>' + last + '</td>' +
            '<td class="num">' + emailsSent + '</td><td class="num">' + emailsReceived + '</td><td class="num">' + callCount + '</td>' +
            '<td class="wv-row-actions">' + (callCount ? '<button type="button" class="wv-linkbtn wv-inline" data-notes="' + id + '">Notes</button>' : '') +
                '<button type="button" class="wv-icon-btn wv-icon-danger" data-del="' + id + '" title="Delete contact"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg><span class="wv-sr">Delete</span></button></td>' +
            '</tr>';
    }).join('');
    contactsList.innerHTML = '<div class="wv-table-scroll"><table class="wv-table wv-table-click wv-net-table"><thead><tr>' +
        '<th scope="col"><span class="wv-sr">VIP</span></th><th scope="col">Name</th><th scope="col">Firm and role</th><th scope="col">Last contact</th>' +
        '<th scope="col" class="num">Sent</th><th scope="col" class="num">Replies</th><th scope="col" class="num">Calls</th><th scope="col"><span class="wv-sr">Actions</span></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    contactsList.querySelectorAll('[data-vip]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); toggleVIP(b.getAttribute('data-vip')); }; });
    contactsList.querySelectorAll('[data-del]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); deleteContact(b.getAttribute('data-del')); }; });
    contactsList.querySelectorAll('[data-notes]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); showCallNotes(b.getAttribute('data-notes')); }; });
    contactsList.querySelectorAll('tr[data-contact]').forEach(tr => {
        const open = () => showContactDetail(tr.getAttribute('data-contact'));
        tr.onclick = open;
        tr.onkeydown = (e) => { if (e.key === 'Enter') open(); };
    });
}

// Update Strengthening the Net display
function updateStrengtheningNet() {
    const followUpDaysInput = document.getElementById('follow-up-days');
    const contactsList = document.getElementById('strengthening-contacts-list');
    const resultsCount = document.getElementById('results-count');
    const resultsTitle = document.getElementById('results-title');
    
    if (!followUpDaysInput || !contactsList) return;
    
    const daysThreshold = parseInt(followUpDaysInput.value) || 90;
    const coldEmailFilter = document.getElementById('cold-email-filter');
    const showColdEmailOnly = coldEmailFilter ? coldEmailFilter.checked : false;
    const strengtheningVipFilter = document.getElementById('strengthening-vip-filter');
    const showVipOnly = strengtheningVipFilter ? strengtheningVipFilter.checked : false;
    const contacts = getContacts();
    
    // Calculate days since last contact for each contact
    let contactsNeedingFollowUp = contacts.filter(contact => {
        const daysSinceLastContact = getDaysSinceLastContact(contact);
        
        // Exclude contacts with no contact history
        if (daysSinceLastContact === null) {
            return false;
        }
        
        // Include contacts that meet or exceed the threshold
        return daysSinceLastContact >= daysThreshold;
    });
    
    // Apply cold email filter if checked
    if (showColdEmailOnly) {
        contactsNeedingFollowUp = contactsNeedingFollowUp.filter(contact => {
            const callCount = contact.notes ? contact.notes.length : 0;
            const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
            return callCount === 0 && emailsReceived === 0;
        });
    }
    
    // Apply VIP filter if checked
    if (showVipOnly) {
        contactsNeedingFollowUp = contactsNeedingFollowUp.filter(contact => {
            return contact.vip === true;
        });
    }
    
    // Sort by days since last contact (highest first)
    contactsNeedingFollowUp.sort((a, b) => {
        const daysA = getDaysSinceLastContact(a);
        const daysB = getDaysSinceLastContact(b);
        return daysB - daysA;
    });
    
    // Update results count
    if (resultsCount) {
        if (contactsNeedingFollowUp.length === 0) {
            let message = `No contacts need follow-up (all contacts have been contacted within the last ${daysThreshold} days)`;
            if (showColdEmailOnly) {
                message = `No cold email contacts need follow-up (all contacts have been contacted within the last ${daysThreshold} days, or have calls/received emails)`;
            } else if (showVipOnly) {
                message = `No VIP contacts need follow-up (all VIP contacts have been contacted within the last ${daysThreshold} days)`;
            }
            if (showColdEmailOnly && showVipOnly) {
                message = `No VIP cold email contacts need follow-up (all VIP contacts have been contacted within the last ${daysThreshold} days, or have calls/received emails)`;
            }
            resultsCount.textContent = '';
            resultsCount.className = 'results-count';
        } else {
            let countText = `Found ${contactsNeedingFollowUp.length} contact${contactsNeedingFollowUp.length !== 1 ? 's' : ''} that need follow-up (${daysThreshold}+ days since last contact)`;
            if (showColdEmailOnly && showVipOnly) {
                countText += ' - showing VIP cold email contacts only (0 calls, 0 emails received)';
            } else if (showColdEmailOnly) {
                countText += ' - showing cold email contacts only (0 calls, 0 emails received)';
            } else if (showVipOnly) {
                countText += ' - showing VIP contacts only';
            }
            countText += '.';
            resultsCount.textContent = countText;
            resultsCount.className = 'results-count';
        }
    }
    
    // Display contacts
    if (contactsNeedingFollowUp.length === 0) {
        contactsList.innerHTML = '<div class="wv-empty"><h2>No one is due</h2><p>Everyone matching these filters was contacted in the last ' + daysThreshold + ' days.</p></div>';
    } else {
        contactsList.innerHTML = contactsNeedingFollowUp.map(contact => {
            const daysSinceLastContact = getDaysSinceLastContact(contact);
            const emailsSent = contact.emails ? contact.emails.filter(e => e.direction === 'sent' || !e.direction).length : 0;
            const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
            const callCount = contact.notes ? contact.notes.length : 0;
            const lastEmailDate = contact.emails && contact.emails.length > 0 
                ? contact.emails[contact.emails.length - 1].date 
                : null;
            const lastCallDate = contact.notes && contact.notes.length > 0
                ? contact.notes[contact.notes.length - 1].date
                : null;
            
            return `
            <div class="contact-card" onclick="showContactDetail('${contact.id}')" style="cursor: pointer; position: relative;">
                <div class="contact-card-actions">
                    <button class="vip-contact-btn ${contact.vip ? 'vip-active' : ''}" onclick="event.stopPropagation(); toggleVIP('${contact.id}')" title="${contact.vip ? 'Remove from VIP' : 'Mark as VIP'}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${contact.vip ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                    <button class="delete-contact-btn" onclick="event.stopPropagation(); deleteContact('${contact.id}')" title="Delete Contact">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="contact-info">
                    <h3>${escapeHtmlClub(contact.name)}</h3>
                    <div class="contact-details">
                        ${contact.firm ? `<p><strong>Firm:</strong> ${escapeHtmlClub(contact.firm)}</p>` : '<p><strong>Firm:</strong> N/A</p>'}
                        ${contact.position ? `<p><strong>Position:</strong> ${escapeHtmlClub(contact.position)}</p>` : '<p><strong>Position:</strong> N/A</p>'}
                        ${contact.email ? `<p><strong>Email:</strong> ${escapeHtmlClub(contact.email)}</p>` : ''}
                    </div>
                </div>
                <div class="contact-details">
                    ${contact.firstEmailDate ? `<p><strong>First email</strong> ${formatLocalDate(contact.firstEmailDate)}</p>` : ''}
                    ${lastEmailDate ? `<p><strong>Last email</strong> ${formatLocalDate(lastEmailDate)}</p>` : ''}
                    ${lastCallDate ? `<p><strong>Last call</strong> ${formatLocalDate(lastCallDate)}</p>` : ''}
                    ${daysSinceLastContact !== null ? `<p><strong>Days since last contact</strong> <span class="days-badge ${daysSinceLastContact > 30 ? 'days-high' : daysSinceLastContact > 14 ? 'days-medium' : 'days-low'}">${daysSinceLastContact}</span></p>` : '<p><strong>Days since last contact</strong> <span class="days-badge days-high">No contact yet</span></p>'}
                </div>
                <div class="contact-stats">
                    <p><strong>Emails sent</strong> ${emailsSent}</p>
                    <p><strong>Replies</strong> ${emailsReceived}</p>
                    <p><strong>Calls:</strong> ${callCount}</p>
                </div>
                <div class="contact-actions">
                    ${contact.notes && contact.notes.length > 0 ? `
                        <button class="btn-view-notes" onclick="event.stopPropagation(); showCallNotes('${contact.id}')">View Notes</button>
                    ` : '<p style="color: var(--text-muted); font-size: 0.9rem;">No notes</p>'}
                </div>
            </div>
        `;
        }).join('');
    }
}

// Helper function to get days since last contact
function getDaysSinceLastContact(contact) {
    const allInteractions = [];
    if (contact.emails) {
        contact.emails.forEach(e => {
            const date = parseLocalDate(e.date);
            if (date) allInteractions.push(date);
        });
    }
    if (contact.notes) {
        contact.notes.forEach(n => {
            const date = parseLocalDate(n.date);
            if (date) allInteractions.push(date);
        });
    }
    
    if (allInteractions.length === 0) {
        return null; // No contact ever
    }
    
    const lastContactDate = new Date(Math.max(...allInteractions.map(d => d.getTime())));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastContactDate.setHours(0, 0, 0, 0);
    const diffTime = today - lastContactDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function updateContactDropdown() {
    const contacts = getContacts();
    const contactSelect = document.getElementById('contact-select');
    
    // Keep the first option (placeholder)
    const placeholder = contactSelect.options[0];
    contactSelect.innerHTML = '';
    contactSelect.appendChild(placeholder);
    
    contacts.forEach(contact => {
        const option = document.createElement('option');
        option.value = contact.id;
        option.textContent = `${contact.name}${contact.firm ? ` - ${contact.firm}` : ''}`;
        contactSelect.appendChild(option);
    });
}

function updateFirmFilter() {
    const contacts = getContacts();
    const firmFilter = document.getElementById('firm-filter');
    const firms = [...new Set(contacts.map(c => c.firm).filter(f => f))].sort();
    
    // Keep "All Firms" option
    firmFilter.innerHTML = '<option value="">All firms</option>';
    
    firms.forEach(firm => {
        const option = document.createElement('option');
        option.value = firm;
        option.textContent = firm;
        firmFilter.appendChild(option);
    });
}

function filterContacts() {
    const contacts = getContacts();
    const searchTerm = document.getElementById('contact-search').value.toLowerCase();
    const firmFilter = document.getElementById('firm-filter').value;
    const sortByDays = document.getElementById('sort-by-days').checked;
    const vipFilter = document.getElementById('vip-filter')?.checked || false;
    
    let filtered = contacts.filter(contact => {
        const matchesSearch = !searchTerm || 
            contact.name.toLowerCase().includes(searchTerm) ||
            (contact.firm && contact.firm.toLowerCase().includes(searchTerm)) ||
            (contact.position && contact.position.toLowerCase().includes(searchTerm)) ||
            (contact.email && contact.email.toLowerCase().includes(searchTerm));
        
        const matchesFirm = !firmFilter || contact.firm === firmFilter;
        const matchesVIP = !vipFilter || contact.vip === true;
        
        return matchesSearch && matchesFirm && matchesVIP;
    });
    
    // Update contact count display
    updateContactCount(filtered.length, contacts.length);
    
    // Sort by days since last contact if checkbox is checked, otherwise alphabetical by last name
    if (sortByDays) {
        filtered.sort((a, b) => {
            const getLastContactDate = (contact) => {
                const allInteractions = [];
                if (contact.emails) {
                    contact.emails.forEach(e => {
                        const date = parseLocalDate(e.date);
                        if (date) allInteractions.push(date);
                    });
                }
                if (contact.notes) {
                    contact.notes.forEach(n => {
                        const date = parseLocalDate(n.date);
                        if (date) allInteractions.push(date);
                    });
                }
                if (allInteractions.length === 0) return new Date(0); // Very old date
                return new Date(Math.max(...allInteractions.map(d => d.getTime())));
            };
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysA = Math.floor((today - getLastContactDate(a)) / (1000 * 60 * 60 * 24));
            const daysB = Math.floor((today - getLastContactDate(b)) / (1000 * 60 * 60 * 24));
            
            return daysB - daysA; // Descending order (longest first)
        });
    } else {
        // Sort alphabetically by last name
        filtered.sort((a, b) => {
            const lastNameA = getLastName(a.name || '').toLowerCase();
            const lastNameB = getLastName(b.name || '').toLowerCase();
            return lastNameA.localeCompare(lastNameB);
        });
    }
    
    displayContacts(filtered);
}

// Build timeline items with proportional date spacing
function buildTimelineItems(timeline, contact) {
    if (timeline.length === 0) {
        return '<p style="text-align: center; color: var(--text-medium); padding: 1rem;">No interactions yet</p>';
    }
    
    // Get today's date
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayTime = today.getTime();
    
    // Get first interaction date
    var firstDate = parseLocalDate(timeline[0].date);
    if (!firstDate) {
        firstDate = new Date();
    }
    firstDate.setHours(0, 0, 0, 0);
    var firstTime = firstDate.getTime();
    
    // Total time span from first interaction to today
    var totalSpan = todayTime - firstTime;
    if (totalSpan <= 0) {
        totalSpan = 1; // Avoid division by zero
    }
    
    var html = '';
    
    // Group timeline items by date to detect sent+received on the same day
    var dateGroups = {};
    for (var i = 0; i < timeline.length; i++) {
        var dateKey = timeline[i].date;
        if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
        dateGroups[dateKey].push(i);
    }
    
    // Check which dates have both sent and received emails
    var bothDates = {};
    for (var dk in dateGroups) {
        var indices = dateGroups[dk];
        var hasSent = false;
        var hasReceived = false;
        for (var j = 0; j < indices.length; j++) {
            var t = timeline[indices[j]].type;
            if (t === 'email-sent') hasSent = true;
            if (t === 'email-received') hasReceived = true;
        }
        if (hasSent && hasReceived) bothDates[dk] = true;
    }
    
    // Track dates already rendered to avoid duplicate dots for same-date sent+received
    var renderedBothDates = {};
    
    for (var i = 0; i < timeline.length; i++) {
        var item = timeline[i];
        var itemDate = parseLocalDate(item.date);
        if (!itemDate) continue;
        itemDate.setHours(0, 0, 0, 0);
        var itemTime = itemDate.getTime();
        
        // Calculate position as percentage (0% = first interaction, 100% = today)
        var position = ((itemTime - firstTime) / totalSpan) * 100;
        position = Math.max(0, Math.min(100, position));
        
        var itemType = item.type.indexOf('email') >= 0 ? item.type : 'call';
        
        // If this date has both sent and received emails, render a single combined dot
        if (bothDates[item.date] && (itemType === 'email-sent' || itemType === 'email-received')) {
            if (renderedBothDates[item.date]) continue; // Skip duplicate
            renderedBothDates[item.date] = true;
            itemType = 'email-both';
        }
        
        var tooltipContent = '';
        if (itemType === 'call') {
            tooltipContent = item.summary || 'No notes recorded';
        } else if (itemType === 'email-both') {
            // Gather all subjects for this date, one per line
            var bothItems = dateGroups[item.date];
            var lines = [];
            for (var b = 0; b < bothItems.length; b++) {
                var bi = timeline[bothItems[b]];
                var biType = bi.type.indexOf('email') >= 0 ? bi.type : 'call';
                if (biType === 'email-sent') {
                    lines.push('Email sent: ' + (bi.subject || 'No subject'));
                } else if (biType === 'email-received') {
                    lines.push('Reply: ' + (bi.subject || 'No subject'));
                }
            }
            tooltipContent = lines.join('\n');
        } else {
            tooltipContent = item.subject || 'No subject';
        }
        
        // Escape for HTML attribute
        tooltipContent = tooltipContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '&#10;');
        if (tooltipContent.length > 500) {
            tooltipContent = tooltipContent.substring(0, 500);
        }
        
        var typeLabel = itemType === 'email-both' ? 'Sent and replied' : (item.label || (itemType === 'call' ? 'Call' : 'Email'));
        var formattedDate = formatLocalDate(item.date);
        
        html += '<div class="timeline-item timeline-' + itemType + '" style="left: ' + position + '%">';
        html += '<div class="timeline-date-label">' + formattedDate + '</div>';
        html += '<div class="timeline-dot" ';
        html += 'data-index="' + i + '" ';
        html += 'data-type="' + itemType + '" ';
        html += 'data-date="' + formattedDate + '" ';
        html += 'data-label="' + typeLabel + '" ';
        html += 'data-content="' + tooltipContent + '" ';
        html += 'onclick="showTimelinePopup(event, this)" ';
        html += 'onmouseenter="showTimelinePopup(event, this)" ';
        html += 'onmouseleave="hideTimelinePopup()">';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

// Build the interactions list for the accordion
function buildInteractionsList(timeline, contact) {
    if (timeline.length === 0) {
        return '<p class="no-interactions">No interactions recorded yet. Add emails or calls using the buttons above.</p>';
    }
    
    var html = '';
    
    for (var i = 0; i < timeline.length; i++) {
        var item = timeline[i];
        var itemType = item.type.indexOf('email') >= 0 ? item.type : 'call';
        
        var icon = wvIcon('note');
        if (itemType === 'email-sent') icon = wvIcon('sent');
        else if (itemType === 'email-received') icon = wvIcon('inbox');
        else if (itemType === 'call') icon = wvIcon('call');
        
        var typeLabel = item.label || (itemType === 'call' ? 'Call' : 'Email');
        
        var details = '';
        if (itemType === 'call') {
            details = item.summary || 'No notes recorded';
        } else {
            details = item.subject || 'No subject';
        }
        
        html += '<div class="interaction-row interaction-' + itemType + '">';
        html += '<div class="interaction-row-left">';
        html += '<span class="interaction-row-icon">' + icon + '</span>';
        html += '<div class="interaction-row-info">';
        html += '<div class="interaction-row-top">';
        html += '<span class="interaction-row-type">' + wvEsc(typeLabel) + '</span>';
        html += '<span class="interaction-row-date">' + formatLocalDate(item.date) + '</span>';
        html += '</div>';
        html += '<div class="interaction-row-details">' + wvEsc(details) + '</div>';
        
        if (itemType === 'call' && item.extractedText) {
            html += '<details class="interaction-row-full-notes">';
            html += '<summary>Full notes</summary>';
            html += '<div class="interaction-row-full-notes-content">' + wvEsc(item.extractedText) + '</div>';
            html += '</details>';
        }
        
        html += '</div>';
        html += '</div>';
        html += '<div class="interaction-row-actions">';
        html += '<button class="interaction-row-edit" onclick="editTimelineItem(\'' + contact.id + '\', \'' + item.id + '\', \'' + item.itemType + '\', ' + item.itemIndex + ')" title="Edit" aria-label="Edit">' + wvIcon('edit', 15) + '</button>';
        html += '<button class="interaction-row-delete" onclick="deleteTimelineItem(\'' + contact.id + '\', \'' + item.id + '\', \'' + item.itemType + '\', ' + item.itemIndex + ')" title="Delete" aria-label="Delete">' + wvIcon('trash', 15) + '</button>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

// Track which section the user came from when viewing contact detail
let previousSectionId = 'contacts';

function showContactDetail(contactId) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) return;
    
    // Track the current active section before switching
    const currentActiveSection = document.querySelector('.section.active');
    if (currentActiveSection && currentActiveSection.id !== 'contact-detail') {
        previousSectionId = currentActiveSection.id;
    }
    
    // Hide all sections and show contact detail
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('contact-detail').classList.add('active');
    
    // Re-attach the back button handler when contact detail is shown
    const backToNetworkBtn = document.getElementById('back-to-network');
    if (backToNetworkBtn) {
        // Create a global function for the onclick handler
        window.goToMyNetwork = function() {
            console.log('goToMyNetwork called');
            const navLink = document.querySelector('a[href="#contacts"]');
            if (navLink) {
                navLink.click();
            } else {
                // Fallback
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.getElementById('contacts').classList.add('active');
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                const link = document.querySelector('a[href="#contacts"]');
                if (link) link.classList.add('active');
                if (typeof filterContacts === 'function') filterContacts();
            }
        };
        
        // Also attach as onclick handler
        backToNetworkBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.goToMyNetwork();
            return false;
        };
    }
    
    // Update nav link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    // Build timeline from emails and calls with unique IDs
    const timeline = [];
    if (contact.emails) {
        contact.emails.forEach((email, emailIndex) => {
            timeline.push({
                id: `email-${emailIndex}`,
                itemType: 'email',
                itemIndex: emailIndex,
                type: email.direction === 'received' ? 'email-received' : 'email-sent',
                date: email.date,
                label: email.direction === 'received' ? 'Reply received' : (email.type === 'cold' && !contact.emails.some(e => e.direction === 'received' && e.date <= email.date) ? 'Cold email Sent' : 'Email sent'),
                subject: email.subject || '',
                direction: email.direction,
                emailType: email.type
            });
        });
    }
    if (contact.notes) {
        contact.notes.forEach((note, noteIndex) => {
            timeline.push({
                id: `note-${noteIndex}`,
                itemType: 'note',
                itemIndex: noteIndex,
                type: 'call',
                date: note.date,
                summary: note.summary,
                imageUrl: note.imageUrl,
                extractedText: note.extractedText,
                isTextNote: note.isTextNote
            });
        });
    }
    
    // Sort timeline by date (using local date parsing to avoid timezone issues)
    timeline.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    
    // Get date range for timeline - always end at today
    const dates = timeline.map(t => parseLocalDate(t.date)).filter(d => d !== null);
    let minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    minDate.setHours(0, 0, 0, 0);
    
    // If no interactions, use first email date or 30 days ago as minimum
    if (dates.length === 0 && contact.firstEmailDate) {
        const firstDate = parseLocalDate(contact.firstEmailDate);
        if (firstDate) {
            minDate = firstDate;
            minDate.setHours(0, 0, 0, 0);
        }
    } else if (dates.length === 0) {
        minDate = new Date(today);
        minDate.setDate(minDate.getDate() - 30); // Default to 30 days ago
    }
    
    const maxDate = today; // Always use today as the max date
    const dateRange = maxDate - minDate || 1;
    
    // Calculate days since last contact (using local date parsing)
    let daysSinceLastContact = null;
    if (timeline.length > 0) {
        const lastContactDate = parseLocalDate(timeline[timeline.length - 1].date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (lastContactDate) {
            lastContactDate.setHours(0, 0, 0, 0);
            const diffTime = todayDate - lastContactDate;
            daysSinceLastContact = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
    }
    
    const content = document.getElementById('contact-detail-content');
    content.setAttribute('data-contact-id', contactId);
    content.innerHTML = `
        <div class="contact-detail-header">
            <div class="header-top">
                <h1 id="contact-detail-name">${escapeHtmlClub(contact.name)}</h1>
                <button class="btn btn-secondary" onclick="toggleEditMode('${contactId}')" id="edit-contact-btn">Edit</button>
            </div>
            <div class="contact-detail-info" id="contact-detail-info">
                <div class="info-row">
                    <div class="info-item">
                        <strong>Firm</strong>
                        <span id="contact-detail-firm">${escapeHtmlClub(contact.firm || 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <strong>Position</strong>
                        <span id="contact-detail-position">${escapeHtmlClub(contact.position || 'N/A')}</span>
                    </div>
                    <div class="info-item">
                        <strong>Priority</strong>
                        <span id="contact-detail-priority-display" class="priority-badge priority-${contact.priority || 'medium'}">${(contact.priority || 'medium').toLowerCase()}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item email-item full-width">
                        <strong>Email</strong>
                        <span id="contact-detail-email" class="email-value" title="${(contact.email || '').replace(/"/g, '&quot;')}">${escapeHtmlClub(contact.email || 'N/A')}</span>
                    </div>
                </div>
                <div class="info-row">
                    ${contact.firstEmailDate ? `<div class="info-item"><strong>First contact</strong><span>${formatLocalDate(contact.firstEmailDate)}</span></div>` : ''}
                    ${daysSinceLastContact !== null ? `
                        <div class="info-item">
                            <strong>Days since last contact</strong>
                            <span class="days-count ${daysSinceLastContact > 30 ? 'days-high' : daysSinceLastContact > 14 ? 'days-medium' : 'days-low'}">${daysSinceLastContact}</span>
                        </div>
                    ` : '<div class="info-item"><strong>Days since last contact</strong><span class="days-count">No contact yet</span></div>'}
                </div>
            </div>
            <div id="contact-edit-form" class="contact-edit-form" style="display: none;">
                <form id="edit-contact-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-contact-name">Name *</label>
                            <input type="text" id="edit-contact-name" value="${escapeHtmlClub(contact.name)}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-contact-email">Email</label>
                            <input type="email" id="edit-contact-email" value="${escapeHtmlClub(contact.email || '')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-contact-firm">Firm</label>
                            <input type="text" id="edit-contact-firm" value="${escapeHtmlClub(contact.firm || '')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-contact-position">Position</label>
                            <input type="text" id="edit-contact-position" value="${escapeHtmlClub(contact.position || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-contact-priority-form">Priority</label>
                        <select id="edit-contact-priority-form">
                            <option value="low" ${contact.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${contact.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${contact.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div class="edit-form-actions">
                        <button type="submit" class="btn btn-primary">Save changes</button>
                        <button type="button" class="btn btn-secondary" onclick="toggleEditMode('${contactId}', false)">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="general-notes-section">
            <div class="accordion-item" id="general-notes-accordion">
                <button class="accordion-header" onclick="toggleGeneralNotes()">
                    <span>General notes</span>
                    <span class="accordion-icon" id="general-notes-icon">+</span>
                </button>
                <div class="accordion-content" id="general-notes-content">
                    <div class="accordion-content-inner">
                        <textarea 
                            id="general-notes-textarea" 
                            class="general-notes-textarea" 
                            placeholder="Add any notes about this contact here..."
                            oninput="saveGeneralNotes('${contactId}')"
                        >${escapeHtmlClub(contact.generalNotes || '')}</textarea>
                        <p class="notes-hint">Notes are saved automatically as you type.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="timeline-section">
            <h2>Timeline</h2>
            <div class="timeline-container">
                <div class="timeline-line"></div>
                ${buildTimelineItems(timeline, contact)}
                <div class="timeline-today-marker">
                    <div class="timeline-today-line"></div>
                    <div class="timeline-today-label">Today<br>${formatLocalDate(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'))}</div>
                </div>
            </div>

            <div id="timeline-popup" class="timeline-popup" style="display: none;">
                <div class="timeline-popup-header">
                    <span class="timeline-popup-type"></span>
                    <span class="timeline-popup-date"></span>
                </div>
                <div class="timeline-popup-content"></div>
            </div>

            <div class="timeline-legend">
                <div class="legend-item">
                    <span class="legend-dot legend-email-sent"></span>
                    <span>Email sent</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-email-received"></span>
                    <span>Reply received</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-email-both"></span>
                    <span>Sent and replied</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-call"></span>
                    <span>Call</span>
                </div>
            </div>

            <div class="quick-actions">
                <button class="btn btn-primary" onclick="openQuickAdd('email-sent', '${contact.id}')">Log email sent</button>
                <button class="btn btn-primary" onclick="openQuickAdd('email-received', '${contact.id}')">Log reply</button>
                <button class="btn btn-primary" onclick="openQuickAdd('call', '${contact.id}')">Log call</button>
            </div>

            <div class="interactions-accordion">
                <button class="interactions-accordion-header" type="button" onclick="toggleInteractionsAccordion()">
                    <span>All interactions (${timeline.length})</span>
                    <span class="interactions-accordion-icon" id="interactions-accordion-icon">+</span>
                </button>
                <div class="interactions-accordion-content" id="interactions-accordion-content">
                    ${buildInteractionsList(timeline, contact)}
                </div>
            </div>
        </div>
        
        <div class="call-notes-section">
            <h2>Call notes</h2>
            ${contact.notes && contact.notes.length > 0 ? `
                <div class="call-notes-grid">
                    ${contact.notes.map((note, index) => `
                        <div class="call-note-card">
                            <div class="call-note-header">
                                <h3>Call #${contact.notes.length - index}</h3>
                                <p class="call-note-date">${formatLocalDate(note.date)}</p>
                            </div>
                            <div class="call-note-content">
                                ${note.imageUrl ? `
                                    <div class="call-note-image">
                                        <img src="${escapeHtmlClub(note.imageUrl)}" alt="Call notes ${index + 1}">
                                    </div>
                                ` : ''}
                                <div class="call-note-summary">
                                    <h4>Summary</h4>
                                    <p>${escapeHtmlClub(note.summary)}</p>
                                    ${note.extractedText ? `
                                        <details class="extracted-text-details">
                                            <summary>Show full text</summary>
                                            <div class="extracted-text-content">
                                                <pre>${escapeHtmlClub(note.extractedText)}</pre>
                                            </div>
                                        </details>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="text-align: center; color: var(--text-medium); padding: 2rem;">No call notes yet</p>'}
        </div>
    `;
}

function showCallNotes(contactId) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    const modal = document.getElementById('call-notes-modal');
    const content = document.getElementById('call-notes-content');
    
    if (!contact || !contact.notes || contact.notes.length === 0) {
        content.innerHTML = '<p>No call notes available for this contact.</p>';
    } else {
        content.innerHTML = `
            <h3 style="color: var(--light-accent); margin-bottom: 1rem;">Call notes: ${escapeHtmlClub(contact.name)}</h3>
            ${contact.notes.map((note, index) => `
                <div class="call-note-item">
                    <h4>Note #${contact.notes.length - index}</h4>
                    <p class="call-note-date">Date: ${formatLocalDate(note.date)}</p>
                    <p>${escapeHtmlClub(note.summary)}</p>
                </div>
            `).join('')}
        `;
    }
    
    modal.classList.add('active');
}

// Edit timeline item (email or call)
window.editTimelineItem = function(contactId, itemId, itemType, itemIndex) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    let item;
    if (itemType === 'email') {
        item = contact.emails[itemIndex];
        if (!item) return;
    } else if (itemType === 'note') {
        item = contact.notes[itemIndex];
        if (!item) return;
    } else {
        return;
    }
    
    // Create or get edit modal
    let modal = document.getElementById('timeline-edit-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'timeline-edit-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 id="timeline-edit-title">Edit entry</h2>
                <form id="timeline-edit-form">
                    <div class="form-group">
                        <label for="timeline-edit-date">Date *</label>
                        <input type="date" id="timeline-edit-date" max="" required>
                    </div>
                    <div id="timeline-edit-email-fields" style="display: none;">
                        <div class="form-group">
                            <label for="timeline-edit-email-direction">Direction</label>
                            <select id="timeline-edit-email-direction">
                                <option value="sent">Sent</option>
                                <option value="received">Received</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="timeline-edit-email-type">Type</label>
                            <select id="timeline-edit-email-type">
                                <option value="cold">Cold email</option>
                                <option value="follow-up">Follow-up</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="timeline-edit-email-subject">Subject/Notes</label>
                            <input type="text" id="timeline-edit-email-subject" placeholder="Optional">
                        </div>
                    </div>
                    <div id="timeline-edit-note-fields" style="display: none;">
                        <div class="form-group">
                            <label for="timeline-edit-note-summary">Summary</label>
                            <textarea id="timeline-edit-note-summary" rows="4" placeholder="Call notes summary"></textarea>
                        </div>
                    </div>
                    <div id="timeline-edit-status" class="upload-status" style="display: none;"></div>
                    <div class="edit-form-actions">
                        <button type="submit" class="btn btn-primary">Save changes</button>
                        <button type="button" class="btn btn-secondary" onclick="closeTimelineEditModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', closeTimelineEditModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTimelineEditModal();
        });
        
        // Form submission
        document.getElementById('timeline-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const modal = document.getElementById('timeline-edit-modal');
            const contactId = modal.getAttribute('data-contact-id');
            const itemType = modal.getAttribute('data-item-type');
            const itemIndex = parseInt(modal.getAttribute('data-item-index'));
            saveTimelineItemEdit(contactId, itemType, itemIndex);
        });
    }
    
    // Populate form with current values and set max date
    const today = new Date().toISOString().split('T')[0];
    const editDateInput = document.getElementById('timeline-edit-date');
    editDateInput.value = item.date;
    editDateInput.setAttribute('max', today);
    
    if (itemType === 'email') {
        document.getElementById('timeline-edit-title').textContent = 'Edit email';
        document.getElementById('timeline-edit-email-fields').style.display = 'block';
        document.getElementById('timeline-edit-note-fields').style.display = 'none';
        // Use direction and emailType from timeline item, with defaults
        const direction = item.direction || 'sent';
        const emailType = item.emailType || 'follow-up';
        document.getElementById('timeline-edit-email-direction').value = direction;
        document.getElementById('timeline-edit-email-type').value = emailType;
        document.getElementById('timeline-edit-email-subject').value = item.subject || '';
    } else {
        document.getElementById('timeline-edit-title').textContent = 'Edit call';
        document.getElementById('timeline-edit-email-fields').style.display = 'none';
        document.getElementById('timeline-edit-note-fields').style.display = 'block';
        document.getElementById('timeline-edit-note-summary').value = item.summary || '';
    }
    
    modal.classList.add('active');
    modal.setAttribute('data-contact-id', contactId);
    modal.setAttribute('data-item-type', itemType);
    modal.setAttribute('data-item-index', itemIndex);
};

// Close timeline edit modal
window.closeTimelineEditModal = function() {
    const modal = document.getElementById('timeline-edit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// Save timeline item edit
function saveTimelineItemEdit(contactId, itemType, itemIndex) {
    const contacts = getContacts();
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) return;
    
    const contact = contacts[contactIndex];
    const date = document.getElementById('timeline-edit-date').value;
    const status = document.getElementById('timeline-edit-status');
    
    if (!date) {
        status.textContent = 'Please select a date';
        status.className = 'upload-status error';
        status.style.display = 'block';
        return;
    }
    
    // Validate date is not in the future
    const dateValidation = validateDateNotFuture(date, 'Date');
    if (!dateValidation.valid) {
        status.textContent = dateValidation.message;
        status.className = 'upload-status error';
        status.style.display = 'block';
        return;
    }
    
    // Update the item in the contact
    if (itemType === 'email') {
        const direction = document.getElementById('timeline-edit-email-direction').value;
        const emailType = document.getElementById('timeline-edit-email-type').value;
        const subject = document.getElementById('timeline-edit-email-subject').value;
        
        if (contact.emails && contact.emails[itemIndex]) {
            contact.emails[itemIndex].date = date;
            contact.emails[itemIndex].direction = direction;
            contact.emails[itemIndex].type = emailType;
            contact.emails[itemIndex].subject = subject;
        }
    } else if (itemType === 'note') {
        const summary = document.getElementById('timeline-edit-note-summary').value;
        
        if (contact.notes && contact.notes[itemIndex]) {
            contact.notes[itemIndex].date = date;
            contact.notes[itemIndex].summary = summary;
        }
    }
    
    // Update the contact in the array (ensure reference is maintained)
    contacts[contactIndex] = contact;
    
    // Save the updated contacts
    saveContacts(contacts);
    closeTimelineEditModal();
    
    // Immediately refresh the entire contact detail view to show updated dates
    // This rebuilds the timeline and call notes sections with the new date
    showContactDetail(contactId);
}

// Delete timeline item
window.deleteTimelineItem = async function(contactId, itemId, itemType, itemIndex) {
    if (!(await wvConfirm('This interaction will be removed from the timeline. This can’t be undone.', { title: 'Delete this item?', confirmLabel: 'Delete', danger: true }))) {
        return;
    }
    
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    if (itemType === 'email') {
        if (contact.emails && contact.emails[itemIndex]) {
            contact.emails.splice(itemIndex, 1);
        }
    } else if (itemType === 'note') {
        if (contact.notes && contact.notes[itemIndex]) {
            contact.notes.splice(itemIndex, 1);
        }
    }
    
    saveContacts(contacts);
    showContactDetail(contactId); // Refresh the view
};

function exportToExcel() {
    const contacts = getContacts();
    
    if (contacts.length === 0) {
        wvToast('No contacts to export. Please add contacts first.');
        return;
    }
    
    // Sort contacts alphabetically
    const sortedContacts = [...contacts].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // Get all unique firms
    const firms = [...new Set(contacts.map(c => c.firm).filter(f => f))].sort();
    
    // Create CSV content for all contacts tab
    // Include all possible fields
    const baseHeaders = ['Name', 'Firm', 'Position', 'Email', 'Phone', 'Location', 'First Email Date', 'Last Email Date', 'Number of Emails Sent', 'Number of Emails Received', 'Number of Calls', 'Priority'];
    
    // Collect all additional data column names
    const additionalColumns = new Set();
    sortedContacts.forEach(contact => {
        if (contact.additionalData) {
            Object.keys(contact.additionalData).forEach(key => additionalColumns.add(key));
        }
    });
    
    const allHeaders = [...baseHeaders, ...Array.from(additionalColumns).sort()];
    
    const allContactsRows = sortedContacts.map(contact => {
        const emailsSent = contact.emails ? contact.emails.filter(e => e.direction === 'sent' || !e.direction).length : 0;
        const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
        const callCount = contact.notes ? contact.notes.length : 0;
        const lastEmailDate = contact.emails && contact.emails.length > 0 
            ? contact.emails[contact.emails.length - 1].date 
            : '';
        
        const baseRow = [
            contact.name || '',
            contact.firm || '',
            contact.position || '',
            contact.email || '',
            contact.phone || '',
            contact.location || '',
            contact.firstEmailDate || '',
            lastEmailDate,
            emailsSent,
            emailsReceived,
            callCount,
            contact.priority || 'medium'
        ];
        
        // Add additional data columns
        const additionalRow = Array.from(additionalColumns).map(col => {
            return contact.additionalData && contact.additionalData[col] ? contact.additionalData[col] : '';
        });
        
        return [...baseRow, ...additionalRow];
    });
    
    // Create CSV with multiple sections (tabs simulated with headers)
    let csvContent = '=== ALL CONTACTS ===\n';
    csvContent += allHeaders.join(',') + '\n';
    csvContent += allContactsRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    // Add firm-specific tabs
    firms.forEach(firm => {
        const firmContacts = sortedContacts.filter(c => c.firm === firm);
        csvContent += `\n\n=== ${firm.toUpperCase()} ===\n`;
        csvContent += allHeaders.join(',') + '\n';
        const firmRows = firmContacts.map(contact => {
            const emailsSent = contact.emails ? contact.emails.filter(e => e.direction === 'sent' || !e.direction).length : 0;
            const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
            const callCount = contact.notes ? contact.notes.length : 0;
            const lastEmailDate = contact.emails && contact.emails.length > 0 
                ? contact.emails[contact.emails.length - 1].date 
                : '';
            
            const baseRow = [
                contact.name || '',
                contact.firm || '',
                contact.position || '',
                contact.email || '',
                contact.phone || '',
                contact.location || '',
                contact.firstEmailDate || '',
                lastEmailDate,
                emailsSent,
                emailsReceived,
                callCount,
                contact.priority || 'medium'
            ];
            
            // Add additional data columns
            const additionalRow = Array.from(additionalColumns).map(col => {
                return contact.additionalData && contact.additionalData[col] ? contact.additionalData[col] : '';
            });
            
            return [...baseRow, ...additionalRow];
        });
        csvContent += firmRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `weaver-contacts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    const exportBtn = document.getElementById('export-excel');
    const originalText = exportBtn.textContent;
    exportBtn.textContent = 'Exported';
    exportBtn.style.background = 'var(--success)';
    setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.background = '';
    }, 2000);
}

// Delete all contacts function
async function deleteAllContacts() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        wvToast('Please log in first');
        return;
    }
    
    const contacts = getContacts();
    const contactCount = contacts.length;
    
    if (contactCount === 0) {
        wvToast('No contacts to delete');
        return;
    }
    
    const confirmed = await wvConfirm(
        `All ${contactCount} contact${contactCount !== 1 ? 's' : ''}, with their emails, notes and interactions, will be permanently deleted. This can’t be undone. Export first if you want a copy.`,
        { title: 'Delete all contacts?', confirmLabel: 'Delete all', danger: true }
    );
    if (!confirmed) return;

    // Clear all contacts
    saveContacts([]);
    
    // Update UI
    updateContactDropdown();
    updateFirmFilter();
    filterContacts();
    
    // Show success message
    wvToast(`All ${contactCount} contact${contactCount !== 1 ? 's' : ''} have been deleted.`);
    
    console.log(`Deleted all ${contactCount} contacts for user ${currentUser.id}`);
}

// Quick add functions (global)
let currentContactIdForQuickAdd = null;
let currentQuickAddType = null;
let quickAddNotesMode = 'text'; // 'text' or 'image'

// Make variables globally accessible
window.currentContactIdForQuickAdd = null;
window.currentQuickAddType = null;

// Global function to close modal
window.closeQuickAddModal = function() {
    const modal = document.getElementById('quick-add-modal');
    const form = document.getElementById('quick-add-form');
    if (modal) {
        modal.classList.remove('active');
    }
    if (form) {
        form.reset();
    }
    const status = document.getElementById('quick-add-status');
    if (status) {
        status.textContent = '';
        status.className = '';
        status.style.display = 'none';
    }
    currentQuickAddType = null;
    currentContactIdForQuickAdd = null;
    window.currentQuickAddType = null;
    window.currentContactIdForQuickAdd = null;
    console.log('Modal closed via global function');
};

window.openQuickAdd = function(type, contactId) {
    currentContactIdForQuickAdd = contactId;
    currentQuickAddType = type;
    window.currentContactIdForQuickAdd = contactId;
    window.currentQuickAddType = type;
    console.log('openQuickAdd called:', type, contactId);
    console.log('handleQuickAddSubmit available:', typeof window.handleQuickAddSubmit);
    const modal = document.getElementById('quick-add-modal');
    const form = document.getElementById('quick-add-form');
    const title = document.getElementById('quick-add-title');
    const dateInput = document.getElementById('quick-add-date');
    const emailTypeDiv = document.getElementById('quick-add-email-type');
    const emailSubjectDiv = document.getElementById('quick-add-email-subject');
    const notesTextDiv = document.getElementById('quick-add-notes-text');
    const notesImageDiv = document.getElementById('quick-add-notes-image');
    
    // Reset form
    form.reset();
    // Get today's date in YYYY-MM-DD format using local time (not UTC)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    dateInput.value = todayString;
    // Set max to today to prevent selecting future dates
    dateInput.setAttribute('max', todayString);
    dateInput.max = todayString; // Also set the property directly
    document.getElementById('quick-add-status').style.display = 'none';
    document.getElementById('quick-notes-preview').style.display = 'none';
    
    // Show/hide relevant fields
    emailTypeDiv.style.display = 'none';
    emailSubjectDiv.style.display = 'none';
    const notesToggleDiv = document.getElementById('quick-add-notes-toggle');
    if (notesToggleDiv) notesToggleDiv.style.display = 'none';
    notesTextDiv.style.display = 'none';
    notesImageDiv.style.display = 'none';
    
    // Reset notes mode
    quickAddNotesMode = 'text';
    
    if (type === 'email-sent' || type === 'email-received') {
        title.textContent = type === 'email-sent' ? 'Log email sent' : 'Log reply';
        // Don't show email type dropdown since we already know the direction from the button
        emailTypeDiv.style.display = 'none';
        // Remove required attribute from hidden email type field
        const emailTypeSelect = document.getElementById('quick-email-type');
        if (emailTypeSelect) {
            emailTypeSelect.removeAttribute('required');
        }
        emailSubjectDiv.style.display = 'block';
        // Change textarea to empty
        document.getElementById('quick-email-subject').value = '';
    } else if (type === 'call') {
        title.textContent = 'Log a call';
        
        // Show toggle and default to text mode
        const notesToggleDiv = document.getElementById('quick-add-notes-toggle');
        if (notesToggleDiv) {
            notesToggleDiv.style.display = 'block';
        }
        
        // Reset to text mode
        quickAddNotesMode = 'text';
        toggleQuickAddNotesMode('text');
        
        // Update button text to "Add Call"
        const submitButton = document.getElementById('quick-add-submit-btn');
        if (submitButton) {
            submitButton.textContent = 'Log a call';
            submitButton.innerHTML = 'Log a call'; // Also update innerHTML
        }
    } else {
        // Reset button text for other interaction types
        const submitButton = document.getElementById('quick-add-submit-btn');
        if (submitButton) {
            submitButton.textContent = 'Log an interaction';
            submitButton.innerHTML = 'Log an interaction';
        }
    }
    
    modal.classList.add('active');
    
    // Ensure button handler is attached when modal opens
    setTimeout(() => {
        const submitButton = document.getElementById('quick-add-submit-btn');
        if (submitButton) {
            // Remove any existing handlers first
            submitButton.onclick = null;
            // Set direct onclick handler - simple and reliable
            submitButton.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add Interaction button clicked, type:', window.currentQuickAddType);
                console.log('Contact ID:', window.currentContactIdForQuickAdd);
                if (typeof window.handleQuickAddSubmit === 'function') {
                    window.handleQuickAddSubmit(e);
                } else {
                    console.error('handleQuickAddSubmit not found');
                    wvToast('Error: Please refresh the page.');
                }
                return false;
            };
        }
    }, 50);
}


window.updateContactPriority = function(contactId, priority) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    
    if (contact) {
        contact.priority = priority;
        saveContacts(contacts);
        // Update the display
        const priorityBadge = document.querySelector('.priority-badge');
        if (priorityBadge) {
            priorityBadge.textContent = priority.toLowerCase();
            priorityBadge.className = `priority-badge priority-${priority}`;
        }
    }
}

window.toggleEditMode = function(contactId, showEdit = null) {
    const editForm = document.getElementById('contact-edit-form');
    const detailInfo = document.getElementById('contact-detail-info');
    const editBtn = document.getElementById('edit-contact-btn');
    
    if (showEdit === null) {
        // Toggle
        showEdit = editForm.style.display === 'none';
    }
    
    if (showEdit) {
        editForm.style.display = 'block';
        detailInfo.style.display = 'none';
        editBtn.textContent = 'Cancel';
        editBtn.onclick = () => toggleEditMode(contactId, false);
    } else {
        editForm.style.display = 'none';
        detailInfo.style.display = 'grid';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => toggleEditMode(contactId, true);
    }
};

// Handle edit contact form submission - use event delegation
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'edit-contact-form') {
        e.preventDefault();
        
        // Get contact ID from the form's context
        const contactDetail = document.getElementById('contact-detail-content');
        const contactId = contactDetail ? contactDetail.getAttribute('data-contact-id') : null;
        
        if (!contactId) return;
        
        const name = document.getElementById('edit-contact-name').value;
        const email = document.getElementById('edit-contact-email').value;
        const firm = document.getElementById('edit-contact-firm').value;
        const position = document.getElementById('edit-contact-position').value;
        const priority = document.getElementById('edit-contact-priority-form').value;
        
        const contacts = getContacts();
        const contact = contacts.find(c => c.id === contactId);
        
        if (contact) {
            contact.name = name;
            contact.email = email;
            contact.firm = firm;
            contact.position = position;
            contact.priority = priority;
            
            saveContacts(contacts);
            updateContactDropdown();
            updateFirmFilter();
            filterContacts(); // Refresh the network view
            showContactDetail(contactId); // Refresh the detail view
        }
    }
});

// Column name synonyms mapping
const columnSynonyms = {
    // Name synonyms
    'name': ['name', 'full name', 'contact name', 'person', 'contact'],
    // Company synonyms (firm is a synonym)
    'company': ['company', 'firm', 'bank', 'organization', 'org', 'employer', 'corporation', 'corp', 'business'],
    // Contact Date synonyms (date is a synonym)
    'contactdate': ['contact date', 'date', 'first email date', 'first contact', 'first contact date', 'email date', 'initial contact'],
    // Optional field synonyms
    'position': ['position', 'title', 'role', 'job title', 'position title'],
    'phone': ['phone', 'phone number', 'mobile', 'mobile number', 'cell', 'cell phone', 'telephone'],
    'location': ['location', 'city', 'address', 'location city', 'city location'],
    'email': ['email', 'email address', 'e-mail', 'e-mail address'],
    'priority': ['priority', 'priority level', 'importance']
};

// Normalize column name using synonyms
function normalizeColumnName(columnName) {
    if (!columnName) return null;
    
    const normalized = columnName.toLowerCase().trim();
    console.log(`normalizeColumnName: "${columnName}" -> "${normalized}"`);
    
    // First, try exact matches (most precise)
    for (const [standardName, synonyms] of Object.entries(columnSynonyms)) {
        if (synonyms.some(syn => normalized === syn)) {
            console.log(`  → Exact match to "${standardName}"`);
            return standardName;
        }
    }
    
    // Then try includes matches (for partial matches like "contact date" matching "date")
    // But prioritize longer matches to avoid "date" matching when it should be "contact date"
    let bestMatch = null;
    let bestMatchLength = 0;
    
    for (const [standardName, synonyms] of Object.entries(columnSynonyms)) {
        for (const syn of synonyms) {
            // Check if normalized includes the synonym or synonym includes normalized
            if (normalized.includes(syn) || syn.includes(normalized)) {
                // Prefer longer matches (e.g., "contact date" over "date")
                if (syn.length > bestMatchLength) {
                    bestMatch = standardName;
                    bestMatchLength = syn.length;
                }
            }
        }
    }
    
    if (bestMatch) {
        console.log(`  → Partial match to "${bestMatch}" (best match length: ${bestMatchLength})`);
        return bestMatch;
    }
    
    // Return original if no match found (will be stored as additional data)
    console.log(`  → No match, returning normalized: "${normalized}"`);
    return normalized;
}

// Find header row by looking for common column name patterns
function findHeaderRow(lines) {
    const commonHeaders = ['name', 'company', 'firm', 'date', 'contact date', 'email', 'position', 'phone'];
    let bestMatch = { index: 0, score: 0 };
    
    // Check first 20 rows (should be enough to find headers)
    const maxRowsToCheck = Math.min(20, lines.length);
    
    for (let i = 0; i < maxRowsToCheck; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        // Split the line and check if it contains header-like words (use robust parser)
        const potentialHeaders = parseCSVLine(line).map(h => h.toLowerCase().trim()).filter(h => h);
        
        if (potentialHeaders.length === 0) continue;
        
        // Count how many potential headers match common patterns
        let matchCount = 0;
        let nameFound = false;
        let companyFound = false;
        let dateFound = false;
        
        potentialHeaders.forEach(header => {
            const normalized = normalizeColumnName(header);
            if (normalized === 'name') {
                matchCount += 3; // Name is critical, give it more weight
                nameFound = true;
            } else if (normalized === 'company') {
                matchCount += 2;
                companyFound = true;
            } else if (normalized === 'contactdate') {
                matchCount += 2;
                dateFound = true;
            } else if (normalized === 'email') {
                matchCount += 1;
            } else if (normalized === 'position' || normalized === 'phone' || normalized === 'location') {
                matchCount += 1;
            }
            
            // Also check direct matches
            if (commonHeaders.some(ch => header.includes(ch) || ch.includes(header))) {
                matchCount += 0.5;
            }
        });
        
        // Calculate score: prioritize rows with name column
        let score = matchCount;
        if (nameFound) score += 5; // Big bonus for having name column
        if (companyFound || dateFound) score += 2; // Bonus for having company or date
        
        // If this row has a name column and at least one other recognized column, it's likely the header
        if (nameFound && (companyFound || dateFound || matchCount > 2)) {
            if (score > bestMatch.score) {
                bestMatch = { index: i, score: score };
            }
        }
    }
    
    // If we found a good match, use it
    if (bestMatch.score > 5) {
        console.log(`Found header row at index ${bestMatch.index} with score ${bestMatch.score}`);
        return bestMatch.index;
    }
    
    // Fallback: If no header found, assume first non-empty line is header
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
            console.log(`No clear header found, using first non-empty line at index ${i}`);
            return i;
        }
    }
    
    return 0;
}

// Parse CSV file
function parseCSV(csvText) {
    console.log('parseCSV called, text length:', csvText ? csvText.length : 0);
    
    // Split into lines, keeping empty lines for context
    const allLines = csvText.split('\n');
    console.log('Total lines:', allLines.length);
    if (allLines.length === 0) return [];
    
    // Find the header row
    const headerRowIndex = findHeaderRow(allLines);
    console.log('Header row index:', headerRowIndex);
    
    // Parse header row using robust CSV parser
    const headerLine = allLines[headerRowIndex];
    if (!headerLine) {
        console.error('No header line found at index', headerRowIndex);
        return [];
    }
    
    console.log('Header line:', headerLine);
    const headers = parseCSVLine(headerLine.trim());
    console.log('Parsed headers:', headers);
    const normalizedHeaders = headers.map(h => normalizeColumnName(h));
    console.log('Normalized headers:', normalizedHeaders);
    
        // First, find all column indices ONCE before processing rows
        let nameColumnIndex = -1;
        let emailColumnIndex = -1;
        let companyColumnIndex = -1;
        let dateColumnIndex = -1;
        let positionColumnIndex = -1;
        let phoneColumnIndex = -1;
        let locationColumnIndex = -1;
        let priorityColumnIndex = -1;
        
        normalizedHeaders.forEach((normalized, index) => {
            if (normalized === 'name') {
                nameColumnIndex = index;
            } else if (normalized === 'email') {
                emailColumnIndex = index;
            } else if (normalized === 'company') {
                companyColumnIndex = index;
            } else if (normalized === 'contactdate') {
                dateColumnIndex = index;
            } else if (normalized === 'position') {
                positionColumnIndex = index;
            } else if (normalized === 'phone') {
                phoneColumnIndex = index;
            } else if (normalized === 'location') {
                locationColumnIndex = index;
            } else if (normalized === 'priority') {
                priorityColumnIndex = index;
            }
        });
        
        console.log('Column indices:', {
            name: nameColumnIndex,
            email: emailColumnIndex,
            company: companyColumnIndex,
            date: dateColumnIndex,
            position: positionColumnIndex,
            phone: phoneColumnIndex,
            location: locationColumnIndex,
            priority: priorityColumnIndex
        });
        
        // First, scan all date values to detect missing years
        const allDateValues = [];
        for (let i = headerRowIndex + 1; i < allLines.length; i++) {
            const line = allLines[i].trim();
            if (!line) continue;
            
            const values = parseCSVLine(line);
            if (values.length === 0 || values.every(v => !v || !v.trim())) continue;
            
            if (dateColumnIndex >= 0 && dateColumnIndex < values.length) {
                const dateValue = (values[dateColumnIndex] || '').trim();
                if (dateValue) {
                    allDateValues.push(dateValue);
                }
            }
        }
        
        // Check if any dates are missing years and prompt once
        const defaultYear = detectAndPromptForMissingYear(allDateValues);
        
        // Parse data rows (start from row after header)
        const contacts = [];
        for (let i = headerRowIndex + 1; i < allLines.length; i++) {
            const line = allLines[i].trim();
            if (!line) continue; // Skip empty rows
            
            // Handle CSV parsing more robustly (account for quoted fields with commas)
            const values = parseCSVLine(line);
            if (values.length === 0 || values.every(v => !v || !v.trim())) continue; // Skip empty rows
            
            console.log(`\n=== Processing Row ${i} ===`);
            console.log('Raw values:', values);
            console.log('Values count:', values.length, 'Headers count:', headers.length);
            
            // Create ONE contact for this row
            const contact = {
                id: Date.now().toString() + i + Math.random().toString(36).substr(2, 9),
                emails: [],
                notes: [],
                priority: 'medium' // Default priority
            };
            
            const additionalData = {};
            
            // Process each column value and map it to the contact
            values.forEach((value, index) => {
                if (index >= headers.length) {
                    // Extra column beyond headers - store as additional data
                    if (value && value.trim()) {
                        additionalData[`Column${index + 1}`] = value.trim();
                    }
                    return;
                }
                
                const header = headers[index];
                const normalizedHeader = normalizedHeaders[index];
                const trimmedValue = (value || '').trim();
                
                if (!trimmedValue) return; // Skip empty values
                
                console.log(`  Column ${index} ("${header}" -> "${normalizedHeader}"): "${trimmedValue}"`);
                
                // Map based on column type
                if (index === nameColumnIndex || normalizedHeader === 'name') {
                    // Validate that this doesn't look like a date
                    const looksLikeDate = /^\d{1,2}[\/\-]\d{1,2}/.test(trimmedValue) || 
                                         /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(trimmedValue);
                    if (!looksLikeDate) {
                        contact.name = trimmedValue;
                        console.log(`    ✓ Set name: "${contact.name}"`);
                    } else {
                        console.warn(`    ✗ Skipped name (looks like date): "${trimmedValue}"`);
                    }
                } else if (index === emailColumnIndex || normalizedHeader === 'email') {
                    // Always set email if this is the email column, even if it doesn't have @
                    // (some email formats might be different)
                    contact.email = trimmedValue;
                    console.log(`    ✓ Set email: "${contact.email}" (from column ${index})`);
                    if (!trimmedValue.includes('@')) {
                        console.warn(`    ⚠ Warning: Email value doesn't contain '@': "${trimmedValue}"`);
                    }
                } else if (index === companyColumnIndex || normalizedHeader === 'company') {
                    contact.firm = trimmedValue;
                    console.log(`    ✓ Set firm: "${contact.firm}"`);
                } else if (index === dateColumnIndex || normalizedHeader === 'contactdate') {
                    console.log(`    Processing date value: "${trimmedValue}"`);
                    // Parse multiple dates separated by commas, colons, or semicolons
                    const dates = parseMultipleDates(trimmedValue, defaultYear);
                    console.log(`    Parsed dates:`, dates);
                    if (dates && dates.length > 0) {
                        // Set first date as firstEmailDate
                        contact.firstEmailDate = dates[0];
                        // Create email entries for each date
                        if (!contact.emails) contact.emails = [];
                        dates.forEach(date => {
                            contact.emails.push({
                                date: date,
                                direction: 'sent',
                                type: contact.emails.filter(e => e.direction === 'sent' || !e.direction).length === 0 ? 'cold' : 'follow-up',
                                subject: ''
                            });
                        });
                        // Sort emails by date to ensure proper ordering
                        contact.emails.sort((a, b) => a.date.localeCompare(b.date));
                        console.log(`    ✓ Set date(s): ${dates.length} date(s) added, firstEmailDate: ${contact.firstEmailDate}`);
                    } else {
                        console.warn(`    ✗ Failed to parse date: "${trimmedValue}"`);
                    }
                } else if (index === positionColumnIndex || normalizedHeader === 'position') {
                    contact.position = trimmedValue;
                    console.log(`    ✓ Set position: "${contact.position}"`);
                } else if (index === phoneColumnIndex || normalizedHeader === 'phone') {
                    contact.phone = trimmedValue;
                    console.log(`    ✓ Set phone: "${contact.phone}"`);
                } else if (index === locationColumnIndex || normalizedHeader === 'location') {
                    contact.location = trimmedValue;
                    console.log(`    ✓ Set location: "${contact.location}"`);
                } else if (index === priorityColumnIndex || normalizedHeader === 'priority') {
                    const priorityValue = trimmedValue.toLowerCase();
                    if (['low', 'medium', 'high'].includes(priorityValue)) {
                        contact.priority = priorityValue;
                        console.log(`    ✓ Set priority: "${contact.priority}"`);
                    }
                } else {
                    // Store any other columns as additional data
                    additionalData[header] = trimmedValue;
                    console.log(`    → Stored as additional data: "${header}" = "${trimmedValue}"`);
                }
            });
            
            // If name wasn't set from name column, try to find it
            if (!contact.name) {
                console.log('  Name not found in name column, searching for name...');
                for (let idx = 0; idx < values.length; idx++) {
                    // Skip if this is a known column type
                    if (idx === dateColumnIndex || idx === emailColumnIndex || 
                        idx === companyColumnIndex || idx === phoneColumnIndex) continue;
                    
                    const testValue = (values[idx] || '').trim();
                    if (!testValue) continue;
                    
                    // Skip if it looks like a date
                    if (/^\d{1,2}[\/\-]\d{1,2}/.test(testValue)) continue;
                    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(testValue)) continue;
                    // Skip if it looks like an email
                    if (testValue.includes('@')) continue;
                    // Skip if it's all numbers
                    if (/^\d+$/.test(testValue)) continue;
                    // Skip if it's very short
                    if (testValue.length < 2) continue;
                    
                    // This might be the name
                    contact.name = testValue;
                    console.log(`  ✓ Auto-detected name from column ${idx}: "${contact.name}"`);
                    break;
                }
            }
            
            // Store additional data if any
            if (Object.keys(additionalData).length > 0) {
                contact.additionalData = additionalData;
            }
            
            // Only add contact if it has a name (required field)
            if (contact.name && contact.name.trim()) {
                contacts.push(contact);
                console.log(`✓ Added contact:`, {
                    name: contact.name,
                    email: contact.email || 'N/A',
                    firm: contact.firm || 'N/A',
                    firstEmailDate: contact.firstEmailDate || 'N/A',
                    position: contact.position || 'N/A',
                    phone: contact.phone || 'N/A',
                    location: contact.location || 'N/A',
                    emailsCount: contact.emails.length
                });
            } else {
                console.error(`✗ Skipped row ${i} - missing name. Values:`, values);
            }
        }
    
    console.log('parseCSV returning', contacts.length, 'contacts');
    return contacts;
}

// Parse a CSV line, handling quoted fields that may contain commas
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    values.push(current.trim());
    
    return values;
}

// Parse multiple dates from a single cell (separated by commas, colons, semicolons)
function parseMultipleDates(dateString, defaultYear = null) {
    if (!dateString) return [];
    
    // Split by common separators (comma, colon, semicolon)
    const dateStrings = dateString.split(/[,;:]/).map(s => s.trim()).filter(s => s);
    const parsedDates = [];
    
    dateStrings.forEach(dateStr => {
        const parsed = parseDate(dateStr, defaultYear);
        if (parsed) {
            parsedDates.push(parsed);
        }
    });
    
    return parsedDates;
}

// Check if a date string is missing a year (MM/DD format)
function isDateMissingYear(dateString) {
    if (!dateString) return false;
    const trimmed = dateString.trim();
    const parts = trimmed.split(/[\/\-]/);
    return parts.length === 2; // Only month and day, no year
}

// Scan all date values in spreadsheet and prompt for year if any are missing
function detectAndPromptForMissingYear(dateValues) {
    if (!dateValues || dateValues.length === 0) return null;
    
    // Check if any dates are missing years
    let hasMissingYear = false;
    for (const dateValue of dateValues) {
        if (!dateValue) continue;
        
        // Split by separators to check each date
        const dateStrings = String(dateValue).split(/[,;:]/).map(s => s.trim()).filter(s => s);
        for (const dateStr of dateStrings) {
            if (isDateMissingYear(dateStr)) {
                hasMissingYear = true;
                break;
            }
        }
        if (hasMissingYear) break;
    }
    
    if (!hasMissingYear) return null;
    
    // Dates without a year get the most recent past date (e.g. 11/24 means last November
    // if that date is still ahead this year). No pop-up needed.
    wvToast('Some dates had no year. Weaver used the most recent past date for each.', 'info');
    return 'recent';
}


// Parse a single date in MM/DD/YEAR format
// defaultYear: optional year to use if date is missing year (MM/DD format)
function parseDate(dateString, defaultYear = null) {
    if (!dateString) {
        console.log('parseDate: empty string');
        return null;
    }
    
    // Remove extra whitespace
    dateString = dateString.trim();
    console.log(`parseDate: parsing "${dateString}"`);
    
    // Try parsing MM/DD/YYYY or M/D/YYYY format
    const parts = dateString.split(/[\/\-]/);
    console.log(`parseDate: split into parts:`, parts);
    
    if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        
        console.log(`parseDate: month=${month}, day=${day}, year=${year}`);
        
        // Handle 2-digit years (24) and 4-digit years (2024)
        // If year is 2 digits, assume 2000s if < 50, 1900s if >= 50
        if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
            console.log(`parseDate: adjusted 2-digit year to ${year}`);
        }
        
        // Validate month and day
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime()) && date.getMonth() === month - 1 && date.getDate() === day) {
                const isoDate = date.toISOString().split('T')[0];
                console.log(`parseDate: successfully parsed to ${isoDate}`);
                return isoDate;
            } else {
                console.warn(`parseDate: date validation failed for ${month}/${day}/${year}`);
            }
        } else {
            console.warn(`parseDate: invalid month/day/year: ${month}/${day}/${year}`);
        }
    }
    
    // If year is missing (MM/DD format), use defaultYear if provided
    if (parts.length === 2) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        console.log(`parseDate: only 2 parts, month=${month}, day=${day}`);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            if (defaultYear === 'recent') {
                const now = new Date();
                let y = now.getFullYear();
                if (new Date(y, month - 1, day) > now) y -= 1;
                defaultYear = y;
            }
            // Use defaultYear if provided
            if (defaultYear !== null && defaultYear >= 1900 && defaultYear <= 2100) {
                const date = new Date(defaultYear, month - 1, day);
                if (!isNaN(date.getTime())) {
                    const isoDate = date.toISOString().split('T')[0];
                    console.log(`parseDate: successfully parsed with default year ${defaultYear} to ${isoDate}`);
                    return isoDate;
                }
            } else {
                // No default year provided, return null (caller should handle prompting)
                console.log(`parseDate: missing year, no default provided`);
                return null;
            }
        }
    }
    
    console.warn(`parseDate: failed to parse "${dateString}"`);
    return null;
}

// Process spreadsheet
function processSpreadsheet(file) {
    console.log('processSpreadsheet called with file:', file ? file.name : 'null');
    
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        wvToast('Please create a free account to upload contacts. It only takes a moment!');
        showAuthModal();
        // Switch to signup mode
        if (typeof toggleAuthMode === 'function') {
            const isSignup = document.getElementById('auth-mode-toggle')?.textContent.includes('Sign up');
            if (!isSignup) {
                toggleAuthMode();
            }
        }
        return;
    }
    
    if (!file) {
        console.error('No file provided to processSpreadsheet');
        return;
    }
    
    const status = document.getElementById('spreadsheet-status');
    if (!status) {
        console.error('spreadsheet-status element not found');
        return;
    }
    
    status.textContent = 'Processing spreadsheet...';
    status.className = 'upload-status';
    status.style.display = 'block';

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
        status.textContent = 'Error: Please upload a CSV or Excel file (.csv, .xlsx, .xls)';
        status.className = 'upload-status error';
        const spreadsheetInput = document.getElementById('spreadsheet-input');
        if (spreadsheetInput) {
            spreadsheetInput.value = '';
        }
        const processBtn = document.getElementById('process-spreadsheet');
        if (processBtn) {
            processBtn.style.display = 'none';
        }
        return;
    }

    if (isExcel) {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            status.textContent = 'Error: Excel library not loaded. Please refresh the page and try again.';
            status.className = 'upload-status error';
            resetUploadState();
            return;
        }
        
        // Handle Excel files using SheetJS
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON array (array of arrays) - preserves column alignment
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1, // Array of arrays format
                    defval: '', // Default value for empty cells
                    raw: false // Convert all values to strings
                });
                
                console.log('Excel parsed as JSON (first 5 rows):', jsonData.slice(0, 5));
                
                // Process Excel data directly (don't convert to CSV)
                processExcelData(jsonData, status);
            } catch (error) {
                console.error('Error processing Excel file:', error);
                status.textContent = `Error processing Excel file: ${error.message || 'Unknown error'}. Please ensure it is a valid Excel file.`;
                status.className = 'upload-status error';
                status.style.display = 'block';
                // Don't clear file on error
            }
        };
        
        reader.onerror = function() {
            status.textContent = 'Error reading file. Please try again.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            // Don't clear file on error
        };
        
        reader.readAsArrayBuffer(file);
    } else {
        // Handle CSV files
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const csvText = e.target.result;
                processParsedData(csvText, status);
            } catch (error) {
                console.error('Error processing CSV file:', error);
                status.textContent = `Error processing CSV file: ${error.message || 'Unknown error'}. Please ensure it is a valid CSV file.`;
                status.className = 'upload-status error';
                status.style.display = 'block';
                // Don't clear file on error
            }
        };
        
        reader.onerror = function() {
            status.textContent = 'Error reading file. Please try again.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            // Don't clear file on error
        };
        
        reader.readAsText(file);
    }
}

// Process Excel data directly (array of arrays)
function processExcelData(excelData, status) {
    try {
        console.log('Processing Excel data, rows:', excelData.length);
        
        if (!excelData || excelData.length === 0) {
            status.textContent = 'Error: The Excel file appears to be empty. Please check your spreadsheet.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            return;
        }
        
        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, excelData.length); i++) {
            const row = excelData[i];
            if (!row || row.length === 0) continue;
            
            // Check if this row looks like headers
            const rowStrings = row.map(cell => String(cell || '').toLowerCase().trim()).filter(c => c);
            let matchCount = 0;
            
            rowStrings.forEach(cell => {
                const normalized = normalizeColumnName(cell);
                if (normalized === 'name' || normalized === 'email' || normalized === 'company' || normalized === 'contactdate') {
                    matchCount++;
                }
            });
            
            if (matchCount >= 2) {
                headerRowIndex = i;
                console.log(`Found header row at index ${i}`);
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            headerRowIndex = 0; // Default to first row
            console.log('No clear header row found, using first row');
        }
        
        // Get headers
        const headerRow = excelData[headerRowIndex];
        if (!headerRow) {
            status.textContent = 'Error: Could not find header row in Excel file.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            return;
        }
        
        const headers = headerRow.map(cell => String(cell || '').trim());
        const normalizedHeaders = headers.map(h => normalizeColumnName(h));
        
        console.log('Headers:', headers);
        console.log('Normalized headers:', normalizedHeaders);
        
        // Find column indices
        let nameColumnIndex = -1;
        let emailColumnIndex = -1;
        let companyColumnIndex = -1;
        let dateColumnIndex = -1;
        let positionColumnIndex = -1;
        let phoneColumnIndex = -1;
        let locationColumnIndex = -1;
        let priorityColumnIndex = -1;
        
        normalizedHeaders.forEach((normalized, index) => {
            console.log(`Checking header ${index}: "${headers[index]}" -> normalized: "${normalized}"`);
            if (normalized === 'name') {
                nameColumnIndex = index;
                console.log(`  → Found NAME column at index ${index}`);
            } else if (normalized === 'email') {
                emailColumnIndex = index;
                console.log(`  → Found EMAIL column at index ${index}`);
            } else if (normalized === 'company') {
                companyColumnIndex = index;
                console.log(`  → Found COMPANY column at index ${index}`);
            } else if (normalized === 'contactdate') {
                dateColumnIndex = index;
                console.log(`  → Found DATE column at index ${index}`);
            } else if (normalized === 'position') {
                positionColumnIndex = index;
                console.log(`  → Found POSITION column at index ${index}`);
            } else if (normalized === 'phone') {
                phoneColumnIndex = index;
                console.log(`  → Found PHONE column at index ${index}`);
            } else if (normalized === 'location') {
                locationColumnIndex = index;
                console.log(`  → Found LOCATION column at index ${index}`);
            } else if (normalized === 'priority') {
                priorityColumnIndex = index;
                console.log(`  → Found PRIORITY column at index ${index}`);
            }
        });
        
        console.log('Column indices:', {
            name: nameColumnIndex,
            email: emailColumnIndex,
            company: companyColumnIndex,
            date: dateColumnIndex,
            position: positionColumnIndex,
            phone: phoneColumnIndex,
            location: locationColumnIndex,
            priority: priorityColumnIndex
        });
        
        // First, scan all date values to detect missing years
        const allDateValues = [];
        for (let i = headerRowIndex + 1; i < excelData.length; i++) {
            const row = excelData[i];
            if (!row || row.length === 0) continue;
            
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
            if (!hasData) continue;
            
            if (dateColumnIndex >= 0 && dateColumnIndex < row.length) {
                const dateValue = String(row[dateColumnIndex] || '').trim();
                if (dateValue) {
                    allDateValues.push(dateValue);
                }
            }
        }
        
        // Check if any dates are missing years and prompt once
        const defaultYear = detectAndPromptForMissingYear(allDateValues);
        
        // Process data rows
        const contacts = [];
        for (let i = headerRowIndex + 1; i < excelData.length; i++) {
            const row = excelData[i];
            if (!row || row.length === 0) continue;
            
            // Check if row is empty
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
            if (!hasData) continue;
            
            console.log(`\n=== Processing Excel Row ${i} ===`);
            console.log('Raw row:', row);
            
            // Create ONE contact for this row
            const contact = {
                id: Date.now().toString() + i + Math.random().toString(36).substr(2, 9),
                emails: [],
                notes: [],
                priority: 'medium'
            };
            
            const additionalData = {};
            
            // Process each column value
            row.forEach((cell, index) => {
                if (index >= headers.length) {
                    // Extra column beyond headers
                    const cellValue = String(cell || '').trim();
                    if (cellValue) {
                        additionalData[`Column${index + 1}`] = cellValue;
                        // Check if it looks like an email
                        if (cellValue.includes('@') && !contact.email) {
                            contact.email = cellValue;
                            console.log(`    ✓ Found email in extra column ${index}: "${contact.email}"`);
                        }
                    }
                    return;
                }
                
                const header = headers[index];
                const normalizedHeader = normalizedHeaders[index];
                const cellValue = String(cell || '').trim();
                
                console.log(`  Column ${index} ("${header}" -> "${normalizedHeader}"): "${cellValue}"`);
                
                // Map based on column type
                if (index === nameColumnIndex || normalizedHeader === 'name') {
                    if (cellValue) {
                        const looksLikeDate = /^\d{1,2}[\/\-]\d{1,2}/.test(cellValue) || 
                                             /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(cellValue);
                        if (!looksLikeDate) {
                            contact.name = cellValue;
                            console.log(`    ✓ Set name: "${contact.name}"`);
                        } else {
                            console.warn(`    ✗ Skipped name (looks like date): "${cellValue}"`);
                        }
                    }
                } else if (index === emailColumnIndex || normalizedHeader === 'email') {
                    // ALWAYS set email if this is the email column, even if empty (might be set later)
                    if (cellValue) {
                        contact.email = cellValue;
                        console.log(`    ✓✓✓ Set email: "${contact.email}" (from column ${index}, header: "${header}")`);
                    } else {
                        console.log(`    ⚠ Email column ${index} is empty`);
                    }
                } else if (index === companyColumnIndex || normalizedHeader === 'company') {
                    if (cellValue) {
                        contact.firm = cellValue;
                        console.log(`    ✓ Set firm: "${contact.firm}"`);
                    }
                } else if (index === dateColumnIndex || normalizedHeader === 'contactdate') {
                    if (cellValue) {
                        console.log(`    Processing date value: "${cellValue}"`);
                        const dates = parseMultipleDates(cellValue, defaultYear);
                        console.log(`    Parsed dates:`, dates);
                        if (dates && dates.length > 0) {
                            contact.firstEmailDate = dates[0];
                            if (!contact.emails) contact.emails = [];
                            dates.forEach(date => {
                                contact.emails.push({
                                    date: date,
                                    direction: 'sent',
                                    type: contact.emails.filter(e => e.direction === 'sent' || !e.direction).length === 0 ? 'cold' : 'follow-up',
                                    subject: ''
                                });
                            });
                            // Sort emails by date to ensure proper ordering
                            contact.emails.sort((a, b) => a.date.localeCompare(b.date));
                            console.log(`    ✓ Set date(s): ${dates.length} date(s) added, firstEmailDate: ${contact.firstEmailDate}`);
                        } else {
                            console.warn(`    ✗ Failed to parse date: "${cellValue}"`);
                        }
                    }
                } else if (index === positionColumnIndex || normalizedHeader === 'position') {
                    if (cellValue) {
                        contact.position = cellValue;
                        console.log(`    ✓ Set position: "${contact.position}"`);
                    }
                } else if (index === phoneColumnIndex || normalizedHeader === 'phone') {
                    if (cellValue) {
                        contact.phone = cellValue;
                        console.log(`    ✓ Set phone: "${contact.phone}"`);
                    }
                } else if (index === locationColumnIndex || normalizedHeader === 'location') {
                    if (cellValue) {
                        contact.location = cellValue;
                        console.log(`    ✓ Set location: "${contact.location}"`);
                    }
                } else if (index === priorityColumnIndex || normalizedHeader === 'priority') {
                    if (cellValue) {
                        const priorityValue = cellValue.toLowerCase();
                        if (['low', 'medium', 'high'].includes(priorityValue)) {
                            contact.priority = priorityValue;
                            console.log(`    ✓ Set priority: "${contact.priority}"`);
                        }
                    }
                } else {
                    // Check if this looks like an email (fallback detection)
                    if (cellValue && cellValue.includes('@') && !contact.email) {
                        contact.email = cellValue;
                        console.log(`    ✓✓✓ Found email by pattern matching in column ${index} ("${header}"): "${contact.email}"`);
                    } else if (cellValue) {
                        additionalData[header] = cellValue;
                        console.log(`    → Stored as additional data: "${header}" = "${cellValue}"`);
                    }
                }
            });
            
            // If name wasn't set, try to find it
            if (!contact.name) {
                console.log('  Name not found in name column, searching for name...');
                for (let idx = 0; idx < row.length; idx++) {
                    if (idx === dateColumnIndex || idx === emailColumnIndex || 
                        idx === companyColumnIndex || idx === phoneColumnIndex) continue;
                    
                    const testValue = String(row[idx] || '').trim();
                    if (!testValue) continue;
                    
                    if (/^\d{1,2}[\/\-]\d{1,2}/.test(testValue)) continue;
                    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(testValue)) continue;
                    if (testValue.includes('@')) continue;
                    if (/^\d+$/.test(testValue)) continue;
                    if (testValue.length < 2) continue;
                    
                    contact.name = testValue;
                    console.log(`  ✓ Auto-detected name from column ${idx}: "${contact.name}"`);
                    break;
                }
            }
            
            // Store additional data
            if (Object.keys(additionalData).length > 0) {
                contact.additionalData = additionalData;
            }
            
            // Only add contact if it has a name
            if (contact.name && contact.name.trim()) {
                // Final check: if email column was detected but email not set, try to find it
                if (emailColumnIndex >= 0 && !contact.email && row[emailColumnIndex]) {
                    const emailValue = String(row[emailColumnIndex] || '').trim();
                    if (emailValue) {
                        contact.email = emailValue;
                        console.log(`  ✓✓✓ Found email in detected email column ${emailColumnIndex}: "${contact.email}"`);
                    }
                }
                
                // Final check: if still no email, search entire row for email pattern
                if (!contact.email) {
                    for (let idx = 0; idx < row.length; idx++) {
                        const testValue = String(row[idx] || '').trim();
                        if (testValue && testValue.includes('@') && testValue.includes('.')) {
                            contact.email = testValue;
                            console.log(`  ✓✓✓ Found email by searching row, column ${idx}: "${contact.email}"`);
                            break;
                        }
                    }
                }
                
                contacts.push(contact);
                console.log(`✓✓✓ FINAL CONTACT OBJECT:`, JSON.stringify(contact, null, 2));
                console.log(`✓ Added contact:`, {
                    name: contact.name,
                    email: contact.email || 'MISSING!',
                    firm: contact.firm || 'N/A',
                    firstEmailDate: contact.firstEmailDate || 'N/A',
                    position: contact.position || 'N/A',
                    phone: contact.phone || 'N/A',
                    location: contact.location || 'N/A',
                    emailsCount: contact.emails.length
                });
            } else {
                console.error(`✗ Skipped row ${i} - missing name. Row:`, row);
            }
        }
        
        // Add contacts to database
        if (contacts.length === 0) {
            status.textContent = 'No valid contacts found. Please check that your spreadsheet has a "Name" column with data.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            return;
        }
        
        let addedCount = 0;
        let mergedCount = 0;
        
        let hitFreeLimit = false;
        for (const contact of contacts) {
            if (!canAddMoreContacts()) {
                showUpgradePrompt(`More contacts (Free plan limited to ${FREE_PLAN_CONTACT_LIMIT} contacts)`);
                hitFreeLimit = true;
                break;
            }
            const contactsBefore = getContacts().length;
            const result = addContact(contact);
            const contactsAfter = getContacts().length;
            
            // Check if contact was merged (no new contact added) or added (new contact added)
            if (contactsAfter === contactsBefore) {
                mergedCount++;
            } else {
                addedCount++;
            }
        }
        
        let message = hitFreeLimit
            ? `Added ${addedCount + mergedCount} contact(s) from spreadsheet. Free plan limit (${FREE_PLAN_CONTACT_LIMIT} contacts) reached. Upgrade to add more.`
            : `Successfully processed ${addedCount + mergedCount} contact${addedCount + mergedCount !== 1 ? 's' : ''} from spreadsheet!`;
        if (!hitFreeLimit && addedCount > 0 && mergedCount > 0) {
            message += ` (${addedCount} added, ${mergedCount} merged with existing contacts)`;
        } else if (!hitFreeLimit && mergedCount > 0) {
            message += ` (${mergedCount} merged with existing contacts)`;
        }
        
        status.textContent = message;
        status.className = hitFreeLimit ? 'upload-status error' : 'upload-status success';
        status.style.display = 'block';
        
        console.log(`Processed ${addedCount + mergedCount} contacts from spreadsheet` + (hitFreeLimit ? '; free limit reached' : ''));
        
        // Refresh the contacts view
        updateContactDropdown();
        updateFirmFilter();
        filterContacts();
        
        // Switch to contacts view
        setTimeout(() => {
            const contactsLink = document.querySelector('a[href="#contacts"]') || 
                                 document.querySelector('a[href="#network"]');
            if (contactsLink) {
                contactsLink.click();
            }
        }, 500);
        
        // Reset upload state after success
        resetUploadState();
    } catch (error) {
        console.error('Error processing Excel data:', error);
        status.textContent = `Error processing Excel file: ${error.message || 'Unknown error'}`;
        status.className = 'upload-status error';
        status.style.display = 'block';
    }
}

// Common function to process parsed CSV data
function processParsedData(csvText, status) {
    try {
        console.log('Processing CSV text, length:', csvText ? csvText.length : 0);
        
        if (!csvText || csvText.trim().length === 0) {
            status.textContent = 'Error: The file appears to be empty. Please check your spreadsheet.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            // Don't clear file on error - let user try again
            return;
        }
        
        const contacts = parseCSV(csvText);
        console.log('Parsed contacts:', contacts.length, contacts);
        
        if (contacts.length === 0) {
            // Provide more detailed error message
            const errorDetails = [];
            errorDetails.push('No valid contacts found. Please check:');
            errorDetails.push('1. Your spreadsheet has a header row with column names');
            errorDetails.push('2. At least one column is named "Name" (or similar)');
            errorDetails.push('3. The data rows contain values in those columns');
            errorDetails.push('');
            errorDetails.push('Required columns:');
            errorDetails.push('- Name (required)');
            errorDetails.push('- Company or Firm (recommended)');
            errorDetails.push('- Contact Date or Date (recommended)');
            errorDetails.push('');
            errorDetails.push('Check the browser console (F12) for detailed parsing information.');
            
            status.textContent = errorDetails.join('\n');
            status.className = 'upload-status error';
            status.style.display = 'block';
            // Don't clear file - let user fix and try again
            return;
        }
        
        // Check for required columns - but be more lenient
        const missingFields = [];
        contacts.forEach((contact, index) => {
            if (!contact.name) missingFields.push(`Row ${index + 2}: Missing Name`);
            if (!contact.firm && !contact.firstEmailDate) {
                missingFields.push(`Row ${index + 2}: Missing both Company and Contact Date`);
            }
        });
        
        // Only show error if ALL contacts are missing required fields
        if (missingFields.length > 0 && missingFields.length === contacts.length) {
            status.textContent = 'Error: Required columns (Name, Company, Contact Date) not found. Please check your spreadsheet headers.';
            status.className = 'upload-status error';
            status.style.display = 'block';
            // Don't clear file - let user fix and try again
            return;
        }
        
        // Add contacts to database
        let addedCount = 0;
        let mergedCount = 0;
        let skippedCount = 0;
        let hitFreeLimit = false;
        
        for (const contact of contacts) {
            if (!contact.name) {
                skippedCount++;
                continue;
            }
            if (!canAddMoreContacts()) {
                showUpgradePrompt(`More contacts (Free plan limited to ${FREE_PLAN_CONTACT_LIMIT} contacts)`);
                hitFreeLimit = true;
                break;
            }
            
            const contactsBefore = getContacts().length;
            const result = addContact(contact);
            const contactsAfter = getContacts().length;
            
            if (contactsAfter === contactsBefore) {
                mergedCount++;
            } else {
                addedCount++;
            }
        }
        
        let message = hitFreeLimit
            ? `Added ${addedCount + mergedCount} contact(s) from spreadsheet. Free plan limit (${FREE_PLAN_CONTACT_LIMIT} contacts) reached. Upgrade to add more.`
            : `Successfully processed ${addedCount + mergedCount} contact${addedCount + mergedCount !== 1 ? 's' : ''} from spreadsheet!`;
        if (!hitFreeLimit && addedCount > 0 && mergedCount > 0) {
            message += ` (${addedCount} added, ${mergedCount} merged with existing contacts)`;
        } else if (mergedCount > 0) {
            message += ` (${mergedCount} merged with existing contacts)`;
        }
        if (skippedCount > 0) {
            message += ` (${skippedCount} skipped due to missing name)`;
        }
        
        status.textContent = message;
        status.className = hitFreeLimit ? 'upload-status error' : 'upload-status success';
        status.style.display = 'block';
        
        console.log(`Processed ${addedCount + mergedCount} contacts from spreadsheet` + (hitFreeLimit ? '; free limit reached' : ''));
        
        // Refresh the contacts view
        updateContactDropdown();
        updateFirmFilter();
        filterContacts();
        
        // Switch to contacts view
        setTimeout(() => {
            // Try multiple selectors to find the contacts/network tab
            const contactsLink = document.querySelector('a[href="#contacts"]') || 
                                 document.querySelector('a[href="#network"]') ||
                                 document.querySelector('a[data-tab="contacts"]') ||
                                 document.querySelector('a[data-tab="network"]');
            if (contactsLink) {
                contactsLink.click();
                console.log('Switched to contacts/network tab');
            } else {
                console.warn('Could not find contacts/network tab link');
                // Try to find and click the tab button directly
                const tabButtons = document.querySelectorAll('.tab-button, nav a');
                for (let btn of tabButtons) {
                    if (btn.textContent && (btn.textContent.includes('Network') || btn.textContent.includes('Contacts'))) {
                        btn.click();
                        console.log('Found and clicked network tab via text content');
                        break;
                    }
                }
            }
        }, 1000);
        
        // Clear file input and hide button after successful processing
        // This allows user to upload a new file
        resetUploadState(true, true);
        
    } catch (error) {
        console.error('Error processing spreadsheet:', error);
        console.error('Error stack:', error.stack);
        status.textContent = `Error processing spreadsheet: ${error.message || 'Unknown error'}. Please check the browser console for details.`;
        status.className = 'upload-status error';
        status.style.display = 'block';
        // Don't clear file on error - let user try again
        const processButtonContainer = document.getElementById('process-button-container');
        const processBtn = document.getElementById('process-spreadsheet');
        if (processButtonContainer) {
            processButtonContainer.style.display = 'block';
        } else if (processBtn) {
            processBtn.style.display = 'block';
        }
    }
}

// Helper function to reset upload state (moved outside DOMContentLoaded for global access)
function resetUploadState(clearFile = false, hideButton = false) {
    const spreadsheetInput = document.getElementById('spreadsheet-input');
    const spreadsheetStatus = document.getElementById('spreadsheet-status');
    const processBtn = document.getElementById('process-spreadsheet');
    const processButtonContainer = document.getElementById('process-button-container');
    
    // Only clear file if explicitly requested (after successful processing)
    if (clearFile && spreadsheetInput) {
        spreadsheetInput.value = '';
    }
    if (spreadsheetStatus) {
        // Don't hide status on error - keep it visible to show the error
        if (clearFile) {
            spreadsheetStatus.style.display = 'none';
            spreadsheetStatus.textContent = '';
            spreadsheetStatus.className = '';
        }
    }
    // Only hide button container if explicitly requested (after successful processing)
    if (hideButton) {
        if (processButtonContainer) {
            processButtonContainer.style.display = 'none';
        } else if (processBtn) {
            processBtn.style.display = 'none';
        }
    }
}

// Process call notes for new contact with AI OCR and summarization
async function processCallNotesForNewContact(file, contact, statusElement, callDate, notesText) {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        wvToast('Please create a free account to add call notes. It only takes a moment!');
        showAuthModal();
        // Switch to signup mode
        if (typeof toggleAuthMode === 'function') {
            const isSignup = document.getElementById('auth-mode-toggle')?.textContent.includes('Sign up');
            if (!isSignup) {
                toggleAuthMode();
            }
        }
        return;
    }
    
    // Check if user has active subscription for AI features
    if (file && !hasActiveSubscription(user)) {
        // AI image processing is a premium feature
        showUpgradePrompt('AI Call Notes Summarization');
        return;
    }
    
    // For text notes, allow free users but limit them
    if (!file && notesText) {
        const user = getCurrentUser();
        if (!hasActiveSubscription(user)) {
            // Check if user has exceeded free tier limit (5 call notes per month)
            const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
            const freeNotesCount = parseInt(localStorage.getItem(`free_notes_count_${user.id}_${monthKey}`) || '0');
            if (freeNotesCount >= 5) {
                showUpgradePrompt('Unlimited Call Notes');
                return;
            }
        }
    }
    // Validate call date is not in the future
    if (callDate) {
        const dateValidation = validateDateNotFuture(callDate, 'Call date');
        if (!dateValidation.valid) {
            statusElement.textContent = dateValidation.message;
            statusElement.className = 'upload-status error';
            statusElement.style.display = 'block';
            return;
        }
    }
    
    const isTextMode = notesText !== null;
    
    if (isTextMode) {
        statusElement.textContent = 'Adding contact with call notes...';
    } else {
        statusElement.textContent = 'Reading image and summarizing call notes with AI...';
    }
    statusElement.className = 'upload-status';
    statusElement.style.display = 'block';

    try {
        let summary = notesText;
        let extractedText = null;
        let imageUrl = null;
        
        if (isTextMode) {
            // Use the text directly as summary
            summary = notesText;
        } else {
            // Process image with AI
            statusElement.textContent = 'Extracting text from image...';
            
            try {
                // Validate file before sending
                if (!file) {
                    throw new Error('No image file provided');
                }
                
                const formData = new FormData();
                formData.append('image', file);
                
                statusElement.textContent = 'Uploading image to server...';
                statusElement.className = 'upload-status';
                statusElement.style.display = 'block';
                
                const response = await fetch('/api/process-call-notes', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { error: response.statusText || 'Unknown server error' };
                    }
                    throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to process image');
                }
                
                extractedText = data.extractedText;
                summary = data.summary;
                imageUrl = file ? URL.createObjectURL(file) : null;
            } catch (fetchError) {
                console.error('Error calling API:', fetchError);
                
                // Check if it's a network error (server not running or connection failed)
                const errorMessage = fetchError.message || fetchError.toString() || '';
                const isNetworkError = 
                    fetchError.name === 'TypeError' ||
                    errorMessage.includes('Failed to fetch') || 
                    errorMessage.includes('NetworkError') ||
                    errorMessage.includes('Load failed') ||
                    errorMessage.includes('Load Failed') ||
                    errorMessage.includes('Network request failed') ||
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('ERR_NETWORK') ||
                    errorMessage.includes('ERR_CONNECTION_REFUSED');
                
                if (isNetworkError) {
                    const errorMsg = 'Server is not running. To fix this:\n\n1. Open a terminal\n2. Navigate to the Weaver folder: cd /Users/connorcarey/Desktop/Weaver\n3. Start the server: npm start\n4. Wait for "Weaver server running" message\n5. Try uploading again';
                    statusElement.textContent = errorMsg;
                    statusElement.className = 'upload-status error';
                    statusElement.style.display = 'block';
                    statusElement.style.whiteSpace = 'pre-line';
                    return;
                }
                // Re-throw to be handled by outer catch
                throw fetchError;
            }
        }
        
        // Get call date from form or use today
        const noteDate = callDate || new Date().toISOString().split('T')[0];
        
        if (!contact.notes) {
            contact.notes = [];
        }
        
        contact.notes.push({
            date: noteDate,
            summary: summary,
            extractedText: extractedText, // Store full extracted text
            imageUrl: imageUrl,
            isTextNote: isTextMode
        });
        
        // Initialize emails array
        if (!contact.emails) {
            contact.emails = [];
        }
        
        // If firstEmailDate is provided, create a sent email entry for it (if not already created)
        if (contact.firstEmailDate) {
            const emailExists = contact.emails.some(e => 
                e.date === contact.firstEmailDate && 
                e.direction === 'sent'
            );
            if (!emailExists) {
                contact.emails.push({
                    date: contact.firstEmailDate,
                    direction: 'sent',
                    type: 'cold',
                    subject: ''
                });
            }
        }
        
        addContact(contact);
        statusElement.textContent = `Contact "${contact.name}" added successfully!`;
        statusElement.className = 'upload-status success';

        // Clear form
        if (typeof clearNewContactForm === 'function') {
            clearNewContactForm();
        }

        // Switch to contacts view
        setTimeout(() => {
            document.querySelector('a[href="#contacts"]').click();
        }, 1500);
    } catch (error) {
        console.error('Error processing call notes:', error);
        let errorMessage = error.message || 'Unknown error occurred';
        
        // Provide helpful error messages
        if (errorMessage === 'SERVER_NOT_RUNNING' || errorMessage.includes('Cannot connect to server') || errorMessage.includes('Load Failed') || errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Server is not running. To fix this:\n\n1. Open a terminal\n2. Navigate to the Weaver folder: cd /Users/connorcarey/Desktop/Weaver\n3. Start the server: npm start\n4. Wait for "Weaver server running" message\n5. Try uploading again';
        } else if (errorMessage.includes('API key') || errorMessage.includes('OPENAI_API_KEY')) {
            errorMessage = 'OpenAI API key error. Please check your .env file contains a valid OPENAI_API_KEY with vision model access (gpt-4o or gpt-4-turbo).';
        } else if (errorMessage.includes('model') || errorMessage.includes('gpt-4')) {
            errorMessage = 'OpenAI model error. Please check your API access includes vision models (gpt-4o or gpt-4-turbo) and summarization models (gpt-4).';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            errorMessage = 'OpenAI API quota or rate limit exceeded. Please check your OpenAI account billing and try again later.';
        }
        
        statusElement.textContent = `Error: ${errorMessage}`;
        statusElement.className = 'upload-status error';
        statusElement.style.whiteSpace = 'pre-line'; // Allow line breaks in error message
    }
}

// Process call notes with AI OCR and summarization
async function processCallNotes(file, contactId, callDate, notesText) {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        wvToast('Please create a free account to add call notes. It only takes a moment!');
        showAuthModal();
        // Switch to signup mode
        if (typeof toggleAuthMode === 'function') {
            const isSignup = document.getElementById('auth-mode-toggle')?.textContent.includes('Sign up');
            if (!isSignup) {
                toggleAuthMode();
            }
        }
        return;
    }
    
    // Check if user has active subscription for AI features
    if (file && !hasActiveSubscription(user)) {
        // AI image processing is a premium feature
        showUpgradePrompt('AI Call Notes Summarization');
        return;
    }
    
    // For text notes, allow free users but limit them
    if (!file && notesText) {
        const user = getCurrentUser();
        if (!hasActiveSubscription(user)) {
            // Check if user has exceeded free tier limit (5 call notes per month)
            const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
            const freeNotesCount = parseInt(localStorage.getItem(`free_notes_count_${user.id}_${monthKey}`) || '0');
            if (freeNotesCount >= 5) {
                showUpgradePrompt('Unlimited Call Notes');
                return;
            }
        }
    }
    // Check for status element in both "Add Contact" tab and quick add modal
    let status = document.getElementById('notes-status');
    if (!status) {
        status = document.getElementById('quick-add-status');
    }
    
    if (!status) {
        console.error('Status element not found');
        return;
    }
    
    const isTextMode = notesText !== null;
    
    if (isTextMode) {
        status.textContent = 'Adding call notes...';
    } else {
        status.textContent = 'Reading image and summarizing call notes with AI...';
    }
    status.className = 'upload-status';
    status.style.display = 'block';

    try {
        let summary = notesText;
        let extractedText = null;
        let imageUrl = null;
        
        if (isTextMode) {
            // Use the text directly as summary
            summary = notesText;
        } else {
            // Process image with AI
            status.textContent = 'Extracting text from image...';
            
            try {
                // Validate file before sending
                if (!file) {
                    throw new Error('No image file provided');
                }
                
                const formData = new FormData();
                formData.append('image', file);
                
                status.textContent = 'Uploading image to server...';
                
                const response = await fetch('/api/process-call-notes', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { error: response.statusText || 'Unknown server error' };
                    }
                    throw new Error(errorData.error || errorData.message || `API error: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to process image');
                }
                
                extractedText = data.extractedText;
                summary = data.summary;
                imageUrl = file ? URL.createObjectURL(file) : null;
            } catch (fetchError) {
                console.error('Error calling API:', fetchError);
                
                // Check if it's a network error (server not running or connection failed)
                const errorMessage = fetchError.message || fetchError.toString() || '';
                const isNetworkError = 
                    fetchError.name === 'TypeError' ||
                    errorMessage.includes('Failed to fetch') || 
                    errorMessage.includes('NetworkError') ||
                    errorMessage.includes('Load failed') ||
                    errorMessage.includes('Load Failed') ||
                    errorMessage.includes('Network request failed') ||
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('ERR_NETWORK') ||
                    errorMessage.includes('ERR_CONNECTION_REFUSED');
                
                if (isNetworkError) {
                    throw new Error('SERVER_NOT_RUNNING');
                }
                throw fetchError;
            }
        }
        
        const contacts = getContacts();
        const contact = contacts.find(c => c.id === contactId);
        
        if (contact) {
            if (!contact.notes) {
                contact.notes = [];
            }
            
            // Use the provided call date or default to today
            const noteDate = callDate || new Date().toISOString().split('T')[0];
            
            contact.notes.push({
                date: noteDate,
                summary: summary,
                extractedText: extractedText, // Store full extracted text
                imageUrl: imageUrl,
                isTextNote: isTextMode
            });
            
            // Initialize emails array if it doesn't exist
            if (!contact.emails) {
                contact.emails = [];
            }
            
            saveContacts(contacts);
            updateContactDropdown();
            updateFirmFilter();
            displayContacts();
            
            // If we're viewing this contact's detail page, refresh it
            const contactDetail = document.getElementById('contact-detail');
            if (contactDetail && contactDetail.classList.contains('active')) {
                showContactDetail(contactId);
            }
            
            status.textContent = `Call notes added to ${contact.name}'s profile!`;
            status.className = 'upload-status success';
            status.style.display = 'block';
            
            // Clear the form (handle both "Add Contact" tab and quick add modal)
            const callDateInput = document.getElementById('call-date');
            if (callDateInput) {
                callDateInput.value = new Date().toISOString().split('T')[0];
            }
            const quickAddDateInput = document.getElementById('quick-add-date');
            if (quickAddDateInput) {
                quickAddDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            const notesTextInput = document.getElementById('notes-text');
            if (notesTextInput) {
                notesTextInput.value = '';
            }
            const quickNotesTextInput = document.getElementById('quick-notes-text');
            if (quickNotesTextInput) {
                quickNotesTextInput.value = '';
            }
            
            const notesInput = document.getElementById('notes-input');
            if (notesInput) {
                notesInput.value = '';
            }
            const quickNotesImageInput = document.getElementById('quick-notes-image');
            if (quickNotesImageInput) {
                quickNotesImageInput.value = '';
            }
            
            const notesPreview = document.getElementById('notes-preview');
            if (notesPreview) {
                notesPreview.style.display = 'none';
            }
            const quickNotesPreview = document.getElementById('quick-notes-preview');
            if (quickNotesPreview) {
                quickNotesPreview.style.display = 'none';
            }
            
            // Close quick add modal if it's open and clean up
            const quickAddModal = document.getElementById('quick-add-modal');
            if (quickAddModal && quickAddModal.classList.contains('active')) {
                // Close modal immediately after success
                setTimeout(() => {
                    quickAddModal.classList.remove('active');
                    // Reset quick add form
                    const quickAddForm = document.getElementById('quick-add-form');
                    if (quickAddForm) {
                        quickAddForm.reset();
                    }
                    // Clear image preview
                    const quickNotesPreview = document.getElementById('quick-notes-preview');
                    if (quickNotesPreview) {
                        quickNotesPreview.style.display = 'none';
                        quickNotesPreview.innerHTML = '';
                    }
                    // Clear quick add variables
                    window.currentQuickAddType = null;
                    window.currentContactIdForQuickAdd = null;
                    // Clear status
                    if (status) {
                        status.textContent = '';
                        status.className = '';
                        status.style.display = 'none';
                    }
                }, 1500); // Close after showing success message
            }
        } else {
            status.textContent = 'Contact not found';
            status.className = 'upload-status error';
        }
    } catch (error) {
        console.error('Error processing call notes:', error);
        let errorMessage = error.message || 'Unknown error occurred';
        
        // Provide helpful error messages
        if (errorMessage === 'SERVER_NOT_RUNNING' || 
            errorMessage.includes('Cannot connect to server') || 
            errorMessage.includes('Load Failed') ||
            errorMessage.includes('Load failed') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError')) {
            errorMessage = 'Server is not running. To fix this:\n\n1. Open a terminal\n2. Navigate to the Weaver folder: cd /Users/connorcarey/Desktop/Weaver\n3. Start the server: npm start\n4. Wait for "Weaver server running" message\n5. Try uploading again';
        } else if (errorMessage.includes('API key')) {
            errorMessage = 'OpenAI API key error. Please check your .env file contains a valid OPENAI_API_KEY.';
        } else if (errorMessage.includes('model')) {
            errorMessage = 'OpenAI model error. Please check your API access includes vision models (gpt-4o or gpt-4-turbo).';
        } else if (errorMessage.includes('rate limit')) {
            errorMessage = 'OpenAI rate limit exceeded. Please try again in a moment.';
        } else if (errorMessage.includes('quota')) {
            errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
        }
        
        status.textContent = `Error: ${errorMessage}`;
        status.className = 'upload-status error';
        status.style.whiteSpace = 'pre-line'; // Allow line breaks in error message
    }
}

// Network Map Visualization
let networkMapState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastOffsetX: 0,
    lastOffsetY: 0
};

function showNetworkMap() {
    var mapEl = document.getElementById('network-map');
    if (!mapEl) return;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    mapEl.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    // Reset map state
    networkMapState = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        lastOffsetX: 0,
        lastOffsetY: 0
    };
    
    // Initialize and render the map
    setTimeout(() => {
        renderNetworkMap();
    }, 100);
}

// Helper function to draw rounded rectangles (for compatibility)
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

function renderNetworkMap() {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    const contacts = getContacts();
    
    // Group contacts by firm
    const firmsMap = {};
    contacts.forEach(contact => {
        const firm = contact.firm || 'No Firm';
        if (!firmsMap[firm]) {
            firmsMap[firm] = [];
        }
        firmsMap[firm].push(contact);
    });
    
    const firms = Object.keys(firmsMap);
    if (firms.length === 0) {
        // Draw empty state
        ctx.fillStyle = '#6b7280';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No contacts to display', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Calculate positions for firms - ensure no overlap
    // First, calculate bubble sizes for each firm based on number of contacts
    const firmData = firms.map(firm => {
        const contacts = firmsMap[firm];
        // Calculate radius based on number of contacts orbiting
        // Need space for company name in center + contacts orbiting around
        // Each contact needs space for text (approx 150px width for name)
        const minRadiusForContacts = contacts.length > 0 ? 120 : 100;
        const radiusPerContact = 25; // Additional radius per contact
        const requiredRadius = Math.max(
            minRadiusForContacts + (contacts.length * radiusPerContact),
            150 // minimum radius
        );
        
        return { firm, contacts, requiredRadius };
    });
    
    // Position firms with proper spacing to avoid overlap
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const firmPositions = {};
    
    if (firms.length === 1) {
        firmPositions[firms[0]] = { x: centerX, y: centerY };
    } else {
        // Calculate spacing to ensure no overlap
        const maxRadius = Math.max(...firmData.map(f => f.requiredRadius));
        const minSpacing = maxRadius * 2.2; // Ensure bubbles don't touch (2x radius + 20% buffer)
        
        // Use a grid layout for better spacing
        const cols = Math.ceil(Math.sqrt(firms.length));
        const rows = Math.ceil(firms.length / cols);
        
        const totalWidth = (cols - 1) * minSpacing;
        const totalHeight = (rows - 1) * minSpacing;
        
        const startX = centerX - totalWidth / 2;
        const startY = centerY - totalHeight / 2;
        
        firmData.forEach((firmInfo, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            firmPositions[firmInfo.firm] = {
                x: startX + (col * minSpacing),
                y: startY + (row * minSpacing)
            };
        });
    }
    
    // Draw function
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transform
        ctx.save();
        ctx.translate(networkMapState.offsetX, networkMapState.offsetY);
        ctx.scale(networkMapState.scale, networkMapState.scale);
        
        // Draw firms and contacts
        firmData.forEach(firmInfo => {
            const firm = firmInfo.firm;
            const firmPos = firmPositions[firm];
            const firmContacts = firmInfo.contacts;
            const firmRadius = firmInfo.requiredRadius;
            
            // Draw firm bubble - light blue color
            ctx.fillStyle = 'rgba(173, 216, 230, 0.4)'; // light blue
            ctx.beginPath();
            ctx.arc(firmPos.x, firmPos.y, firmRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(135, 206, 250, 0.8)'; // light blue border
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Draw firm name in the center of the bubble
            ctx.fillStyle = '#1a2332';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(firm, firmPos.x, firmPos.y);
            
            // Draw contacts above and below the company name (vertical arrangement only)
            const verticalSpacing = 40; // Space between contact names
            const startOffset = -(firmContacts.length - 1) * verticalSpacing / 2;
            
            firmContacts.forEach((contact, contactIndex) => {
                // Position contacts vertically - alternate above and below, or all below if many
                let contactY;
                if (firmContacts.length === 1) {
                    // Single contact goes below
                    contactY = firmPos.y + 50;
                } else if (firmContacts.length === 2) {
                    // Two contacts: one above, one below
                    contactY = firmPos.y + (contactIndex === 0 ? -50 : 50);
                } else {
                    // Multiple contacts: arrange vertically below the company name
                    contactY = firmPos.y + 50 + (contactIndex * verticalSpacing);
                }
                
                const contactX = firmPos.x; // Always centered horizontally
                
                // Get priority color for the text
                let priorityColor;
                switch(contact.priority) {
                    case 'high':
                        priorityColor = '#f56565'; // red
                        break;
                    case 'low':
                        priorityColor = '#48bb78'; // green
                        break;
                    default:
                        priorityColor = '#f0ad4e'; // orange
                }
                
                // Draw contact name with priority color (no box, just text)
                ctx.fillStyle = priorityColor;
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(contact.name, contactX, contactY);
            });
        });
        
        ctx.restore();
    };
    
    // Pan functionality
    canvas.addEventListener('mousedown', (e) => {
        networkMapState.isDragging = true;
        networkMapState.dragStartX = e.clientX;
        networkMapState.dragStartY = e.clientY;
        networkMapState.lastOffsetX = networkMapState.offsetX;
        networkMapState.lastOffsetY = networkMapState.offsetY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (networkMapState.isDragging) {
            networkMapState.offsetX = networkMapState.lastOffsetX + (e.clientX - networkMapState.dragStartX);
            networkMapState.offsetY = networkMapState.lastOffsetY + (e.clientY - networkMapState.dragStartY);
            draw();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        networkMapState.isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        networkMapState.isDragging = false;
    });
    
    // Zoom functionality - less sensitive
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.95 : 1.05; // Much less sensitive (was 0.9/1.1)
        networkMapState.scale = Math.max(0.3, Math.min(5, networkMapState.scale * delta));
        draw();
    });
    
    // Initial draw
    draw();
    
    // Store draw function for resize
    window.networkMapDraw = draw;
    
    // Redraw on window resize
    const resizeHandler = () => {
        if (document.getElementById('network-map').classList.contains('active')) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            draw();
        }
    };
    
    window.addEventListener('resize', resizeHandler);
}

// Toggle function for favor tip dropdown
window.toggleFavorTip = function() {
    const content = document.getElementById('favor-tip-content');
    const button = document.querySelector('.expand-favor-tip');
    
    if (content && button) {
        const isExpanded = content.style.display !== 'none';
        
        if (isExpanded) {
            content.style.display = 'none';
            button.textContent = '+';
            button.setAttribute('aria-expanded', 'false');
        } else {
            content.style.display = 'block';
            button.textContent = '−';
            button.setAttribute('aria-expanded', 'true');
        }
    }
};

// Timeline popup functions
let popupTimeout = null;

function showTimelinePopup(event, element) {
    event.stopPropagation();
    if (popupTimeout) { clearTimeout(popupTimeout); popupTimeout = null; }

    const popup = document.getElementById('timeline-popup');
    if (!popup) return;

    const type = element.getAttribute('data-type');
    const date = element.getAttribute('data-date');
    const label = element.getAttribute('data-label');
    const content = element.getAttribute('data-content');

    const typeSpan = popup.querySelector('.timeline-popup-type');
    const dateSpan = popup.querySelector('.timeline-popup-date');
    const contentDiv = popup.querySelector('.timeline-popup-content');

    if (typeSpan) typeSpan.innerHTML = label;
    if (dateSpan) dateSpan.textContent = date;
    if (contentDiv) contentDiv.innerHTML = content.replace(/&#10;/g, '<br>');

    popup.className = 'timeline-popup timeline-popup-' + type;

    const rect = element.getBoundingClientRect();
    const containerRect = element.closest('.timeline-section').getBoundingClientRect();

    const popupWidth = 280;
    let left = rect.left - containerRect.left + (rect.width / 2) - (popupWidth / 2);
    if (left < 10) left = 10;
    if (left + popupWidth > containerRect.width - 10) left = containerRect.width - popupWidth - 10;

    popup.style.left = left + 'px';
    popup.style.top = (rect.bottom - containerRect.top + 10) + 'px';
    popup.style.display = 'block';

    popup.onmouseenter = function() {
        if (popupTimeout) { clearTimeout(popupTimeout); popupTimeout = null; }
    };
    popup.onmouseleave = function() { hideTimelinePopup(); };
}

function hideTimelinePopup() {
    popupTimeout = setTimeout(function() {
        const popup = document.getElementById('timeline-popup');
        if (popup) popup.style.display = 'none';
    }, 200);
}

window.showTimelinePopup = showTimelinePopup;
window.hideTimelinePopup = hideTimelinePopup;

// Toggle interactions accordion
function toggleInteractionsAccordion() {
    const content = document.getElementById('interactions-accordion-content');
    const icon = document.getElementById('interactions-accordion-icon');

    if (content && icon) {
        const isHidden = !content.classList.contains('open');
        if (isHidden) {
            content.classList.add('open');
            icon.textContent = '\u2212';
        } else {
            content.classList.remove('open');
            icon.textContent = '+';
        }
    }
}
window.toggleInteractionsAccordion = toggleInteractionsAccordion;

function toggleGeneralNotes() {
    const accordion = document.getElementById('general-notes-accordion');
    const icon = document.getElementById('general-notes-icon');
    
    if (accordion) {
        const isActive = accordion.classList.contains('active');
        if (isActive) {
            accordion.classList.remove('active');
            if (icon) icon.textContent = '+';
        } else {
            accordion.classList.add('active');
            if (icon) icon.textContent = '−';
        }
    }
}

// Save general notes for a contact
function saveGeneralNotes(contactId) {
    const textarea = document.getElementById('general-notes-textarea');
    if (!textarea) return;
    
    const notes = textarea.value;
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === contactId);
    
    if (contact) {
        contact.generalNotes = notes;
        saveContacts(contacts);
        console.log('General notes saved for contact:', contactId);
    }
}

// Make functions globally accessible
window.toggleGeneralNotes = toggleGeneralNotes;
window.saveGeneralNotes = saveGeneralNotes;

// Toggle between text and image mode for quick add call notes
window.toggleQuickAddNotesMode = function(mode) {
    quickAddNotesMode = mode;
    const toggleBtns = document.querySelectorAll('#quick-add-notes-toggle .toggle-btn');
    toggleBtns.forEach(btn => {
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const notesTextDiv = document.getElementById('quick-add-notes-text');
    const notesImageDiv = document.getElementById('quick-add-notes-image');
    const notesTextArea = document.getElementById('quick-notes-text');
    const notesImageInput = document.getElementById('quick-notes-image');
    const notesPreview = document.getElementById('quick-notes-preview');
    const status = document.getElementById('quick-add-status');
    
    if (mode === 'text') {
        // Show text input, hide image input
        if (notesTextDiv) notesTextDiv.style.display = 'block';
        if (notesImageDiv) notesImageDiv.style.display = 'none';
        
        // Clear image input and preview
        if (notesImageInput) notesImageInput.value = '';
        if (notesPreview) {
            notesPreview.style.display = 'none';
            notesPreview.innerHTML = '';
        }
        
        // Make textarea required, remove required from image
        if (notesTextArea) notesTextArea.setAttribute('required', 'required');
        
        // Clear status
        if (status) {
            status.textContent = '';
            status.className = '';
            status.style.display = 'none';
        }
    } else {
        // Show image input, hide text input
        if (notesTextDiv) notesTextDiv.style.display = 'none';
        if (notesImageDiv) notesImageDiv.style.display = 'block';
        
        // Clear textarea
        if (notesTextArea) {
            notesTextArea.value = '';
            notesTextArea.removeAttribute('required');
        }
        
        // Update image label to show it's required
        const imageLabel = notesImageDiv ? notesImageDiv.querySelector('label') : null;
        if (imageLabel) {
            imageLabel.textContent = 'Photo of call notes';
        }
        
        // Clear status (will show when image is selected)
        if (status) {
            status.textContent = '';
            status.className = '';
            status.style.display = 'none';
        }
    }
};

// Toggle Gmail connection instructions dropdown
function toggleGmailInstructions() {
    const content = document.getElementById('gmail-instructions-content');
    const icon = document.querySelector('.gmail-dropdown-icon');
    const header = document.querySelector('.gmail-dropdown-header');
    
    if (content && icon && header) {
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            icon.textContent = '−';
            icon.style.transform = 'rotate(0deg)';
            header.style.borderBottomLeftRadius = '0';
            header.style.borderBottomRightRadius = '0';
        } else {
            content.style.display = 'none';
            icon.textContent = '+';
            icon.style.transform = 'rotate(0deg)';
            header.style.borderBottomLeftRadius = '8px';
            header.style.borderBottomRightRadius = '8px';
        }
    }
}

// Make it globally accessible
window.toggleGmailInstructions = toggleGmailInstructions;


/* ═══════════════════════════════════════════════════════════════════
   CLUB / ORGANIZATION (enterprise) — onboarding, roster, leaderboard
   Added for the club/enterprise feature. Network effects: a student who
   joins a club contributes to and is ranked on a shared roster, so the
   club (and peers) can see who is networking most effectively — which
   raises the cost of leaving as the roster and standing accumulate.
   ═══════════════════════════════════════════════════════════════════ */

// Merge fields into the stored current user (keeps accountType/org state across reloads)
function updateCurrentUserFields(fields) {
    const u = getCurrentUser();
    if (!u) return;
    setCurrentUser({ ...u, ...fields });
}

// Sign the browser out locally and leave exactly one thing on screen: the sign-in dialog.
// Closes every other open dialog (onboarding, upgrade, notes...) so nothing is left
// covering the page with buttons that can no longer work.
function endSession(message) {
    setCurrentUser(null);
    document.querySelectorAll('.modal.active').forEach(function (m) { m.classList.remove('active'); });
    document.querySelectorAll('.wv-dialog-backdrop, .wv-confirm-backdrop').forEach(function (el) { el.remove(); });
    showLandingView();
    if (message) {
        showAuthModal('login');
        if (typeof setAuthStatus === 'function') setAuthStatus(message, 'info');
    }
}
window.endSession = endSession;

function showOnboardingModal() {
    const m = document.getElementById('onboarding-modal');
    if (!m) return;
    // Reset to the first step
    ['choose', 'student', 'org', 'done'].forEach(function (s) {
        const el = document.getElementById('onboarding-step-' + s);
        if (el) el.style.display = (s === 'choose') ? '' : 'none';
    });
    m.classList.add('active');
}
window.showOnboardingModal = showOnboardingModal;

// Decide whether a logged-in user still needs onboarding. Returns true if the modal was shown.
function maybeShowOnboarding() {
    const u = getCurrentUser();
    if (!u) return false;
    if (u.accountType === 'student' || u.accountType === 'org') return false;
    showOnboardingModal();
    return true;
}
window.maybeShowOnboarding = maybeShowOnboarding;

function onboardSetStep(step) {
    ['choose', 'student', 'org', 'done'].forEach(function (s) {
        const el = document.getElementById('onboarding-step-' + s);
        if (el) el.style.display = (s === step) ? '' : 'none';
    });
}

window.chooseAccountType = async function (type) {
    const u = getCurrentUser();
    if (!u) { endSession('Sign in to continue.'); return; }
    // Persist the choice (best-effort; UI proceeds regardless of DB availability)
    try {
        await fetch('/api/users/account-type', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id, accountType: type })
        });
    } catch (e) { console.warn('account-type save failed (continuing):', e.message); }
    updateCurrentUserFields({ accountType: type });
    onboardSetStep(type === 'org' ? 'org' : 'student');
};

window.onboardBack = function () { onboardSetStep('choose'); };

window.onboardJoinClub = async function () {
    const u = getCurrentUser();
    const codeEl = document.getElementById('onboard-join-code');
    const status = document.getElementById('onboard-join-status');
    const code = (codeEl?.value || '').trim().toUpperCase();
    if (!code) { showInlineStatus(status, 'Enter a club code, or skip for now.', 'error'); return; }
    try {
        const res = await fetch('/api/orgs/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id, joinCode: code, displayName: (typeof getUserDisplayName === 'function' ? getUserDisplayName() : null) })
        });
        const data = await res.json();
        if (!res.ok) { showInlineStatus(status, data.error || 'Could not join that club.', 'error'); return; }
        updateCurrentUserFields({ accountType: 'student', primaryOrgId: data.org.id });
        showInlineStatus(status, 'You joined ' + data.org.name + '.', 'success');
        setTimeout(window.finishOnboarding, 700);
    } catch (e) {
        showInlineStatus(status, 'Something went wrong. Please try again.', 'error');
    }
};

window.onboardCreateOrg = async function () {
    const u = getCurrentUser();
    const nameEl = document.getElementById('onboard-org-name');
    const schoolEl = document.getElementById('onboard-org-school');
    const status = document.getElementById('onboard-org-status');
    const name = (nameEl?.value || '').trim();
    if (!name) { showInlineStatus(status, 'Give your club a name.', 'error'); return; }
    try {
        const res = await fetch('/api/orgs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, school: (schoolEl?.value || '').trim(), orgType: ((document.querySelector('input[name=onboard-org-type]:checked') || {}).value || 'club') })
        });
        const data = await res.json();
        if (!res.ok) { showInlineStatus(status, data.error || 'Could not create club.', 'error'); return; }
        updateCurrentUserFields({ accountType: 'org', primaryOrgId: data.org.id });
        const disp = document.getElementById('onboard-join-code-display');
        if (disp) disp.textContent = data.org.joinCode;
        onboardSetStep('done');
    } catch (e) {
        showInlineStatus(status, 'Something went wrong. Please try again.', 'error');
    }
};

window.finishOnboarding = function () {
    const m = document.getElementById('onboarding-modal');
    if (m) m.classList.remove('active');
    refreshSessionUser().then(function () {
        updateSidebarUser();
        if (window.wvApplyRole) window.wvApplyRole(true);
    });
    showAppView();
    if (typeof updateUserDisplay === 'function') updateUserDisplay();
    if (typeof updateSidebarUser === 'function') updateSidebarUser();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof filterContacts === 'function') filterContacts();
};

window.copyJoinCode = function (code) {
    if (!code) return;
    try {
        navigator.clipboard.writeText(code);
        if (typeof showToast === 'function') showToast('Club code copied'); else wvToast('Copied: ' + code);
    } catch (e) { wvToast('Club code: ' + code); }
};

function showInlineStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'upload-status ' + (kind === 'success' ? 'success' : 'error');
    el.style.display = 'block';
}

function escapeHtmlClub(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// Render the Club view: roster + leaderboard for the user's org(s), or prompts to join/create.
window.renderClubView = async function () {
    const u = getCurrentUser();
    const root = document.getElementById('club-content');
    if (!root) return;
    if (!u) { root.innerHTML = '<p style="color:var(--slate);">Please log in.</p>'; return; }
    root.innerHTML = '<p style="color:var(--slate);">Loading your club…</p>';

    let orgs = [];
    try {
        const res = await fetch('/api/orgs/mine?userId=' + encodeURIComponent(u.id));
        const data = await res.json();
        orgs = (data && data.orgs) || [];
    } catch (e) {
        root.innerHTML = '<p style="color:var(--slate);">Couldn\'t load your club right now. Please try again.</p>';
        return;
    }

    if (orgs.length === 0) {
        root.innerHTML = clubEmptyStateHtml(u);
        return;
    }

    const org = orgs.find(function (o) { return o.id === u.primaryOrgId; }) || orgs[0];
    const isClubManager = org.role === 'owner' || org.role === 'admin';

    let members = [];
    try {
        const res = await fetch('/api/orgs/' + encodeURIComponent(org.id) + '/members');
        const data = await res.json();
        members = (data && data.members) || [];
    } catch (e) { /* roster optional */ }

    const me = members.find(function (m) { return m.userId === u.id; });

    const e = escapeHtmlClub;
    let html = '';

    // Header: club identity and join code (same layout as the manager console)
    html += '<div class="wv-console-head"><div class="wv-console-id">';
    html += '<h2 class="wv-console-name">' + e(org.name) + '</h2>';
    html += '<div class="wv-console-meta">' + (org.school ? e(org.school) + ' · ' : '') + members.length + ' member' + (members.length === 1 ? '' : 's') + ' · you are ' + e(org.role) + '</div></div>';
    html += '<div class="wv-console-code"><span class="wv-label">Join code</span><code>' + e(org.joinCode || '') + '</code>' +
        '<button type="button" class="wv-btn wv-btn-sm" onclick="window.copyJoinCode(\'' + e(org.joinCode) + '\')">Copy</button></div></div>';
    if (isClubManager) {
        html += '<div class="wv-note">You manage this club. Invites, member activity, shared outcomes and billing are in the <a href="#console" onclick="event.preventDefault(); var l=document.querySelector(\'.nav-link[href=&quot;#console&quot;]\'); if(l) l.click();">club console</a>.</div>';
    }
    if (!org.verified) {
        html += '<div class="wv-note wv-note-warn">This club is waiting for verification by Weaver. Until then, members are on the Starter plan.</div>';
    }

    // The member's own standing
    if (me) {
        const kpi = (label, value) => '<div class="wv-kpi"><div class="wv-kpi-value">' + e(value) + '</div><div class="wv-kpi-label">' + e(label) + '</div></div>';
        html += '<div class="wv-kpis">' + kpi('Your rank', me.rank + ' of ' + members.length) + kpi('Calls logged', me.calls) +
            kpi('Outreach sent', me.emailsSent) + kpi('Reply rate', me.responseRate + '%') + '</div>';
    }

    // Leaderboard
    html += '<h3 class="wv-h3">Leaderboard</h3><p class="wv-fine" style="margin-top:-4px;">Ranked by networking activity: calls logged, outreach sent, replies and contacts. Members see activity totals, never each other’s contacts or notes.</p>';
    if (members.length === 0) {
        html += '<div class="wv-empty"><h2>No activity yet</h2><p>As members log calls and outreach, they appear here.</p></div>';
    } else {
        html += '<div class="wv-table-scroll"><table class="wv-table"><thead><tr><th scope="col" class="num">Rank</th><th scope="col">Member</th>' +
            '<th scope="col" class="num">Calls</th><th scope="col" class="num">Outreach</th><th scope="col" class="num">Replies</th><th scope="col" class="num">Contacts</th><th scope="col" class="num">Reply rate</th><th scope="col" class="num">Score</th></tr></thead><tbody>';
        members.forEach(function (m) {
            const mine = m.userId === u.id;
            html += '<tr' + (mine ? ' class="wv-row-me"' : '') + '><td class="num">' + m.rank + '</td>' +
                '<td><span class="wv-cell-strong">' + e(m.name) + '</span>' + (mine ? ' <span class="wv-muted">(you)</span>' : '') + (m.role !== 'member' ? ' <span class="wv-muted">' + e(m.role) + '</span>' : '') + '</td>' +
                '<td class="num">' + m.calls + '</td><td class="num">' + m.emailsSent + '</td><td class="num">' + m.emailsReceived + '</td><td class="num">' + m.contactsCount + '</td>' +
                '<td class="num">' + m.responseRate + '%</td><td class="num"><strong>' + m.activityScore + '</strong></td></tr>';
        });
        html += '</tbody></table></div>';
    }

    if (org.role !== 'owner') {
        html += '<p style="margin-top:1rem;"><button type="button" class="wv-linkbtn" onclick="window.wvLeaveClub && window.wvLeaveClub(\'' + e(org.id) + '\', \'' + e(org.name).replace(/'/g, '') + '\')">Leave this club</button></p>';
    }
    root.innerHTML = html;
};

// Fill the club billing card: plan status, active (billable) members, checkout / portal.
async function loadClubBilling(orgId) {
    const box = document.getElementById('club-billing');
    if (!box) return;
    let billing = null, pricing = null;
    try {
        const [b, p] = await Promise.all([
            fetch('/api/orgs/' + encodeURIComponent(orgId) + '/billing', { signal: weaverTimeoutSignal(10000) }).then(r => r.json()),
            fetch('/api/stripe/pricing', { signal: weaverTimeoutSignal(8000) }).then(r => r.json()).catch(() => null),
        ]);
        billing = b; pricing = p;
    } catch (e) { box.innerHTML = '<p style="color:var(--slate);font-size:13px;margin:0;">Billing is unavailable right now.</p>'; return; }
    if (!billing || !billing.success) { box.innerHTML = '<p style="color:var(--slate);font-size:13px;margin:0;">Billing is unavailable right now.</p>'; return; }

    const status = billing.planStatus || 'none';
    const live = status === 'active' || status === 'trialing';
    const seat = pricing && pricing.clubSeat;
    const fmt = (cents, cur) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(cents / 100); } catch (e) { return '$' + (cents / 100).toFixed(2); } };
    const priceLine = seat ? fmt(seat.amount, seat.currency) + ' per active member / ' + seat.interval : 'Per active member, per month';
    const estimate = seat ? fmt(seat.amount * billing.billableSeats, seat.currency) : null;
    const statusLabel = { none: 'No plan', active: 'Active', trialing: 'Trial', past_due: 'Payment due', canceled: 'Canceled' }[status] || status;

    let h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;flex-wrap:wrap;">';
    h += '<div style="flex:1 1 320px;min-width:0;"><h3 class="settings-card-title" style="margin:0;">Club plan <span class="wv-pill ' + (live ? 'wv-pill-ok' : '') + '">' + escapeHtmlClub(statusLabel) + '</span></h3>';
    h += '<p style="color:var(--slate);font-size:13px;margin:4px 0 0;">' + escapeHtmlClub(priceLine) + '. You pay only for members who logged networking activity in the last ' + billing.activeWindowDays + ' days. Every member gets the sponsored allowance.</p></div>';
    h += '<div style="text-align:right;flex:0 0 auto;"><div style="font-size:22px;font-weight:600;color:var(--navy);">' + billing.activeMembers + ' <span style="font-size:13px;font-weight:400;color:var(--slate);">of ' + billing.totalMembers + ' active</span></div>';
    if (estimate) h += '<div style="font-size:12px;color:var(--slate);">About ' + estimate + ' this period (' + billing.billableSeats + ' seat' + (billing.billableSeats === 1 ? '' : 's') + ')</div>';
    h += '</div></div>';
    h += '<div style="margin-top:0.9rem;display:flex;gap:0.5rem;flex-wrap:wrap;">';
    if (billing.license === 'campus') h += '<span class="wv-muted">Covered by a campus license' + (billing.licenseExpiresAt ? ' through ' + new Date(billing.licenseExpiresAt).toLocaleDateString() : '') + '.</span>';
    else if (live || status === 'past_due') h += '<button class="tb-btn tb-btn-outline tb-btn-sm" onclick="window.clubBillingPortal(\'' + escapeHtmlClub(orgId) + '\')">Manage billing</button>';
    else h += '<button class="tb-btn tb-btn-primary tb-btn-sm" onclick="window.clubStartPlan(\'' + escapeHtmlClub(orgId) + '\')">Start club plan</button>';
    h += '</div><div id="club-billing-status" class="upload-status" style="display:none;margin-top:0.5rem;"></div>';
    box.innerHTML = h;
}
window.loadClubBilling = loadClubBilling;

window.clubStartPlan = async function (orgId) {
    const u = getCurrentUser();
    const status = document.getElementById('club-billing-status');
    try {
        const res = await fetch('/api/stripe/club-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, orgId: orgId }) });
        const data = await res.json();
        if (!res.ok || !data.url) { showInlineStatus(status, data.error || 'Could not start checkout.', 'error'); return; }
        window.location.href = data.url;
    } catch (e) { showInlineStatus(status, 'Could not start checkout.', 'error'); }
};

window.clubBillingPortal = async function (orgId) {
    const u = getCurrentUser();
    const status = document.getElementById('club-billing-status');
    try {
        const res = await fetch('/api/stripe/club-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, orgId: orgId }) });
        const data = await res.json();
        if (!res.ok || !data.url) { showInlineStatus(status, data.error || 'Could not open billing.', 'error'); return; }
        window.location.href = data.url;
    } catch (e) { showInlineStatus(status, 'Could not open billing.', 'error'); }
};

// After returning from club checkout: reconcile with Stripe, then open the Club view.
(function handleClubBillingReturn() {
    try {
        const params = new URLSearchParams(window.location.search);
        const result = params.get('club_billing');
        const orgId = params.get('org_id');
        if (!result || !orgId) return;
        history.replaceState(null, '', window.location.pathname + '#console');
        const go = function () {
            const link = document.querySelector('.nav-link[href="#console"]');
            if (link) link.click();
        };
        if (result === 'success') {
            fetch('/api/stripe/club-refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId: orgId }) })
                .catch(function () {}).finally(function () { setTimeout(go, 300); });
        } else {
            setTimeout(go, 300);
        }
    } catch (e) { /* ignore */ }
})();

function clubStatCard(label, value, color) {
    return '<div class="dash-stat-card"><div class="dash-stat-info">' +
        '<span class="dash-stat-value" style="color:' + color + ';">' + value + '</span>' +
        '<span class="dash-stat-label">' + label + '</span></div></div>';
}

function clubEmptyStateHtml(u) {
    const isOrg = u.accountType === 'org';
    let html = '<div class="settings-card" style="max-width:560px;">';
    if (isOrg) {
        html += '<h3 class="settings-card-title">Create your club</h3>';
        html += '<p style="color:var(--slate);font-size:14px;">Set up a shared space and invite members. You\'ll see who\'s networking most effectively.</p>';
        html += '<div class="form-group" style="margin-top:0.75rem;"><label for="club-create-name">Club name *</label><input type="text" id="club-create-name" placeholder="e.g. BC Finance Society" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;"></div>';
        html += '<div class="form-group"><label for="club-create-school">School (optional)</label><input type="text" id="club-create-school" placeholder="e.g. Boston College" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;"></div>';
        html += '<div id="club-create-status" class="upload-status" style="display:none;margin:0.5rem 0;"></div>';
        html += '<button class="tb-btn tb-btn-primary" onclick="window.clubCreate()">Create club</button>';
    } else {
        html += '<h3 class="settings-card-title">Join your club</h3>';
        html += '<p style="color:var(--slate);font-size:14px;">Enter your club code to join the roster and see how your networking compares with your peers.</p>';
        html += '<div class="form-group" style="margin-top:0.75rem;"><label for="club-join-code2">Club code</label><input type="text" id="club-join-code2" placeholder="WVR-XXXXXX" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;text-transform:uppercase;"></div>';
        html += '<div id="club-join-status2" class="upload-status" style="display:none;margin:0.5rem 0;"></div>';
        html += '<button class="tb-btn tb-btn-primary" onclick="window.clubJoin()">Join club</button>';
    }
    html += '</div>';
    return html;
}

window.clubInvite = async function (orgId) {
    const u = getCurrentUser();
    const emailEl = document.getElementById('club-invite-email');
    const status = document.getElementById('club-invite-status');
    const email = (emailEl?.value || '').trim();
    if (!email) { showInlineStatus(status, 'Enter an email address.', 'error'); return; }
    try {
        const res = await fetch('/api/orgs/' + encodeURIComponent(orgId) + '/invite', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, invitedBy: u.id })
        });
        const data = await res.json();
        if (!res.ok) { showInlineStatus(status, data.error || 'Could not send invite.', 'error'); return; }
        showInlineStatus(status, 'Invite sent to ' + email + '. They can also join with code ' + (data.joinCode || '') + '.', 'success');
        if (emailEl) emailEl.value = '';
    } catch (e) { showInlineStatus(status, 'Something went wrong.', 'error'); }
};

window.clubJoin = async function () {
    const u = getCurrentUser();
    const code = (document.getElementById('club-join-code2')?.value || '').trim().toUpperCase();
    const status = document.getElementById('club-join-status2');
    if (!code) { showInlineStatus(status, 'Enter a club code.', 'error'); return; }
    try {
        const res = await fetch('/api/orgs/join', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id, joinCode: code, displayName: (typeof getUserDisplayName === 'function' ? getUserDisplayName() : null) })
        });
        const data = await res.json();
        if (!res.ok) { showInlineStatus(status, data.error || 'Could not join.', 'error'); return; }
        updateCurrentUserFields({ primaryOrgId: data.org.id });
        window.renderClubView();
    } catch (e) { showInlineStatus(status, 'Something went wrong.', 'error'); }
};

window.clubCreate = async function () {
    const u = getCurrentUser();
    const name = (document.getElementById('club-create-name')?.value || '').trim();
    const school = (document.getElementById('club-create-school')?.value || '').trim();
    const status = document.getElementById('club-create-status');
    if (!name) { showInlineStatus(status, 'Give your club a name.', 'error'); return; }
    try {
        const res = await fetch('/api/orgs', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id, name: name, school: school })
        });
        const data = await res.json();
        if (!res.ok) { showInlineStatus(status, data.error || 'Could not create club.', 'error'); return; }
        updateCurrentUserFields({ accountType: 'org', primaryOrgId: data.org.id });
        window.renderClubView();
    } catch (e) { showInlineStatus(status, 'Something went wrong.', 'error'); }
};
