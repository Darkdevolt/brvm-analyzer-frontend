// Fonction pour charger les données depuis le fichier JSON
async function loadStockData() {
    try {
        // Nous chargeons le fichier data/stocks.json
        const response = await fetch('data/stocks.json');
        const stocks = await response.json();

        // Remplir le tableau
        const tbody = document.getElementById('stocks-body');
        tbody.innerHTML = '';

        stocks.forEach(stock => {
            const row = document.createElement('tr');
            // Appliquer une classe en fonction de la variation
            let changeClass = 'text-success';
            if (stock.change < 0) {
                changeClass = 'text-danger';
            }

            row.innerHTML = `
                <td>${stock.symbol}</td>
                <td>${stock.name}</td>
                <td>${stock.price.toLocaleString('fr-FR')}</td>
                <td class="${changeClass}">${stock.change > 0 ? '+' : ''}${stock.change}%</td>
                <td>${stock.volume.toLocaleString('fr-FR')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="addToWatchlist('${stock.symbol}')">
                        <i class="fas fa-eye"></i> Suivre
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Mettre à jour le graphique
        updateChart(stocks);
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        document.getElementById('stocks-body').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Erreur de chargement des données. Veuillez réessayer plus tard.
                </td>
            </tr>
        `;
    }
}

// Fonction pour ajouter un titre à la watchlist (stockée en localStorage)
function addToWatchlist(symbol) {
    let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        alert(`Le titre ${symbol} a été ajouté à votre watchlist.`);
    } else {
        alert(`Le titre ${symbol} est déjà dans votre watchlist.`);
    }
}

// Fonction pour mettre à jour le graphique avec Chart.js
function updateChart(stocks) {
    const ctx = document.getElementById('price-chart').getContext('2d');

    // Trier les titres par prix décroissant pour le graphique
    const sortedStocks = [...stocks].sort((a, b) => b.price - a.price);

    const labels = sortedStocks.map(stock => stock.symbol);
    const prices = sortedStocks.map(stock => stock.price);

    // Détruire le graphique précédent s'il existe
    if (window.priceChart) {
        window.priceChart.destroy();
    }

    window.priceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix (XOF)',
                data: prices,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' XOF';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Prix: ${context.parsed.y.toLocaleString('fr-FR')} XOF`;
                        }
                    }
                }
            }
        }
    });
}

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', loadStockData);
