/**
 * CS50 Mail Redesign - Modern Single Page Application (SPA)
 * Client-Side JavaScript Architecture
 */

document.addEventListener('DOMContentLoaded', () => {
    // Primary State Management
    let currentMailbox = 'inbox';
    let cachedEmails = [];
    let currentEmailId = null;

    // DOM Element Selectors Cache
    const elements = {
        // Navigation Buttons
        navInbox: document.getElementById('inbox'),
        navSent: document.getElementById('sent'),
        navArchived: document.getElementById('archived'),
        navCompose: document.getElementById('compose'),
        unreadBadge: document.getElementById('unread-count'),
        userEmailDisplay: document.getElementById('user-email-display'),

        // View Sections
        emailsView: document.getElementById('emails-view'),
        emailDetailView: document.getElementById('email-detail-view'),
        composeView: document.getElementById('compose-view'),

        // Email List Elements
        mailboxTitle: document.getElementById('mailbox-title'),
        mailboxCount: document.getElementById('mailbox-count'),
        searchEmailsInput: document.getElementById('search-emails'),
        btnRefresh: document.getElementById('btn-refresh-mailbox'),
        skeletonLoader: document.getElementById('skeleton-loader'),
        emptyState: document.getElementById('empty-state'),
        emptyStateTitle: document.getElementById('empty-state-title'),
        emptyStateDesc: document.getElementById('empty-state-desc'),
        emailsList: document.getElementById('emails-list'),

        // Detail View Elements
        btnBack: document.getElementById('btn-back'),
        btnReply: document.getElementById('btn-reply'),
        btnArchive: document.getElementById('btn-archive'),
        archiveBtnText: document.getElementById('archive-btn-text'),
        detailSubject: document.getElementById('detail-subject'),
        detailSender: document.getElementById('detail-sender'),
        detailRecipients: document.getElementById('detail-recipients'),
        detailTimestamp: document.getElementById('detail-timestamp'),
        detailBody: document.getElementById('detail-body'),
        detailAvatar: document.getElementById('detail-avatar'),

        // Compose View Elements
        composeForm: document.getElementById('compose-form'),
        composeRecipients: document.getElementById('compose-recipients'),
        composeSubject: document.getElementById('compose-subject'),
        composeBody: document.getElementById('compose-body'),
        btnSendEmail: document.getElementById('btn-send-email'),
        sendSpinner: document.getElementById('send-spinner'),
        sendIcon: document.getElementById('send-icon'),
        btnDiscardCompose: document.getElementById('btn-discard-compose'),

        // Notification Container
        alertContainer: document.getElementById('alert-container'),
        appToastEl: document.getElementById('app-toast'),
        toastMessage: document.getElementById('toast-message'),
        toastIcon: document.getElementById('toast-icon')
    };

    // Initialize Bootstrap Toast Instance
    const toastInstance = elements.appToastEl ? new bootstrap.Toast(elements.appToastEl, { delay: 3500 }) : null;

    /* ==========================================================================
       Event Listeners Initialization
       ========================================================================== */

    // Navigation Click Events
    elements.navInbox?.addEventListener('click', () => loadMailbox('inbox'));
    elements.navSent?.addEventListener('click', () => loadMailbox('sent'));
    elements.navArchived?.addEventListener('click', () => loadMailbox('archive'));
    elements.navCompose?.addEventListener('click', () => composeEmail());

    // Action Buttons
    elements.btnRefresh?.addEventListener('click', () => loadMailbox(currentMailbox));
    elements.btnBack?.addEventListener('click', () => loadMailbox(currentMailbox));
    elements.btnDiscardCompose?.addEventListener('click', () => loadMailbox(currentMailbox));
    elements.composeForm?.addEventListener('submit', sendEmail);

    // Live Search Filter
    elements.searchEmailsInput?.addEventListener('input', (e) => filterEmails(e.target.value));

    // Initial Default Load
    loadMailbox('inbox');

    /* ==========================================================================
       Navigation & View Routing
       ========================================================================== */

    /**
     * Controls SPA view toggling and navigation state highlighting.
     * @param {string} targetView - 'emails', 'email-detail', or 'compose'
     * @param {string} activeMailbox - 'inbox', 'sent', or 'archive'
     */
    function showView(targetView, activeMailbox = currentMailbox) {
        clearAlert();

        // Hide all views
        elements.emailsView.style.display = 'none';
        elements.emailDetailView.style.display = 'none';
        elements.composeView.style.display = 'none';

        // Reset navbar active styles
        elements.navInbox?.classList.remove('active');
        elements.navSent?.classList.remove('active');
        elements.navArchived?.classList.remove('active');

        // Show target view
        if (targetView === 'emails') {
            elements.emailsView.style.display = 'block';
            highlightNavButton(activeMailbox);
        } else if (targetView === 'email-detail') {
            elements.emailDetailView.style.display = 'block';
            highlightNavButton(activeMailbox);
        } else if (targetView === 'compose') {
            elements.composeView.style.display = 'block';
        }
    }

    /**
     * Highlights current active navigation button.
     */
    function highlightNavButton(mailbox) {
        if (mailbox === 'inbox') elements.navInbox?.classList.add('active');
        else if (mailbox === 'sent') elements.navSent?.classList.add('active');
        else if (mailbox === 'archive') elements.navArchived?.classList.add('active');
    }

    /* ==========================================================================
       Mailbox Management & Data Fetching
       ========================================================================== */

    /**
     * Fetches and displays emails for a given mailbox ('inbox', 'sent', or 'archive').
     * @param {string} mailbox
     */
    async function loadMailbox(mailbox) {
        currentMailbox = mailbox;
        showView('emails', mailbox);

        // Update Title
        const mailboxNames = { inbox: 'Inbox', sent: 'Sent', archive: 'Archived' };
        elements.mailboxTitle.textContent = mailboxNames[mailbox] || 'Inbox';

        // Clear search input
        if (elements.searchEmailsInput) elements.searchEmailsInput.value = '';

        // Show skeleton loader state
        elements.skeletonLoader.style.display = 'block';
        elements.emptyState.style.display = 'none';
        elements.emailsList.innerHTML = '';

        try {
            const response = await fetch(`/emails/${mailbox}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${mailbox} messages.`);
            }

            const emails = await response.json();
            cachedEmails = emails;

            // Render email cards
            renderEmails(emails, mailbox);
            updateUnreadCountBadge(emails, mailbox);
        } catch (error) {
            console.error('Error loading mailbox:', error);
            showAlert(`Unable to fetch messages: ${error.message}`, 'danger');
        } finally {
            elements.skeletonLoader.style.display = 'none';
        }
    }

    /**
     * Updates the unread badge counter in the navigation bar.
     */
    function updateUnreadCountBadge(emails, mailbox) {
        if (mailbox === 'inbox' && elements.unreadBadge) {
            const unreadCount = emails.filter(email => !email.read).length;
            if (unreadCount > 0) {
                elements.unreadBadge.textContent = unreadCount;
                elements.unreadBadge.style.display = 'inline-block';
            } else {
                elements.unreadBadge.style.display = 'none';
            }
        }
    }

    /**
     * Renders a list of email objects into the DOM using DocumentFragment.
     * @param {Array} emails
     * @param {string} mailbox
     */
    function renderEmails(emails, mailbox) {
        elements.emailsList.innerHTML = '';
        elements.mailboxCount.textContent = `${emails.length} ${emails.length === 1 ? 'message' : 'messages'}`;

        if (emails.length === 0) {
            renderEmptyState(mailbox);
            return;
        }

        elements.emptyState.style.display = 'none';
        const fragment = document.createDocumentFragment();

        emails.forEach(email => {
            const card = renderEmailCard(email, mailbox);
            fragment.appendChild(card);
        });

        elements.emailsList.appendChild(fragment);
    }

    /**
     * Renders empty state graphics and copy when a mailbox has zero messages.
     */
    function renderEmptyState(mailbox) {
        const states = {
            inbox: { title: 'Your inbox is clear', desc: 'No new emails right now. Enjoy your day!' },
            sent: { title: 'No sent messages', desc: 'Emails you send will appear here.' },
            archive: { title: 'Archive is empty', desc: 'Archived conversations will be stored here.' }
        };

        const state = states[mailbox] || states.inbox;
        elements.emptyStateTitle.textContent = state.title;
        elements.emptyStateDesc.textContent = state.desc;
        elements.emptyState.style.display = 'block';
    }

    /**
     * Builds a modern single email Bootstrap card element.
     * @param {Object} email
     * @param {string} mailbox
     * @returns {HTMLElement} card element
     */
    function renderEmailCard(email, mailbox) {
        const card = document.createElement('div');
        card.className = `email-card d-flex align-items-center justify-content-between gap-3 ${email.read ? 'read' : 'unread'}`;
        card.setAttribute('data-id', email.id);

        // Header entity (Sender or Recipients depending on mailbox)
        const displayUser = mailbox === 'sent' ? `To: ${email.recipients.join(', ')}` : email.sender;
        const initial = (mailbox === 'sent' && email.recipients.length > 0 ? email.recipients[0] : email.sender).charAt(0).toUpperCase();

        // Body Preview (Truncated to first 80 chars)
        const preview = email.body.length > 80 ? email.body.substring(0, 80) + '...' : email.body;

        card.innerHTML = `
            <div class="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
                <!-- Unread Blue Dot Badge -->
                <div class="unread-dot-wrapper d-flex align-items-center justify-content-center" style="width: 16px;">
                    ${!email.read ? '<span class="unread-indicator-dot"></span>' : ''}
                </div>

                <!-- Avatar Circle -->
                <div class="avatar-circle rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0" style="width: 40px; height: 40px; font-size: 15px;">
                    ${initial}
                </div>

                <!-- Text Info Block -->
                <div class="min-w-0 flex-grow-1">
                    <div class="d-flex align-items-baseline justify-content-between gap-2">
                        <span class="email-sender text-truncate fs-6 mb-0">${escapeHtml(displayUser)}</span>
                        <span class="email-timestamp text-secondary small flex-shrink-0">${email.timestamp}</span>
                    </div>
                    <div class="email-subject text-truncate fs-6">${escapeHtml(email.subject || '(No Subject)')}</div>
                    <div class="email-preview text-secondary text-truncate small">${escapeHtml(preview)}</div>
                </div>
            </div>
        `;

        // Click Handler to view email details
        card.addEventListener('click', () => openEmail(email.id, mailbox));

        return card;
    }

    /**
     * Filters emails dynamically based on search query.
     */
    function filterEmails(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            renderEmails(cachedEmails, currentMailbox);
            return;
        }

        const filtered = cachedEmails.filter(email => 
            email.sender.toLowerCase().includes(q) ||
            email.recipients.some(r => r.toLowerCase().includes(q)) ||
            email.subject.toLowerCase().includes(q) ||
            email.body.toLowerCase().includes(q)
        );

        renderEmails(filtered, currentMailbox);
    }

    /* ==========================================================================
       Email Detail View & Actions
       ========================================================================== */

    /**
     * Fetches detailed information for a single email and automatically marks it as read.
     * @param {number} id
     * @param {string} mailbox
     */
    async function openEmail(id, mailbox) {
        currentEmailId = id;
        showView('email-detail', mailbox);

        try {
            // Fetch email content
            const response = await fetch(`/emails/${id}`);
            if (!response.ok) {
                throw new Error('Could not fetch email details.');
            }
            const email = await response.json();

            // Render Email Metadata & Content
            elements.detailSubject.textContent = email.subject || '(No Subject)';
            elements.detailSender.textContent = email.sender;
            elements.detailRecipients.textContent = email.recipients.join(', ');
            elements.detailTimestamp.textContent = email.timestamp;
            elements.detailBody.textContent = email.body;
            elements.detailAvatar.textContent = email.sender.charAt(0).toUpperCase();

            // Configure Reply Action Button
            elements.btnReply.onclick = () => replyEmail(email);

            // Configure Archive / Unarchive Action Button
            if (mailbox === 'sent') {
                elements.btnArchive.style.display = 'none';
            } else {
                elements.btnArchive.style.display = 'inline-flex';
                if (email.archived) {
                    elements.archiveBtnText.textContent = 'Unarchive';
                    elements.btnArchive.onclick = () => archiveEmail(email.id, true);
                } else {
                    elements.archiveBtnText.textContent = 'Archive';
                    elements.btnArchive.onclick = () => archiveEmail(email.id, false);
                }
            }

            // Automatically mark email as read if not already read
            if (!email.read) {
                await fetch(`/emails/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ read: true }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }

        } catch (error) {
            console.error('Error fetching email details:', error);
            showAlert(`Unable to open message: ${error.message}`, 'danger');
        }
    }

    /**
     * Toggles archived status of an email via PUT request and navigates to Inbox.
     * @param {number} id
     * @param {boolean} currentArchivedState
     */
    async function archiveEmail(id, currentArchivedState) {
        try {
            const response = await fetch(`/emails/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ archived: !currentArchivedState }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok && response.status !== 204) {
                throw new Error('Failed to update email archive state.');
            }

            showToast(!currentArchivedState ? 'Email archived.' : 'Email moved to inbox.');
            loadMailbox('inbox');
        } catch (error) {
            console.error('Error toggling archive:', error);
            showAlert(`Archive operation failed: ${error.message}`, 'danger');
        }
    }

    /* ==========================================================================
       Compose & Reply Functionality
       ========================================================================== */

    /**
     * Opens the compose view with pre-filled fields.
     */
    function composeEmail(recipients = '', subject = '', body = '') {
        showView('compose');

        elements.composeRecipients.value = recipients;
        elements.composeSubject.value = subject;
        elements.composeBody.value = body;

        // Auto-focus logic
        if (!recipients) {
            elements.composeRecipients.focus();
        } else if (!subject) {
            elements.composeSubject.focus();
        } else {
            elements.composeBody.focus();
        }
    }

    /**
     * Sends email via POST /emails endpoint.
     */
    async function sendEmail(event) {
        event.preventDefault();
        clearAlert();

        const recipients = elements.composeRecipients.value.trim();
        const subject = elements.composeSubject.value.trim();
        const body = elements.composeBody.value.trim();

        // Loading state UI
        elements.btnSendEmail.disabled = true;
        elements.sendSpinner.style.display = 'inline-block';
        elements.sendIcon.style.display = 'none';

        try {
            const response = await fetch('/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients, subject, body })
            });

            const result = await response.json();

            if (response.status === 201) {
                // Success: Navigate to Sent mailbox and notify user
                showToast('Email sent successfully!');
                elements.composeForm.reset();
                loadMailbox('sent');
            } else {
                // Display error message from backend
                showAlert(result.error || 'Failed to send email.', 'danger');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            showAlert(`Network or server error: ${error.message}`, 'danger');
        } finally {
            elements.btnSendEmail.disabled = false;
            elements.sendSpinner.style.display = 'none';
            elements.sendIcon.style.display = 'inline-block';
        }
    }

    /**
     * Pre-fills compose form to reply to an email.
     * @param {Object} email
     */
    function replyEmail(email) {
        // Pre-fill recipient with original sender
        const recipient = email.sender;

        // Pre-fill subject with Re: prefix if not present
        let subject = email.subject || '';
        if (!/^Re:/i.test(subject)) {
            subject = `Re: ${subject}`;
        }

        // Quoted message formatting
        const quotedBody = `\n\nOn ${email.timestamp}, ${email.sender} wrote:\n${email.body.replace(/^/gm, '> ')}`;

        composeEmail(recipient, subject, quotedBody);

        // Position cursor at top of body textarea
        setTimeout(() => {
            if (elements.composeBody) {
                elements.composeBody.setSelectionRange(0, 0);
                elements.composeBody.scrollTop = 0;
            }
        }, 50);
    }

    /* ==========================================================================
       Notification & UI Helpers
       ========================================================================== */

    /**
     * Renders a Bootstrap alert notification inside #alert-container.
     */
    function showAlert(message, type = 'danger') {
        if (!elements.alertContainer) return;

        elements.alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show rounded-3 shadow-sm" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }

    /**
     * Clears all alerts.
     */
    function clearAlert() {
        if (elements.alertContainer) {
            elements.alertContainer.innerHTML = '';
        }
    }

    /**
     * Triggers the global Bootstrap Toast notification popup.
     */
    function showToast(message, iconClass = 'bi-check-circle-fill') {
        if (toastInstance && elements.toastMessage) {
            elements.toastMessage.textContent = message;
            if (elements.toastIcon) elements.toastIcon.className = `bi ${iconClass} fs-5`;
            toastInstance.show();
        }
    }

    /**
     * Utility to prevent HTML injection XSS issues.
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
