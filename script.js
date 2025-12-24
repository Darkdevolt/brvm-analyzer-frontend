// TRI et FILTRAGE (Nouvelles fonctions à ajouter)
let currentSort = { column: null, order: 'asc' };

function sortTable(columnIndex) {
    const tbody = document.getElementById('stocks-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Détermine l'ordre de tri
    const isNumeric = columnIndex === 2 || columnIndex === 3 || columnIndex === 7; // Colonnes prix, variation, volume
    const multiplier = currentSort.order === 'asc' ? 1 : -1;
    
    rows.sort((a, b) => {
        const aCell = a.cells[columnIndex].textContent;
        const bCell = b.cells[columnIndex].textContent;
        
        let aValue = isNumeric ? parseFloat(aCell.replace(/[^\d.-]/g, '')) : aCell;
        let bValue = isNumeric ? parseFloat(bCell.replace(/[^\d.-]/g, '')) : bCell;
        
        if (aValue < bValue) return -1 * multiplier;
        if (aValue > bValue) return 1 * multiplier;
        return 0;
    });
    
    // Inverse l'ordre pour le prochain clic
    if (currentSort.column === columnIndex) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = columnIndex;
        currentSort.order = 'asc';
    }
    
    // Réinsère les lignes triées
    rows.forEach(row => tbody.appendChild(row));
    updateSortIcons(columnIndex);
}

function updateSortIcons(activeColumn) {
    // Met à jour les icônes de tri dans les en-têtes
    document.querySelectorAll('th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const activeTh = document.querySelectorAll('th')[activeColumn];
    if (activeTh && currentSort.column === activeColumn) {
        const icon = activeTh.querySelector('i');
        if (icon) {
            icon.className = currentSort.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }
}

function filterTable() {
    const input = document.getElementById('search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#stocks-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(input) ? '' : 'none';
    });
}

// MODAL pour les détails (Nouvelle fonction)
function showDetails(stockSymbol) {
    // Trouve les données du stock
    const stock = allStocks.find(s => s.symbol === stockSymbol);
    if (!stock) return;
    
    // Remplit la modal (tu dois ajouter la modal HTML)
    document.getElementById('detail-symbol').textContent = stock.symbol;
    document.getElementById('detail-name').textContent = stock.name;
    document.getElementById('detail-price').textContent = formatCurrency(stock.last_price);
    document.getElementById('detail-change').textContent = `${stock.variation.toFixed(2)}%`;
    document.getElementById('detail-change').className = stock.variation > 0 ? 'positive' : 'negative';
    document.getElementById('detail-volume').textContent = formatNumber(stock.volume);
    
    // Affiche la modal
    const modal = new bootstrap.Modal(document.getElementById('stockModal'));
    modal.show();
}
