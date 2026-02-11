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

// Check if user is logged in on page load
function checkAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // Don't auto-show login modal - let users navigate first
        // They can click profile icon to login when ready
    } else {
        // Update UI with user info
        updateUserDisplay();
        // Load user's contacts
        filterContacts();
    }
}

// Show auth modal
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

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
    
    if (isSignupMode) {
        title.textContent = 'Sign up for Weaver';
        submitText.textContent = 'Sign Up';
        toggleLink.textContent = 'Already have an account? Login';
        if (passwordLabel) {
            passwordLabel.innerHTML = 'Password: * <span style="font-size: 0.85rem; color: var(--text-medium); font-weight: normal;">(min 6 characters)</span>';
        }
    } else {
        title.textContent = 'Login to Weaver';
        submitText.textContent = 'Login';
        toggleLink.textContent = "Don't have an account? Sign up";
        if (passwordLabel) {
            passwordLabel.textContent = 'Password: *';
        }
    }
    
    // Clear form
    document.getElementById('auth-form').reset();
    document.getElementById('auth-status').style.display = 'none';
}

// Clean password: remove whitespace and invisible characters (fixes cross-browser login)
function cleanPassword(str) {
    if (!str || typeof str !== 'string') return '';
    let s = str.replace(/\s/g, ''); // Remove ALL whitespace (including invisible Unicode spaces)
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
    s = s.replace(/[\x00-\x1F\x7F]/g, ''); // Remove non-printable characters
    return s;
}

// Handle auth form submission
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    let password = document.getElementById('auth-password').value;
    password = cleanPassword(password);
    const status = document.getElementById('auth-status');
    
    if (!email || !password) {
        status.textContent = 'Please fill in all fields';
        status.className = 'upload-status error';
        status.style.display = 'block';
        return;
    }
    
    // Disable form during processing
    const submitBtn = document.getElementById('auth-submit');
    const originalBtnText = submitBtn?.textContent;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isSignupMode ? 'Creating Account...' : 'Logging In...';
    }
    
    try {
        if (isSignupMode) {
            // Sign up
            if (password.length < 6) {
                status.textContent = 'Password must be at least 6 characters';
                status.className = 'upload-status error';
                status.style.display = 'block';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                return;
            }
            
            // Create new user in database
            const userId = Date.now().toString();
            const response = await fetch('/api/users/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Signup failed:', data);
                // Show more detailed error message
                let errorMsg = data.details || data.error || 'Failed to create account';
                
                // If email already exists, suggest logging in instead
                if (data.error?.includes('already exists') || data.details?.includes('already exists')) {
                    errorMsg = 'An account with this email already exists. Please try logging in instead.';
                }
                
                status.textContent = errorMsg;
                status.className = 'upload-status error';
                status.style.display = 'block';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                return;
            }
            
            // Save user to localStorage for local access
            const users = JSON.parse(localStorage.getItem('weaver_users') || '{}');
            users[email] = {
                id: userId,
                email: email,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('weaver_users', JSON.stringify(users));
            
            // Log in the new user
            setCurrentUser({ id: userId, email: email });
            status.textContent = 'Account created successfully!';
            status.className = 'upload-status success';
            status.style.display = 'block';
            
            setTimeout(() => {
                closeAuthModal();
                updateUserDisplay();
                filterContacts();
            }, 1000);
        } else {
            // Login - check database first
            let response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            let data = await response.json();
            
            // If database login fails, check localStorage (for users created before database sync)
            if (!response.ok) {
                const users = JSON.parse(localStorage.getItem('weaver_users') || '{}');
                const localUser = users[email];
                
                // If user exists in localStorage with matching password, migrate to database
                if (localUser && localUser.password === password) {
                    console.log('User found in localStorage, migrating to database...');
                    
                    // Migrate user to database
                    const migrateResponse = await fetch('/api/users/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: localUser.id, 
                            email: email, 
                            password: password 
                        })
                    });
                    
                    const migrateData = await migrateResponse.json();
                    
                    if (migrateResponse.ok) {
                        // Migration successful, now login via database
                        response = await fetch('/api/users/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });
                        data = await response.json();
                    } else if (migrateResponse.status === 400 && migrateData.error?.includes('already exists')) {
                        // User already exists in database but password might be different
                        // Try login again - maybe password was updated
                        response = await fetch('/api/users/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });
                        data = await response.json();
                    } else {
                        // Migration failed, use local user
                        console.log('Migration failed, using local user:', migrateData);
                        setCurrentUser({ id: localUser.id, email: email });
                        status.textContent = 'Login successful!';
                        status.className = 'upload-status success';
                        status.style.display = 'block';
                        
                        setTimeout(() => {
                            closeAuthModal();
                            updateUserDisplay();
                            filterContacts();
                        }, 1000);
                        return;
                    }
                }
            }
            
            // If still not successful, show error
            if (!response.ok) {
                console.error('Login failed:', data);
                let errorMsg = data.error || 'Invalid email or password';
                
                // If user exists but password is wrong, provide helpful message
                if (data.error?.includes('Invalid email or password')) {
                    errorMsg = 'Invalid email or password. If you forgot your password, please contact support.';
                }
                
                status.textContent = errorMsg;
                status.className = 'upload-status error';
                status.style.display = 'block';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                return;
            }
            
            // Save user to localStorage for local access
            const users = JSON.parse(localStorage.getItem('weaver_users') || '{}');
            users[email] = {
                id: data.user.id,
                email: data.user.email,
                createdAt: data.user.createdAt || new Date().toISOString()
            };
            localStorage.setItem('weaver_users', JSON.stringify(users));
            
            // Log in the user with full data from database (including subscription info)
            setCurrentUser({
                id: data.user.id,
                email: data.user.email,
                subscriptionStatus: data.user.subscriptionStatus || 'free',
                subscriptionPlan: data.user.subscriptionPlan || null,
                stripeCustomerId: data.user.stripeCustomerId || null,
                stripeSubscriptionId: data.user.stripeSubscriptionId || null
            });
            await loadContactsFromAPI();
            status.textContent = 'Login successful!';
            status.className = 'upload-status success';
            status.style.display = 'block';
            
            setTimeout(() => {
                closeAuthModal();
                updateUserDisplay();
                filterContacts();
            }, 1000);
        }
    } catch (error) {
        console.error('Auth error:', error);
        status.textContent = 'An error occurred. Please try again.';
        status.className = 'upload-status error';
        status.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// Update user display in navbar
function updateUserDisplay() {
    const currentUser = getCurrentUser();
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay && currentUser) {
        userEmailDisplay.textContent = currentUser.email;
    }
    
    // Check Gmail connection status
    if (currentUser) {
        checkGmailStatus(currentUser.id);
    }
}

// Check Gmail connection status
async function checkGmailStatus(userId) {
    try {
        const response = await fetch(`/api/gmail/status?userId=${userId}`);
        const data = await response.json();
        
        if (data.connected) {
            localStorage.setItem(`weaver_gmail_connected_${userId}`, 'true');
        } else {
            localStorage.removeItem(`weaver_gmail_connected_${userId}`);
        }
    } catch (error) {
        // Server might not be running, that's okay
        console.log('Could not check Gmail status:', error.message);
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
            
            menuContent.innerHTML = `
                <div style="padding: 0.5rem;">
                    <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: var(--text-dark);">${currentUser.email}</p>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.75rem; color: var(--text-medium);">User ID: <code style="background: var(--eggshell-white); padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem;">${currentUser.id}</code></p>
                    
                    <!-- Subscription Section -->
                    <div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--silver-gray);">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--text-medium);">Subscription</p>
                        ${isPro ? 
                            `<p style="margin: 0 0 0.5rem 0; font-size: 0.8rem;">
                                <span class="subscription-badge pro">PRO</span>
                            </p>
                            <button type="button" onclick="window.openCustomerPortal()" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Manage Subscription</button>` :
                            `<p style="margin: 0 0 0.5rem 0; font-size: 0.8rem;">
                                <span class="subscription-badge free">FREE</span>
                            </p>
                            <button onclick="openSubscriptionModal(); toggleProfileMenu();" class="btn btn-primary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Upgrade to Pro</button>`
                        }
                        <button onclick="window.syncMyPlan()" class="btn btn-secondary" style="width: 100%; font-size: 0.8rem; padding: 0.35rem; margin-top: 0.35rem;">Sync my plan</button>
                    </div>
                    
                    <!-- Gmail Integration Section -->
                    <div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--silver-gray);">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--text-medium);">Gmail Integration</p>
                        ${gmailConnected ? 
                            `<p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--success);">✓ Gmail Connected</p>
                             <button onclick="window.syncGmailLabel()" class="btn btn-primary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem; margin-bottom: 0.5rem;">Sync from "Weaver" Label</button>
                             <button onclick="window.disconnectGmail()" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Disconnect Gmail</button>` :
                            `<button onclick="window.connectGmail()" class="btn btn-primary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Connect Gmail</button>`
                        }
                    </div>
                    <button onclick="window.logout()" class="btn btn-secondary" style="width: 100%; font-size: 0.9rem; padding: 0.5rem;">Logout</button>
                </div>
            `;
        }
    }
}

// Logout function
function logout() {
    setCurrentUser(null);
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
        profileMenu.style.display = 'none';
    }
    updateUserDisplay();
    // Clear contacts display
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) {
        contactsList.innerHTML = '';
    }
    // Show login modal
    showAuthModal();
}

// Gmail connection functions
async function connectGmail() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in first');
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
                alert('Popup blocked! Please allow popups for this site and try again.');
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
                            alert('Gmail connected successfully!');
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
            alert('Failed to get Gmail authorization URL. Check server logs.');
        }
    } catch (error) {
        console.error('Gmail connection error:', error);
        console.error('Error details:', error.message, error.stack);
        
        // More specific error messages
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Load failed')) {
            alert('Cannot connect to server. Please check:\n1. Your internet connection\n2. The server is running\n3. No firewall is blocking the connection\n\nIf the problem persists, check the browser console (F12) for more details.');
        } else {
            alert(`Error connecting to Gmail: ${error.message}\n\nCheck the browser console (F12) for more details.`);
        }
    }
}

async function disconnectGmail() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return;
    }

    if (!confirm('Are you sure you want to disconnect Gmail?')) {
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
            alert('Gmail disconnected');
        }
    } catch (error) {
        console.error('Gmail disconnect error:', error);
        alert('Error disconnecting Gmail');
    }
}


// Make functions globally accessible for onclick handlers
window.toggleProfileMenu = toggleProfileMenu;

// ============ STRIPE SUBSCRIPTION FUNCTIONS ============

// Initialize Stripe (will be set from environment variable or hardcoded for testing)
let stripe = null;
if (typeof Stripe !== 'undefined') {
    // Live publishable key (for client-side Stripe.js if needed)
    // Note: Server-side checkout doesn't require this, but keeping it for potential future use
    stripe = Stripe('pk_live_51Sq1GVQZZ2GMzWg9tNwQomBd6JsmVfsM0t8J1MGncL4mb8s0pVpzTUyR3aFssJYobqpvPs5ZNsfYOvBA0sTQPJKn002kPqAdm7');
}

// Check if user has active subscription
function hasActiveSubscription(user) {
    if (!user) return false;
    // Check subscription status from user object
    // This would typically come from the database
    const subscriptionStatus = user.subscriptionStatus || 'free';
    return subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
}

// Get subscription status from user
function getSubscriptionStatus(user) {
    if (!user) return 'free';
    return user.subscriptionStatus || 'free';
}

// Free plan contact limit
const FREE_PLAN_CONTACT_LIMIT = 20;

// Check if user can add more contacts (free = 20 max, paid = unlimited)
function canAddMoreContacts() {
    const user = getCurrentUser();
    if (!user) return false;
    if (hasActiveSubscription(user)) return true;
    return getContacts().length < FREE_PLAN_CONTACT_LIMIT;
}

// Open subscription modal
function openSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) {
        modal.classList.add('active');
        updateSubscriptionModalButtons();
    }
}

// Update pricing modal buttons: show "Current plan" (disabled) on Pro when user is already subscribed
function updateSubscriptionModalButtons() {
    const freeBtn = document.getElementById('subscribe-free-btn');
    const proBtn = document.getElementById('subscribe-pro-btn');
    const yearlyBtn = document.getElementById('subscribe-yearly-btn');
    if (!proBtn || !yearlyBtn) return;

    const currentUser = getCurrentUser();
    const isPro = currentUser && hasActiveSubscription(currentUser);

    const monthlyPriceId = 'price_1StXttQZZ2GMzWg9cj6s4DXD';
    const yearlyPriceId = 'price_1StXtnQZZ2GMzWg9YeTAGbIq';

    if (isPro) {
        if (freeBtn) {
            freeBtn.textContent = 'Free';
            freeBtn.disabled = true;
        }
        proBtn.textContent = 'Current plan';
        proBtn.disabled = true;
        proBtn.removeAttribute('onclick');
        proBtn.onclick = null;
        yearlyBtn.textContent = 'Current plan';
        yearlyBtn.disabled = true;
        yearlyBtn.removeAttribute('onclick');
        yearlyBtn.onclick = null;
    } else {
        if (freeBtn) {
            freeBtn.textContent = 'Current plan';
            freeBtn.disabled = true;
        }
        proBtn.textContent = 'Subscribe Now';
        proBtn.disabled = false;
        proBtn.setAttribute('onclick', `handleSubscription('${monthlyPriceId}')`);
        yearlyBtn.textContent = 'Subscribe Yearly';
        yearlyBtn.disabled = false;
        yearlyBtn.setAttribute('onclick', `handleSubscription('${yearlyPriceId}')`);
    }
}

// Close subscription modal
function closeSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Handle subscription checkout
async function handleSubscription(priceId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please log in to subscribe');
        closeSubscriptionModal();
        showAuthModal();
        return;
    }
    if (hasActiveSubscription(user)) {
        alert('You already have an active Pro subscription. Use "Manage Subscription" in your profile to change or cancel it.');
        return;
    }

    // Store user in sessionStorage before redirect (persists during Stripe redirect so we can restore session)
    sessionStorage.setItem('weaver_user_before_stripe', JSON.stringify(user));

    let btn = null;
    try {
        // Disable button during processing
        btn = event?.target || document.querySelector(`button[onclick*="${priceId}"]`);
        if (btn) {
            const originalText = btn.textContent;
            btn.setAttribute('data-original-text', originalText);
            btn.disabled = true;
            btn.textContent = 'Processing...';
        }

        // Create checkout session
        console.log('Creating checkout session for:', { userId: user.id, priceId, email: user.email });
        
        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                priceId: priceId,
                email: user.email // Include email so user can be created in database if needed
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Checkout session error:', errorData);
            throw new Error(errorData.error || 'Failed to create checkout session');
        }

        const data = await response.json();
        console.log('Checkout session created:', data);
        
        if (!data.url) {
            throw new Error('No checkout URL returned from server');
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;
    } catch (error) {
        console.error('Payment error:', error);
        console.error('Error details:', error.message, error.stack);
        
        // Get error message
        const errorMessage = error.message || 'Error processing payment. Please try again.';
        
        alert(`Payment Error: ${errorMessage}\n\nCheck the browser console (F12) for more details.`);
        
        // Re-enable button
        if (!btn) {
            btn = event?.target || document.querySelector(`button[onclick*="${priceId}"]`);
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = btn.getAttribute('data-original-text') || 'Subscribe Now';
        }
    }
}

// Handle customer portal (manage subscription)
async function openCustomerPortal() {
    const user = getCurrentUser();
    if (!user) {
        alert('Please log in');
        return;
    }

    try {
        const response = await fetch('/api/stripe/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        });

        if (!response.ok) {
            throw new Error('Failed to create portal session');
        }

        const { url } = await response.json();
        window.location.href = url;
    } catch (error) {
        console.error('Portal error:', error);
        alert('Error opening customer portal. Please try again.');
    }
}

// Sync subscription status from Stripe (for users who paid but still see Free)
async function syncMyPlan() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        alert('Please log in first.');
        return;
    }
    try {
        const response = await fetch('/api/users/refresh-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to refresh');
        }
        if (data.success && data.user) {
            const updatedUser = {
                id: data.user.id,
                email: data.user.email,
                subscriptionStatus: data.user.subscriptionStatus || 'free',
                subscriptionPlan: data.user.subscriptionPlan || null,
                stripeCustomerId: data.user.stripeCustomerId || null,
                stripeSubscriptionId: data.user.stripeSubscriptionId || null
            };
            setCurrentUser(updatedUser);
            window.location.reload();
            return;
        }
        alert('Could not update plan. Please try again or contact support.');
    } catch (error) {
        console.error('Sync plan error:', error);
        alert('Error syncing plan: ' + (error.message || 'Please try again.'));
    }
}

// Update profile menu with subscription info
function updateProfileMenuWithSubscription() {
    const menuContent = document.getElementById('profile-menu-content');
    const currentUser = getCurrentUser();
    
    if (!menuContent || !currentUser) return;
    
    // This will be updated when we fetch user data from server
    // For now, check localStorage or make API call
    const subscriptionStatus = getSubscriptionStatus(currentUser);
    const isPro = hasActiveSubscription(currentUser);
    
    // Get existing menu HTML
    const existingHTML = menuContent.innerHTML;
    
    // Add subscription section
    const subscriptionHTML = `
        <div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--silver-gray);">
            <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--text-medium);">Subscription</p>
            ${isPro ? 
                `<p style="margin: 0 0 0.5rem 0; font-size: 0.8rem;">
                    <span class="subscription-badge pro">PRO</span>
                </p>
                <button type="button" onclick="window.openCustomerPortal()" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Manage Subscription</button>` :
                `<p style="margin: 0 0 0.5rem 0; font-size: 0.8rem;">
                    <span class="subscription-badge free">FREE</span>
                </p>
                <button type="button" onclick="openSubscriptionModal(); toggleProfileMenu();" class="btn btn-primary" style="width: 100%; font-size: 0.85rem; padding: 0.4rem;">Upgrade to Pro</button>`
            }
        </div>
    `;
    
    // Insert subscription section before Gmail section
    const gmailSectionIndex = existingHTML.indexOf('Gmail Integration');
    if (gmailSectionIndex > -1) {
        menuContent.innerHTML = 
            existingHTML.substring(0, existingHTML.indexOf('<div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--silver-gray);">')) +
            subscriptionHTML +
            existingHTML.substring(existingHTML.indexOf('<div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--silver-gray);">'));
    } else {
        // If Gmail section not found, prepend subscription section
        menuContent.innerHTML = subscriptionHTML + existingHTML;
    }
}

// Show upgrade prompt for premium features
function showUpgradePrompt(featureName) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            <h2 style="color: var(--accent-blue);">Upgrade to Pro</h2>
            <p style="color: var(--text-medium); margin: 1rem 0;">
                <strong>${featureName}</strong> is a Pro feature. Upgrade now to unlock:
            </p>
            <ul style="list-style: none; padding: 0; margin: 1rem 0;">
                <li style="padding: 0.5rem 0; color: var(--text-dark);">
                    <span style="color: var(--success); margin-right: 0.5rem;">✓</span>
                    ${featureName}
                </li>
                <li style="padding: 0.5rem 0; color: var(--text-dark);">
                    <span style="color: var(--success); margin-right: 0.5rem;">✓</span>
                    Unlimited contacts
                </li>
                <li style="padding: 0.5rem 0; color: var(--text-dark);">
                    <span style="color: var(--success); margin-right: 0.5rem;">✓</span>
                    All premium features
                </li>
            </ul>
            <button onclick="openSubscriptionModal(); this.closest('.modal').remove();" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                Upgrade to Pro - $4.99/month
            </button>
            <button onclick="this.closest('.modal').remove();" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem;">
                Maybe Later
            </button>
        </div>
    `;
    document.body.appendChild(modal);
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

// Gmail Label Sync - Review and Process
let gmailLabelEmails = [];
let gmailLabelReviewData = {};

async function syncGmailLabel() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in first');
        return;
    }
    
    const gmailConnected = localStorage.getItem(`weaver_gmail_connected_${currentUser.id}`) === 'true';
    if (!gmailConnected) {
        alert('Please connect your Gmail account first');
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
            html += `<h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Email Address: ${group.email}</h3>`;
            if (detectedFirm) {
                html += `<p style="margin: 0 0 0.5rem 0; color: var(--accent-blue); font-weight: 600;">Detected Firm: ${detectedFirm}</p>`;
            }
            html += `<p style="margin: 0 0 1rem 0; color: var(--text-medium); font-size: 0.9rem;">${group.emails.length} email(s) found</p>`;

            // Name confirmation
            html += `<div style="margin-bottom: 1rem;">`;
            html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Name (from email):</label>`;
            html += `<input type="text" id="gmail-name-${index}" value="${(group.name || '').replace(/"/g, '&quot;')}" placeholder="Enter contact name" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
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
                html += `<p style="margin: 0; font-size: 0.9rem;"><strong>✓ Will add to existing contact:</strong> ${contact.name}</p>`;
                html += `</div>`;
                gmailLabelReviewData[group.email] = {
                    action: 'existing',
                    contactId: contactId,
                    name: group.name
                };
            } else {
                html += `<div style="margin-bottom: 1rem;">`;
                html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Action:</label>`;
                html += `<select id="gmail-action-${index}" onchange="updateGmailLabelAction(${index}, '${group.email}')" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
                html += `<option value="new">Create New Contact</option>`;
                html += `<option value="existing">Assign to Existing Contact</option>`;
                html += `<option value="skip">Skip</option>`;
                html += `</select>`;
                html += `</div>`;
                
                // Existing contact selector (hidden by default)
                html += `<div id="gmail-existing-select-${index}" style="display: none; margin-bottom: 1rem;">`;
                html += `<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Select Contact:</label>`;
                html += `<select id="gmail-contact-select-${index}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--silver-gray); border-radius: 4px; font-size: 0.9rem;">`;
                contacts.forEach(contact => {
                    html += `<option value="${contact.id}">${contact.name}${contact.email ? ` (${contact.email})` : ''}</option>`;
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
            html += `<p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 0.85rem;">Email Preview:</p>`;
            group.emails.slice(0, 5).forEach(email => {
                html += `<div style="padding: 0.25rem 0; font-size: 0.85rem;">`;
                html += `<span style="font-weight: 600;">${email.direction === 'sent' ? 'Sent' : 'Received'}:</span> `;
                html += `<span>${email.subject || '(No subject)'}</span> `;
                html += `<span style="color: var(--text-medium);">(${email.date})</span>`;
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

    alert(message);
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
    // Handle return from Stripe Checkout - restore session so user stays logged in
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const userIdFromUrl = urlParams.get('user_id');
    const wasCanceled = urlParams.get('canceled');

    // Restore user from sessionStorage first (set before redirect to Stripe)
    const storedUser = sessionStorage.getItem('weaver_user_before_stripe');
    if (storedUser && !getCurrentUser()) {
        try {
            setCurrentUser(JSON.parse(storedUser));
            sessionStorage.removeItem('weaver_user_before_stripe');
            console.log('Restored user from sessionStorage after Stripe redirect');
        } catch (e) {
            sessionStorage.removeItem('weaver_user_before_stripe');
        }
    }

    // If we have user_id in URL but still no current user, try restoring from weaver_users by id
    if (userIdFromUrl && !getCurrentUser()) {
        const users = JSON.parse(localStorage.getItem('weaver_users') || '{}');
        const userEmail = Object.keys(users).find(function(email) { return users[email].id === userIdFromUrl; });
        if (userEmail) {
            setCurrentUser(users[userEmail]);
            console.log('Restored user session after Stripe redirect (from weaver_users)');
        }
    }

    // If successful payment (session_id, not canceled), refresh subscription and show success
    if (sessionId && !wasCanceled) {
        const user = getCurrentUser();
        if (user) {
            try {
                const response = await fetch('/api/users/refresh-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.user) {
                        setCurrentUser({
                            id: data.user.id,
                            email: data.user.email,
                            subscriptionStatus: data.user.subscriptionStatus || 'free',
                            subscriptionPlan: data.user.subscriptionPlan || null,
                            stripeCustomerId: data.user.stripeCustomerId || null,
                            stripeSubscriptionId: data.user.stripeSubscriptionId || null
                        });
                        alert('✓ Subscription activated! Welcome to Weaver Pro.');
                    }
                }
            } catch (err) {
                console.error('Error refreshing subscription after Stripe return:', err);
            }
        }
    }

    // Clean up URL parameters so user doesn't see session_id/user_id/canceled
    if (userIdFromUrl || sessionId || wasCanceled) {
        const cleanPath = window.location.pathname || '/';
        window.history.replaceState({}, document.title, cleanPath);
    }

    // Check authentication on page load
    checkAuth();

    // Refresh subscription status if user is logged in (helps catch cases where webhook hasn't fired yet)
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id) {
        // Only refresh if status is 'free' or if we have a Stripe customer ID (indicates they might have subscribed)
        if (currentUser.subscriptionStatus === 'free' || currentUser.stripeCustomerId) {
            try {
                const response = await fetch('/api/users/refresh-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.user) {
                        // Update user in localStorage with refreshed subscription data
                        const updatedUser = {
                            id: data.user.id,
                            email: data.user.email,
                            subscriptionStatus: data.user.subscriptionStatus || 'free',
                            subscriptionPlan: data.user.subscriptionPlan || null,
                            stripeCustomerId: data.user.stripeCustomerId || null,
                            stripeSubscriptionId: data.user.stripeSubscriptionId || null
                        };
                        setCurrentUser(updatedUser);
                        console.log('Subscription status refreshed on page load:', updatedUser.subscriptionStatus);
                    }
                }
            } catch (error) {
                console.error('Error refreshing subscription on page load:', error);
                // Non-critical error, continue
            }
        }
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
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    // Smooth scroll and section switching
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section (hide contact detail if showing)
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Update Strengthening the Net if that section is being shown
                if (targetId === 'strengthening-net' && typeof updateStrengtheningNet === 'function') {
                    setTimeout(() => {
                        updateStrengtheningNet();
                        // Initialize Networking Assistant when section becomes active
                        if (typeof initNetworkingAssistant === 'function') {
                            initNetworkingAssistant();
                        }
                    }, 100);
                }
                
                // Initialize Tips & Tricks accordion if that section is being shown
                if (targetId === 'tips-tricks') {
                    setTimeout(() => initTipsAccordion(), 100);
                }
            }
            
            // Close mobile menu
            navMenu.classList.remove('active');
        });
    });

    // Handle hero button navigation
    const heroButtons = document.querySelectorAll('.hero-buttons a');
    heroButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.getAttribute('href').substring(1);
            
            // Update active nav link
            navLinks.forEach(l => {
                if (l.getAttribute('href') === button.getAttribute('href')) {
                    navLinks.forEach(nl => nl.classList.remove('active'));
                    l.classList.add('active');
                }
            });
            
            // Show target section
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Hamburger menu toggle
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // Load contacts from backend when user is logged in (so data persists across devices)
    if (getCurrentUser()) await loadContactsFromAPI();
    // Initialize contacts from localStorage
    loadContacts();
    updateContactDropdown();
    updateFirmFilter();
    
    // Initial load should show alphabetical sorting
    filterContacts();
    
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
    
    // See My Net button
    const seeMyNetBtn = document.getElementById('see-my-net');
    if (seeMyNetBtn) {
        seeMyNetBtn.addEventListener('click', showNetworkMap);
    }
    
    // Back to network list button
    const backToNetworkListBtn = document.getElementById('back-to-network-list');
    if (backToNetworkListBtn) {
        backToNetworkListBtn.addEventListener('click', () => {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('contacts').classList.add('active');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        });
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
            alert('Please create a free account to add contacts. It only takes a moment!');
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

    subscribeForm.addEventListener('submit', (e) => {
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
        const scrollContainer = document.querySelector('.research-quotes-scroll');
        const quotesContainer = document.querySelector('.research-quotes-container');
        
        if (!scrollContainer || !quotesContainer) {
            return;
        }
        
        // Wait for cards to be rendered to get accurate measurements
        setTimeout(() => {
            const cards = quotesContainer.querySelectorAll('.research-quote-card');
            if (cards.length === 0) return;
            
            // Get card width including gap (350px card + 1.5rem gap = 24px)
            const cardWidth = 350;
            const gap = 24; // 1.5rem = 24px
            const singleSetWidth = (cardWidth + gap) * 7; // 7 cards in first set
            const totalWidth = singleSetWidth * 2; // We have 2 sets (original + duplicate)
            
            let isAutoScrolling = true;
            let scrollPosition = 0;
            let scrollTimeout;
            let animationFrame;
            const scrollSpeed = 0.5; // pixels per frame (slower for smoother scroll)
            
            // Calculate initial position to show cards 2, 6, 7 first
            // Card 2 starts at: (cardWidth + gap) * 1 = 374px
            // To show cards 2, 6, 7, we want card 2 on the left, so start at card 2 position
            // This will show: card 2, then 3, 4, 5, 6, 7 as user scrolls right
            const initialPosition = (cardWidth + gap) * 1; // Start at card 2 position (374px)
            scrollPosition = initialPosition;
            quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
            
            // Function to handle infinite scroll wrapping
            function wrapScrollPosition(pos) {
                if (pos < 0) {
                    // Scrolled left past start, wrap to end
                    return pos + singleSetWidth;
                } else if (pos >= singleSetWidth) {
                    // Scrolled right past end, wrap to start
                    return pos - singleSetWidth;
                }
                return pos;
            }
            
            // Function to update auto-scroll position
            function updateAutoScroll() {
                if (isAutoScrolling) {
                    scrollPosition += scrollSpeed;
                    scrollPosition = wrapScrollPosition(scrollPosition);
                    quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
                }
                animationFrame = requestAnimationFrame(updateAutoScroll);
            }
            updateAutoScroll();
            
            // Handle mouse wheel for manual scrolling
            scrollContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                
                // Pause auto-scroll
                isAutoScrolling = false;
                quotesContainer.classList.remove('auto-scrolling');
                
                // Calculate scroll amount (horizontal scrolling)
                const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
                scrollPosition += delta * 0.5; // Adjust scroll sensitivity
                
                // Wrap position for infinite scroll
                scrollPosition = wrapScrollPosition(scrollPosition);
                
                // Apply manual scroll
                quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
                
                // Clear existing timeout
                clearTimeout(scrollTimeout);
                
                // Resume auto-scroll after user stops scrolling
                scrollTimeout = setTimeout(() => {
                    isAutoScrolling = true;
                    quotesContainer.classList.add('auto-scrolling');
                }, 2000); // Resume after 2 seconds of no scrolling
            }, { passive: false });
            
            // Handle touch/swipe for mobile
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartPosition = 0;
            
            scrollContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartPosition = scrollPosition;
            }, { passive: true });
            
            scrollContainer.addEventListener('touchmove', (e) => {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchStartX - touchX;
                const deltaY = touchStartY - touchY;
                
                // Only handle horizontal swipes
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                    
                    // Pause auto-scroll
                    isAutoScrolling = false;
                    quotesContainer.classList.remove('auto-scrolling');
                    
                    // Update scroll position
                    scrollPosition = touchStartPosition + deltaX;
                    scrollPosition = wrapScrollPosition(scrollPosition);
                    
                    quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
                    
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        isAutoScrolling = true;
                        quotesContainer.classList.add('auto-scrolling');
                    }, 2000);
                }
            }, { passive: false });
            
            // Arrow buttons: step one article at a time
            const step = cardWidth + gap;
            const prevBtn = document.getElementById('research-quotes-prev');
            const nextBtn = document.getElementById('research-quotes-next');
            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isAutoScrolling = false;
                    quotesContainer.classList.remove('auto-scrolling');
                    scrollPosition -= step;
                    scrollPosition = wrapScrollPosition(scrollPosition);
                    quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        isAutoScrolling = true;
                        quotesContainer.classList.add('auto-scrolling');
                    }, 2000);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isAutoScrolling = false;
                    quotesContainer.classList.remove('auto-scrolling');
                    scrollPosition += step;
                    scrollPosition = wrapScrollPosition(scrollPosition);
                    quotesContainer.style.transform = `translateX(-${scrollPosition}px)`;
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        isAutoScrolling = true;
                        quotesContainer.classList.add('auto-scrolling');
                    }, 2000);
                });
            }
        }, 100); // Small delay to ensure DOM is ready
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
                        status.innerHTML = `✓ File selected successfully<br><span style="font-size: 0.9rem; color: var(--text-medium);">${file.name}</span>`;
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
    localStorage.setItem(getUserKey(currentUser.id), JSON.stringify(contacts));
    syncContactsToBackend(contacts).catch(err => console.error('Sync contacts to backend failed:', err));
}

// Load contacts from backend (used on login and page load so data persists across devices)
async function loadContactsFromAPI() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/contacts?userId=${encodeURIComponent(currentUser.id)}`);
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
            
            const message = `A contact with the same ${duplicate.name && contact.name ? 'name' : 'email'} already exists:\n\n` +
                          `Existing: ${duplicateInfo.join(', ')}\n` +
                          `New: ${newInfo.join(', ')}\n\n` +
                          `Is this the same person? Would you like to combine the profiles?`;
            
            if (confirm(message)) {
                // Merge contacts
                const merged = mergeContacts(duplicate, contact);
                const duplicateIndex = contacts.findIndex(c => c.id === duplicate.id);
                if (duplicateIndex !== -1) {
                    contacts[duplicateIndex] = merged;
                    saveContacts(contacts);
                    updateContactDropdown();
                    updateFirmFilter();
                    filterContacts();
                    console.log('Contacts merged successfully');
                    return merged; // Return the merged contact
                }
            } else {
                // User chose not to merge, add as separate contact
                console.log('User chose not to merge, adding as separate contact');
            }
        }
    }
    
    // Free plan: max 20 contacts (check before adding new contact, not when merging)
    if (!canAddMoreContacts()) {
        showUpgradePrompt(`More contacts (Free plan limited to ${FREE_PLAN_CONTACT_LIMIT} contacts)`);
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

function deleteContact(contactId) {
    const contact = getContacts().find(c => c.id === contactId);
    if (!contact) {
        console.error('Contact not found:', contactId);
        return;
    }
    
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete ${contact.name}${contact.firm ? ` from ${contact.firm}` : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
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
        contactsList.innerHTML = '<div class="empty-state"><p>No contacts found. Upload your spreadsheet to get started!</p></div>';
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

    contactsList.innerHTML = contacts.map(contact => {
        const emailsSent = contact.emails ? contact.emails.filter(e => e.direction === 'sent' || !e.direction).length : 0;
        const emailsReceived = contact.emails ? contact.emails.filter(e => e.direction === 'received').length : 0;
        const callCount = contact.notes ? contact.notes.length : 0;
        const lastEmailDate = contact.emails && contact.emails.length > 0 
            ? contact.emails[contact.emails.length - 1].date 
            : null;
        const lastCallDate = contact.notes && contact.notes.length > 0
            ? contact.notes[contact.notes.length - 1].date
            : null;
        
        // Calculate days since last contact (using local date parsing)
        let daysSinceLastContact = null;
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
        if (allInteractions.length > 0) {
            const lastContactDate = new Date(Math.max(...allInteractions.map(d => d.getTime())));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            lastContactDate.setHours(0, 0, 0, 0);
            const diffTime = today - lastContactDate;
            daysSinceLastContact = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        
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
                <h3>${contact.name}</h3>
                <div class="contact-details">
                    ${contact.firm ? `<p><strong>Firm:</strong> ${contact.firm}</p>` : '<p><strong>Firm:</strong> N/A</p>'}
                    ${contact.position ? `<p><strong>Position:</strong> ${contact.position}</p>` : '<p><strong>Position:</strong> N/A</p>'}
                    ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
                </div>
            </div>
            <div class="contact-details">
                ${contact.firstEmailDate ? `<p><strong>First Email:</strong> ${formatLocalDate(contact.firstEmailDate)}</p>` : ''}
                ${lastEmailDate ? `<p><strong>Last Email:</strong> ${formatLocalDate(lastEmailDate)}</p>` : ''}
                ${lastCallDate ? `<p><strong>Last Call:</strong> ${formatLocalDate(lastCallDate)}</p>` : ''}
                ${daysSinceLastContact !== null ? `<p><strong>Days Since Last Contact:</strong> <span class="days-badge ${daysSinceLastContact > 30 ? 'days-high' : daysSinceLastContact > 14 ? 'days-medium' : 'days-low'}">${daysSinceLastContact}</span></p>` : '<p><strong>Days Since Last Contact:</strong> <span class="days-badge">No contact yet</span></p>'}
            </div>
            <div class="contact-stats">
                <p><strong>Emails Sent:</strong> ${emailsSent}</p>
                <p><strong>Emails Received:</strong> ${emailsReceived}</p>
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
            resultsCount.textContent = message + '.';
            resultsCount.className = 'results-count success';
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
        contactsList.innerHTML = '<div class="empty-state"><p>Great job! All your contacts have been contacted within the last ' + daysThreshold + ' days.</p></div>';
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
                    <h3>${contact.name}</h3>
                    <div class="contact-details">
                        ${contact.firm ? `<p><strong>Firm:</strong> ${contact.firm}</p>` : '<p><strong>Firm:</strong> N/A</p>'}
                        ${contact.position ? `<p><strong>Position:</strong> ${contact.position}</p>` : '<p><strong>Position:</strong> N/A</p>'}
                        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
                    </div>
                </div>
                <div class="contact-details">
                    ${contact.firstEmailDate ? `<p><strong>First Email:</strong> ${formatLocalDate(contact.firstEmailDate)}</p>` : ''}
                    ${lastEmailDate ? `<p><strong>Last Email:</strong> ${formatLocalDate(lastEmailDate)}</p>` : ''}
                    ${lastCallDate ? `<p><strong>Last Call:</strong> ${formatLocalDate(lastCallDate)}</p>` : ''}
                    ${daysSinceLastContact !== null ? `<p><strong>Days Since Last Contact:</strong> <span class="days-badge ${daysSinceLastContact > 30 ? 'days-high' : daysSinceLastContact > 14 ? 'days-medium' : 'days-low'}">${daysSinceLastContact}</span></p>` : '<p><strong>Days Since Last Contact:</strong> <span class="days-badge days-high">No contact yet</span></p>'}
                </div>
                <div class="contact-stats">
                    <p><strong>Emails Sent:</strong> ${emailsSent}</p>
                    <p><strong>Emails Received:</strong> ${emailsReceived}</p>
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
    firmFilter.innerHTML = '<option value="">All Firms</option>';
    
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
        
        var tooltipContent = '';
        if (itemType === 'call') {
            tooltipContent = item.summary || 'No notes recorded';
        } else {
            tooltipContent = item.subject || 'No subject';
        }
        
        // Escape for HTML attribute
        tooltipContent = tooltipContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        if (tooltipContent.length > 200) {
            tooltipContent = tooltipContent.substring(0, 200);
        }
        
        var typeLabel = item.label || (itemType === 'call' ? 'Call' : 'Email');
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
        
        var icon = '📌';
        if (itemType === 'email-sent') icon = '📤';
        else if (itemType === 'email-received') icon = '📥';
        else if (itemType === 'call') icon = '📞';
        
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
        html += '<span class="interaction-row-type">' + typeLabel + '</span>';
        html += '<span class="interaction-row-date">' + formatLocalDate(item.date) + '</span>';
        html += '</div>';
        html += '<div class="interaction-row-details">' + details + '</div>';
        
        if (itemType === 'call' && item.extractedText) {
            html += '<details class="interaction-row-full-notes">';
            html += '<summary>View Full Notes</summary>';
            html += '<div class="interaction-row-full-notes-content">' + item.extractedText + '</div>';
            html += '</details>';
        }
        
        html += '</div>';
        html += '</div>';
        html += '<div class="interaction-row-actions">';
        html += '<button class="interaction-row-edit" onclick="editTimelineItem(\'' + contact.id + '\', \'' + item.id + '\', \'' + item.itemType + '\', ' + item.itemIndex + ')" title="Edit">✏️</button>';
        html += '<button class="interaction-row-delete" onclick="deleteTimelineItem(\'' + contact.id + '\', \'' + item.id + '\', \'' + item.itemType + '\', ' + item.itemIndex + ')" title="Delete">🗑️</button>';
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
                label: email.direction === 'received' ? 'Email Received' : (email.type === 'cold' ? 'Cold Email Sent' : 'Follow-up Email Sent'),
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
                <h1 id="contact-detail-name">${contact.name}</h1>
                <button class="btn btn-secondary" onclick="toggleEditMode('${contactId}')" id="edit-contact-btn">Edit</button>
            </div>
            <div class="contact-detail-info" id="contact-detail-info">
                <div class="info-row">
                    <div class="info-item">
                        <strong>Firm</strong>
                        <span id="contact-detail-firm">${contact.firm || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Position</strong>
                        <span id="contact-detail-position">${contact.position || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Priority</strong>
                        <span id="contact-detail-priority-display" class="priority-badge priority-${contact.priority || 'medium'}">${(contact.priority || 'medium').toUpperCase()}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item email-item full-width">
                        <strong>Email</strong>
                        <span id="contact-detail-email" class="email-value" title="${(contact.email || '').replace(/"/g, '&quot;')}">${contact.email || 'N/A'}</span>
                    </div>
                </div>
                <div class="info-row">
                    ${contact.firstEmailDate ? `<div class="info-item"><strong>First Contact</strong><span>${formatLocalDate(contact.firstEmailDate)}</span></div>` : ''}
                    ${daysSinceLastContact !== null ? `
                        <div class="info-item">
                            <strong>Days Since Last Contact</strong>
                            <span class="days-count ${daysSinceLastContact > 30 ? 'days-high' : daysSinceLastContact > 14 ? 'days-medium' : 'days-low'}">${daysSinceLastContact}</span>
                        </div>
                    ` : '<div class="info-item"><strong>Days Since Last Contact</strong><span class="days-count">No contact yet</span></div>'}
                </div>
            </div>
            <div id="contact-edit-form" class="contact-edit-form" style="display: none;">
                <form id="edit-contact-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-contact-name">Name *</label>
                            <input type="text" id="edit-contact-name" value="${contact.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-contact-email">Email</label>
                            <input type="email" id="edit-contact-email" value="${contact.email || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-contact-firm">Firm</label>
                            <input type="text" id="edit-contact-firm" value="${contact.firm || ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit-contact-position">Position</label>
                            <input type="text" id="edit-contact-position" value="${contact.position || ''}">
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
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="toggleEditMode('${contactId}', false)">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="general-notes-section">
            <div class="accordion-item" id="general-notes-accordion">
                <button class="accordion-header" onclick="toggleGeneralNotes()">
                    <span>General Notes</span>
                    <span class="accordion-icon" id="general-notes-icon">+</span>
                </button>
                <div class="accordion-content" id="general-notes-content">
                    <div class="accordion-content-inner">
                        <textarea 
                            id="general-notes-textarea" 
                            class="general-notes-textarea" 
                            placeholder="Add any notes about this contact here..."
                            oninput="saveGeneralNotes('${contactId}')"
                        >${contact.generalNotes || ''}</textarea>
                        <p class="notes-hint">Notes are saved automatically as you type.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="timeline-section">
            <h2>Interaction Timeline</h2>
            <div class="timeline-container">
                <div class="timeline-line"></div>
                ${buildTimelineItems(timeline, contact)}
                <div class="timeline-today-marker">
                    <div class="timeline-today-line"></div>
                    <div class="timeline-today-label">Today<br>${formatLocalDate(new Date().toISOString().split('T')[0])}</div>
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
                    <span>Email Sent</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-email-received"></span>
                    <span>Email Received</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot legend-call"></span>
                    <span>Call</span>
                </div>
            </div>

            <div class="quick-actions">
                <button class="btn btn-primary" onclick="openQuickAdd('email-sent', '${contact.id}')">+ Add Email Sent</button>
                <button class="btn btn-primary" onclick="openQuickAdd('email-received', '${contact.id}')">+ Add Email Received</button>
                <button class="btn btn-primary" onclick="openQuickAdd('call', '${contact.id}')">+ Add Call</button>
            </div>

            <div class="interactions-accordion">
                <button class="interactions-accordion-header" type="button" onclick="toggleInteractionsAccordion()">
                    <span>All Interactions (${timeline.length})</span>
                    <span class="interactions-accordion-icon" id="interactions-accordion-icon">+</span>
                </button>
                <div class="interactions-accordion-content" id="interactions-accordion-content">
                    ${buildInteractionsList(timeline, contact)}
                </div>
            </div>
        </div>
        
        <div class="call-notes-section">
            <h2>Call Notes</h2>
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
                                        <img src="${note.imageUrl}" alt="Call notes ${index + 1}">
                                    </div>
                                ` : ''}
                                <div class="call-note-summary">
                                    <h4>AI Summary</h4>
                                    <p>${note.summary}</p>
                                    ${note.extractedText ? `
                                        <details class="extracted-text-details">
                                            <summary>View Full Extracted Text</summary>
                                            <div class="extracted-text-content">
                                                <pre>${note.extractedText}</pre>
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
            <h3 style="color: var(--light-accent); margin-bottom: 1rem;">${contact.name} - Call Notes</h3>
            ${contact.notes.map((note, index) => `
                <div class="call-note-item">
                    <h4>Note #${contact.notes.length - index}</h4>
                    <p class="call-note-date">Date: ${formatLocalDate(note.date)}</p>
                    <p>${note.summary}</p>
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
                <h2 id="timeline-edit-title">Edit Timeline Item</h2>
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
                                <option value="cold">Cold Email</option>
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
                        <button type="submit" class="btn btn-primary">Save Changes</button>
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
        document.getElementById('timeline-edit-title').textContent = 'Edit Email';
        document.getElementById('timeline-edit-email-fields').style.display = 'block';
        document.getElementById('timeline-edit-note-fields').style.display = 'none';
        // Use direction and emailType from timeline item, with defaults
        const direction = item.direction || 'sent';
        const emailType = item.emailType || 'follow-up';
        document.getElementById('timeline-edit-email-direction').value = direction;
        document.getElementById('timeline-edit-email-type').value = emailType;
        document.getElementById('timeline-edit-email-subject').value = item.subject || '';
    } else {
        document.getElementById('timeline-edit-title').textContent = 'Edit Call';
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
window.deleteTimelineItem = function(contactId, itemId, itemType, itemIndex) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
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
        alert('No contacts to export. Please add contacts first.');
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
    exportBtn.textContent = '✓ Exported!';
    exportBtn.style.background = 'var(--success)';
    setTimeout(() => {
        exportBtn.textContent = originalText;
        exportBtn.style.background = '';
    }, 2000);
}

// Delete all contacts function
function deleteAllContacts() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in first');
        return;
    }
    
    const contacts = getContacts();
    const contactCount = contacts.length;
    
    if (contactCount === 0) {
        alert('No contacts to delete');
        return;
    }
    
    // Show confirmation dialog with contact count
    const confirmed = confirm(
        `Are you sure you want to delete ALL ${contactCount} contact${contactCount !== 1 ? 's' : ''}?\n\n` +
        `This action cannot be undone. All contact data, emails, notes, and interactions will be permanently deleted.`
    );
    
    if (!confirmed) {
        return; // User cancelled
    }
    
    // Second confirmation for safety
    const doubleConfirmed = confirm(
        `FINAL WARNING: You are about to permanently delete ${contactCount} contact${contactCount !== 1 ? 's' : ''}.\n\n` +
        `This cannot be undone. Type "DELETE" in the next prompt to confirm.`
    );
    
    if (!doubleConfirmed) {
        return;
    }
    
    // Clear all contacts
    saveContacts([]);
    
    // Update UI
    updateContactDropdown();
    updateFirmFilter();
    filterContacts();
    
    // Show success message
    alert(`All ${contactCount} contact${contactCount !== 1 ? 's' : ''} have been deleted.`);
    
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
        title.textContent = type === 'email-sent' ? 'Add Email Sent' : 'Add Email Received';
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
        title.textContent = 'Add Call';
        
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
            submitButton.textContent = 'Add Call';
            submitButton.innerHTML = 'Add Call'; // Also update innerHTML
        }
    } else {
        // Reset button text for other interaction types
        const submitButton = document.getElementById('quick-add-submit-btn');
        if (submitButton) {
            submitButton.textContent = 'Add Interaction';
            submitButton.innerHTML = 'Add Interaction';
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
                    alert('Error: Please refresh the page.');
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
            priorityBadge.textContent = priority.toUpperCase();
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
    
    // Prompt user once for the year
    let year = prompt(`Some dates in your spreadsheet are missing the year (e.g., "11/24" instead of "11/24/2024").\n\nPlease enter the year in YYYY format (e.g., 2024) to apply to all dates missing years:`);
    
    // Keep prompting until valid year is entered or user cancels
    while (year !== null) {
        const yearNum = parseInt(year);
        if (yearNum >= 1900 && yearNum <= 2100) {
            console.log(`User provided year: ${yearNum}`);
            return yearNum;
        }
        // Invalid year, prompt again
        year = prompt(`Invalid year. Please enter a year between 1900 and 2100:\n\n(Click Cancel to skip dates without years)`);
    }
    
    // User cancelled
    console.log('User cancelled year input');
    return null;
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
        alert('Please create a free account to upload contacts. It only takes a moment!');
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
        alert('Please create a free account to add call notes. It only takes a moment!');
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
        alert('Please create a free account to add call notes. It only takes a moment!');
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
    // Hide all sections and show network map
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('network-map').classList.add('active');
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

    if (typeSpan) typeSpan.textContent = label;
    if (dateSpan) dateSpan.textContent = date;
    if (contentDiv) contentDiv.textContent = content;

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
            imageLabel.textContent = 'Upload Call Notes Photo: *';
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
