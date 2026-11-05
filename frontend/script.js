/**
 * Serverless Web Application Client
 * Interacts with AWS Lambda + DynamoDB REST API or local mock server.
 * Supports:
 *   - Atomic Visitor View Counter
 *   - DynamoDB CRUD (Create, Read, Update, Delete)
 *   - Instant Search & Category Filtering
 *   - In-memory fallback / Offline demo mode
 *   - Toast notifications & connection test
 */

// State
let API_BASE = localStorage.getItem('serverless_api_url') || '';
let itemsList = [];
let isDemoMode = false;

// In-browser mock store for offline or preview mode
let demoDb = {
    views: 84,
    items: [
        {
            id: 'demo-1',
            title: 'Deploy Lambda with Atomic DynamoDB Counter',
            description: 'Implemented atomic increments to prevent race conditions during concurrent visitor requests.',
            status: 'completed',
            category: 'Architecture',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
            id: 'demo-2',
            title: 'Automate Infrastructure with Terraform',
            description: 'Created modular Terraform configuration for API Gateway v2 HTTP API, Lambda, and DynamoDB.',
            status: 'in-progress',
            category: 'DevOps',
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
            id: 'demo-3',
            title: 'Setup Amazon CloudFront CDN & S3',
            description: 'Configured Origin Access Control (OAC) and HTTPS redirection for low-latency static hosting.',
            status: 'active',
            category: 'Security',
            createdAt: new Date().toISOString()
        }
    ]
};

// DOM Elements
const counterNumber = document.getElementById('counterNumber');
const refreshCounterBtn = document.getElementById('refreshCounterBtn');
const greetingForm = document.getElementById('greetingForm');
const nameInput = document.getElementById('nameInput');
const greetingOutput = document.getElementById('greetingOutput');
const greeting = document.getElementById('greeting');
const greetingTimestamp = document.getElementById('greetingTimestamp');

const itemsContainer = document.getElementById('itemsContainer');
const itemsLoading = document.getElementById('itemsLoading');
const itemsEmpty = document.getElementById('itemsEmpty');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

const newItemBtn = document.getElementById('newItemBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const itemIdInput = document.getElementById('itemId');
const itemTitleInput = document.getElementById('itemTitle');
const itemCategoryInput = document.getElementById('itemCategory');
const itemStatusInput = document.getElementById('itemStatus');
const itemDescriptionInput = document.getElementById('itemDescription');

const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const apiUrlInput = document.getElementById('apiUrlInput');
const testApiBtn = document.getElementById('testApiBtn');
const saveApiBtn = document.getElementById('saveApiBtn');
const presetLocalBtn = document.getElementById('presetLocalBtn');
const presetMockBtn = document.getElementById('presetMockBtn');
const apiTestStatus = document.getElementById('apiTestStatus');
const currentModeLabel = document.getElementById('currentModeLabel');
const toastContainer = document.getElementById('toastContainer');

// --- Helper Functions ---

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function updateModeBadge() {
    if (isDemoMode) {
        currentModeLabel.textContent = 'Browser Demo';
        currentModeLabel.style.color = '#f59e0b';
    } else if (API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
        currentModeLabel.textContent = 'Local Dev Server';
        currentModeLabel.style.color = '#38bdf8';
    } else if (API_BASE.startsWith('http')) {
        currentModeLabel.textContent = 'AWS Cloud API';
        currentModeLabel.style.color = '#10b981';
    } else {
        currentModeLabel.textContent = 'Auto / Relative';
        currentModeLabel.style.color = '#818cf8';
    }
}

function getApiUrl(path) {
    if (!API_BASE) return path;
    const cleanBase = API_BASE.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${cleanBase}${cleanPath}`;
}

// --- Visitor Counter ---

async function fetchCounter() {
    counterNumber.textContent = '...';
    if (isDemoMode) {
        demoDb.views += 1;
        animateNumber(counterNumber, demoDb.views);
        return;
    }

    try {
        const response = await fetch(getApiUrl('/views'), {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const views = typeof data === 'object' && data.views !== undefined ? data.views : data;
        animateNumber(counterNumber, views);
    } catch (err) {
        console.warn('Backend API unavailable for counter, falling back to local demo:', err);
        isDemoMode = true;
        updateModeBadge();
        demoDb.views += 1;
        animateNumber(counterNumber, demoDb.views);
    }
}

function animateNumber(element, target) {
    const start = parseInt(element.textContent, 10) || 0;
    const diff = target - start;
    if (diff === 0 || isNaN(diff)) {
        element.textContent = target;
        return;
    }
    element.textContent = target;
}

// --- Greeting Form ---

greetingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    greeting.textContent = `Welcome to Serverless AWS, ${name}!`;
    greetingTimestamp.textContent = `Logged at ${new Date().toLocaleTimeString()} • Verified Serverless Session`;
    greetingOutput.classList.remove('hidden');
    showToast(`Hello, ${name}!`, 'success');
});

// --- Items CRUD Operations ---

async function fetchItems() {
    itemsLoading.classList.remove('hidden');
    itemsEmpty.classList.add('hidden');
    itemsContainer.innerHTML = '';

    if (isDemoMode) {
        setTimeout(() => {
            itemsList = [...demoDb.items];
            itemsLoading.classList.add('hidden');
            renderItems(itemsList);
        }, 200);
        return;
    }

    try {
        const response = await fetch(getApiUrl('/items'), { credentials: 'omit' });
        if (!response.ok) throw new Error(`Failed to load items: HTTP ${response.status}`);
        const data = await response.json();
        itemsList = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
        itemsLoading.classList.add('hidden');
        renderItems(itemsList);
    } catch (err) {
        console.warn('Failed to fetch from backend, switching to Demo Mode:', err);
        isDemoMode = true;
        updateModeBadge();
        itemsList = [...demoDb.items];
        itemsLoading.classList.add('hidden');
        renderItems(itemsList);
        showToast('Connected in Offline Demo Mode', 'info');
    }
}

function renderItems(items) {
    itemsContainer.innerHTML = '';

    const query = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filtered = items.filter(item => {
        const matchesQuery = (item.title && item.title.toLowerCase().includes(query)) ||
                             (item.description && item.description.toLowerCase().includes(query));
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesQuery && matchesCategory;
    });

    if (filtered.length === 0) {
        itemsEmpty.classList.remove('hidden');
        return;
    }

    itemsEmpty.classList.add('hidden');

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        const statusClass = `badge-${item.status || 'active'}`;
        const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent';

        card.innerHTML = `
            <div>
                <div class="item-card-header">
                    <h3 class="item-title">${escapeHtml(item.title)}</h3>
                    <span class="badge ${statusClass}">${escapeHtml(item.status || 'active')}</span>
                </div>
                <p class="item-desc">${escapeHtml(item.description || 'No description provided.')}</p>
            </div>
            <div class="item-footer">
                <div class="item-meta">
                    <span class="badge badge-category">${escapeHtml(item.category || 'General')}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${formattedDate}</span>
                </div>
                <div class="item-actions">
                    <button class="action-btn edit-btn" title="Edit Item" data-id="${item.id}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="Delete Item" data-id="${item.id}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Card button handlers
        card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(item));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));

        itemsContainer.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Modal open/close
function openCreateModal() {
    modalTitle.textContent = 'Create New Item';
    itemIdInput.value = '';
    itemTitleInput.value = '';
    itemCategoryInput.value = 'Architecture';
    itemStatusInput.value = 'active';
    itemDescriptionInput.value = '';
    itemModal.classList.remove('hidden');
    itemTitleInput.focus();
}

function openEditModal(item) {
    modalTitle.textContent = 'Edit Item';
    itemIdInput.value = item.id;
    itemTitleInput.value = item.title || '';
    itemCategoryInput.value = item.category || 'general';
    itemStatusInput.value = item.status || 'active';
    itemDescriptionInput.value = item.description || '';
    itemModal.classList.remove('hidden');
    itemTitleInput.focus();
}

function closeModal() {
    itemModal.classList.add('hidden');
}

// Item form submission (Create or Update)
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = itemIdInput.value;
    const title = itemTitleInput.value.trim();
    const category = itemCategoryInput.value;
    const status = itemStatusInput.value;
    const description = itemDescriptionInput.value.trim();

    if (!title) return;

    const payload = { title, category, status, description };

    if (isDemoMode) {
        if (id) {
            // Update
            const index = demoDb.items.findIndex(i => i.id === id);
            if (index !== -1) {
                demoDb.items[index] = { ...demoDb.items[index], ...payload, updatedAt: new Date().toISOString() };
                showToast('Item updated successfully (Demo Mode)', 'success');
            }
        } else {
            // Create
            const newItem = {
                id: 'demo-' + Date.now(),
                ...payload,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            demoDb.items.unshift(newItem);
            showToast('Item created successfully (Demo Mode)', 'success');
        }
        closeModal();
        fetchItems();
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? getApiUrl(`/items/${id}`) : getApiUrl('/items');

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        showToast(id ? 'Item updated in DynamoDB!' : 'Item stored in DynamoDB!', 'success');
        closeModal();
        fetchItems();
    } catch (err) {
        console.error('Error saving item:', err);
        showToast(`Failed to save: ${err.message}`, 'error');
    }
});

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item from DynamoDB?')) return;

    if (isDemoMode) {
        demoDb.items = demoDb.items.filter(i => i.id !== id);
        showToast('Item removed (Demo Mode)', 'info');
        fetchItems();
        return;
    }

    try {
        const response = await fetch(getApiUrl(`/items/${id}`), {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        showToast('Item deleted from DynamoDB', 'info');
        fetchItems();
    } catch (err) {
        console.error('Error deleting item:', err);
        showToast(`Delete failed: ${err.message}`, 'error');
    }
}

// --- Search & Filter Listeners ---
searchInput.addEventListener('input', () => renderItems(itemsList));
categoryFilter.addEventListener('change', () => renderItems(itemsList));

newItemBtn.addEventListener('click', openCreateModal);
emptyAddBtn.addEventListener('click', openCreateModal);
modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);

refreshCounterBtn.addEventListener('click', fetchCounter);

// --- API Settings Modal Listeners ---

openSettingsBtn.addEventListener('click', () => {
    apiUrlInput.value = API_BASE;
    apiTestStatus.classList.add('hidden');
    settingsModal.classList.remove('hidden');
});

function closeSettings() {
    settingsModal.classList.add('hidden');
}

settingsCloseBtn.addEventListener('click', closeSettings);
settingsBackdrop.addEventListener('click', closeSettings);

presetLocalBtn.addEventListener('click', () => {
    apiUrlInput.value = 'http://localhost:3000';
});

presetMockBtn.addEventListener('click', () => {
    apiUrlInput.value = '';
    isDemoMode = true;
    updateModeBadge();
    apiTestStatus.className = 'api-test-status success';
    apiTestStatus.textContent = 'Browser Demo Mode activated with local mock data.';
    apiTestStatus.classList.remove('hidden');
});

testApiBtn.addEventListener('click', async () => {
    const testUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
    apiTestStatus.className = 'api-test-status';
    apiTestStatus.textContent = 'Pinging endpoint...';
    apiTestStatus.classList.remove('hidden');

    try {
        const target = testUrl ? `${testUrl}/views` : '/views';
        const res = await fetch(target);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        apiTestStatus.className = 'api-test-status success';
        apiTestStatus.textContent = `✓ Success! Endpoint responded (views: ${data.views || data})`;
    } catch (err) {
        apiTestStatus.className = 'api-test-status error';
        apiTestStatus.textContent = `✗ Connection failed: ${err.message}. Check CORS or endpoint URL.`;
    }
});

saveApiBtn.addEventListener('click', () => {
    API_BASE = apiUrlInput.value.trim().replace(/\/+$/, '');
    localStorage.setItem('serverless_api_url', API_BASE);
    isDemoMode = false;
    updateModeBadge();
    showToast('API Configuration saved!', 'success');
    closeSettings();
    fetchCounter();
    fetchItems();
});

// --- Initialization ---

function init() {
    updateModeBadge();
    fetchCounter();
    fetchItems();
}

document.addEventListener('DOMContentLoaded', init);
