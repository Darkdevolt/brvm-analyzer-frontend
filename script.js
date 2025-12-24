// BRVM Observatory - Main JavaScript File

// Configuration
const CONFIG = {
    dataFile: 'data/stocks.json',
    updateInterval: 5 * 60 * 1000, // 5 minutes
    currency: 'XOF',
    maxStocksInChart: 10
};

// Global State
let allStocks = [];
let currentSort = { field: 'symbol', ascending: true };
let charts = {};
let autoRefreshInterval = null;

// DOM Elements
const elements = {
    stocksBody: document.getElementById('stocks-body'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    autoRefresh: document.getElementById('auto-refresh'),
    refreshBtn: document.getElementById('refresh-btn'),
    updateTime: document.getElementById('update-time'),
    stocksCount: document.getElementById('total-stocks'),
    footerUpdate: document.getElementById('footer-update')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadData();
    startAutoRefresh();
});

// Event Listeners
function initializeEventListeners() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(filterTable, 300));
    }
    
    if (elements.clearSearch) {
        elements.clearSearch.addEventListener('click', () => {
            elements.searchInput.value = '';
            filterTable();
        });
    }
    
    if (elements.autoRefresh) {
        elements.autoRefresh.addEventListener('change', toggleAutoRefresh);
    }
    
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', () => {
            loadData(true);
            showNotification('Données actualisées !', 'success');
        });
    }
}

// Load Data from JSON
async function loadData(force = false) {
    try {
        const url = CONFIG.dataFile + (force ? '?t=' + Date.now() : '');
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Données non disponibles');
        }
        
        const data = await response.json();
        
        if (data && data.stocks) {
            allStocks = data.stocks;
            updateUI(data);
            updateIndices(data);
            updateCharts(data);
        } else {
            throw new Error('Format de données invalide');
        }
    } catch (error) {
        console.error('Erreur de chargement:', error);
        showNotification('Erreur de chargement des données', 'error');
        updateErrorState(error.message);
    }
}

// Update Table
function updateUI(data) {
    updateStocksTable(allStocks);
    updateTimeElements(data.timestamp);
    updateStockCount();
}

function updateStocksTable(stocks) {
    if (!elements.stocksBody) return;
    
    elements.stocksBody.innerHTML = '';
    
    if (!stocks || stocks.length === 0) {
        elements.stocksBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                    <p>Aucune donnée disponible</p>
                </td>
            </tr>
        `;
        return;
    }
    
    stocks.forEach((stock, index) => {
        const variationClass = stock.variation > 0 ? 'stock-up' : 
                             stock.variation < 0 ? 'stock-down' : 'stock-neutral';
        
        const variationIcon = stock.variation > 0 ? '▲' : 
                            stock.variation < 0 ? '▼' : '●';
        
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.style.animationDelay = `${index * 0.05}s`;
        
        row.innerHTML = `
            <td>
                <span class="badge bg-light text-dark fw-bold">${stock.symbol}</span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="symbol-circle me-2">
                        ${stock.symbol.charAt(0)}
                    </div>
                    <div>
                        <strong>${stock.name}</strong>
                        ${stock.sector ? `<div class="small text-muted">${stock.sector}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <strong>${formatCurrency(stock.last_price)}</strong>
            </td>
            <td class="${variationClass}">
                ${variationIcon} ${Math.abs(stock.variation).toFixed(2)}%
            </td>
            <td>${formatNumber(stock.volume)}</td>
            <td>${formatCurrency(stock.last_price * stock.volume)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" 
                        onclick="showStockDetails('${stock.symbol}')"
                        title="Détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success"
                        onclick="addToWatchlist('${stock.symbol}')"
                        title="Suivre">
                    <i class="fas fa-star"></i>
                </button>
            </td>
        `;
        
        elements.stocksBody.appendChild(row);
    });
}

// Update Indices
function updateIndices(data) {
    if (!data || !data.stocks) return;
    
    const stocks = data.stocks;
    
    // Calculate market metrics
    const totalVolume = stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);
    const avgChange = stocks.length > 0 ? 
        stocks.reduce((sum, stock) => sum + (stock.variation || 0), 0) / stocks.length : 0;
    
    // Update DOM elements
    updateElementText('total-volume', formatNumber(totalVolume));
    updateElementText('avg-change', avgChange.toFixed(2) + '%');
    updateElementText('stocks-count', stocks.length);
    
    // Add variation class to average change
    const avgChangeElement = document.getElementById('avg-change');
    if (avgChangeElement) {
        avgChangeElement.className = avgChange > 0 ? 'stock-up' : 
                                   avgChange < 0 ? 'stock-down' : 'stock-neutral';
    }
}

// Update Charts
function updateCharts(data) {
    if (!data || !data.stocks) return;
    
    updatePerformanceChart(data.stocks);
    updateSectorChart(data.stocks);
}

function updatePerformanceChart(stocks) {
    const canvas = document.getElementById('performance-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Sort by absolute variation
    const topPerformers = [...stocks]
        .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))
        .slice(0, CONFIG.maxStocksInChart);
    
    if (charts.performance) {
        charts.performance.destroy();
    }
    
    charts.performance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPerformers.map(s => s.symbol),
            datasets: [{
                label: 'Variation (%)',
                data: topPerformers.map(s => s.variation),
                backgroundColor: topPerformers.map(s => 
                    s.variation > 0 ? 'rgba(39, 174, 96, 0.8)' : 
                    s.variation < 0 ? 'rgba(231, 76, 60, 0.8)' : 
                    'rgba(127, 140, 141, 0.8)'
                ),
                borderColor: topPerformers.map(s => 
                    s.variation > 0 ? '#27ae60' : 
                    s.variation < 0 ? '#e74c3c' : 
                    '#7f8c8d'
                ),
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Variation (%)'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateSectorChart(stocks) {
    const canvas = document.getElementById('sector-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Group by sector (if available)
    const sectors = {};
    stocks.forEach(stock => {
        const sector = stock.sector || 'Non spécifié';
        sectors[sector] = (sectors[sector] || 0) + 1;
    });
    
    const colors = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
        '#9b59b6', '#1abc9c', '#34495e', '#95a5a6',
        '#d35400', '#c0392b'
    ];
    
    if (charts.sectors) {
        charts.sectors.destroy();
    }
    
    charts.sectors = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sectors),
            datasets: [{
                data: Object.values(sectors),
                backgroundColor: colors.slice(0, Object.keys(sectors).length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// Utility Functions
function formatCurrency(value) {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: CONFIG.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR').format(value);
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateTimeElements(timestamp) {
    const formatted = formatDate(timestamp);
    updateElementText('update-time', formatted);
    updateElementText('footer-update', formatted);
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function updateStockCount() {
    if (elements.stocksCount) {
        elements.stocksCount.textContent = allStocks.length;
    }
}

// Table Functions
function sortTable(field, numeric = false) {
    const isSameField = currentSort.field === field;
    
    if (isSameField) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.field = field;
        currentSort.ascending = true;
    }
    
    const sortedStocks = [...allStocks].sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        
        if (numeric) {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
        }
        
        if (aValue < bValue) return currentSort.ascending ? -1 : 1;
        if (aValue > bValue) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    
    updateStocksTable(sortedStocks);
    updateSortIndicators(field);
}

function updateSortIndicators(field) {
    // Remove all sort indicators
    document.querySelectorAll('.sort-indicator').forEach(el => {
        el.className = 'sort-indicator fas fa-sort';
    });
    
    // Add indicator to current field
    const indicator = document.querySelector(`[data-sort="${field}"]`);
    if (indicator) {
        indicator.className = currentSort.ascending ? 
            'sort-indicator fas fa-sort-up' : 
            'sort-indicator fas fa-sort-down';
    }
}

function filterTable() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        updateStocksTable(allStocks);
        return;
    }
    
    const filtered = allStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm) ||
        stock.name.toLowerCase().includes(searchTerm) ||
        (stock.sector && stock.sector.toLowerCase().includes(searchTerm))
    );
    
    updateStocksTable(filtered);
}

// Stock Details
function showStockDetails(symbol) {
    const stock = allStocks.find(s => s.symbol === symbol);
    if (!stock) return;
    
    updateElementText('detail-symbol', stock.symbol);
    updateElementText('detail-name', stock.name);
    updateElementText('detail-price', formatCurrency(stock.last_price));
    updateElementText('detail-change', `${stock.variation.toFixed(2)}%`);
    updateElementText('detail-volume', formatNumber(stock.volume));
    updateElementText('detail-value', formatCurrency(stock.last_price * stock.volume));
    
    // Set variation color
    const changeElement = document.getElementById('detail-change');
    if (changeElement) {
        changeElement.className = stock.variation > 0 ? 'stock-up' : 
                                 stock.variation < 0 ? 'stock-down' : 'stock-neutral';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('stockModal'));
    modal.show();
}

// Watchlist
function addToWatchlist(symbol) {
    let watchlist = JSON.parse(localStorage.getItem('brvm_watchlist') || '[]');
    
    if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        localStorage.setItem('brvm_watchlist', JSON.stringify(watchlist));
        showNotification(`${symbol} ajouté à votre liste de suivi`, 'success');
    } else {
        showNotification(`${symbol} est déjà dans votre liste de suivi`, 'info');
    }
}

// Export Functions
function exportToCSV() {
    if (!allStocks.length) return;
    
    const headers = ['Symbole', 'Société', 'Cours', 'Variation%', 'Volume', 'Valeur'];
    const csvData = [
        headers.join(','),
        ...allStocks.map(stock => [
            stock.symbol,
            `"${stock.name}"`,
            stock.last_price,
            stock.variation,
            stock.volume,
            stock.last_price * stock.volume
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `brvm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Export CSV terminé', 'success');
}

function printTable() {
    window.print();
}

// Auto Refresh
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(() => {
        if (elements.autoRefresh.checked) {
            loadData();
        }
    }, CONFIG.updateInterval);
}

function toggleAutoRefresh() {
    if (elements.autoRefresh.checked) {
        startAutoRefresh();
        showNotification('Actualisation automatique activée', 'success');
    } else {
        clearInterval(autoRefreshInterval);
        showNotification('Actualisation automatique désactivée', 'info');
    }
}

// Error Handling
function updateErrorState(message) {
    if (elements.stocksBody) {
        elements.stocksBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <p>${message || 'Erreur de chargement'}</p>
                    <button class="btn btn-primary mt-2" onclick="loadData(true)">
                        <i class="fas fa-redo me-1"></i> Réessayer
                    </button>
                </td>
            </tr>
        `;
    }
}

// Helper Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Style notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Global functions for HTML onclick attributes
window.sortTable = sortTable;
window.showStockDetails = showStockDetails;
window.addToWatchlist = addToWatchlist;
window.exportToCSV = exportToCSV;
window.printTable = printTable;
