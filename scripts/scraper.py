import requests
from bs4 import BeautifulSoup
import json
import os

def scrape_brvm():
    # URL du site officiel de la BRVM (à vérifier et ajuster)
    url = "https://www.brvm.org/fr/cours/0?index=all"

    # Entêtes pour simuler un navigateur
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Ici, vous devez inspecter le HTML du site de la BRVM pour extraire les données
    # Ceci est un exemple adaptatif, à modifier selon la structure réelle du site

    stocks = []

    # Exemple : supposons que les données sont dans un tableau avec id 'table-cours'
    table = soup.find('table', {'id': 'table-cours'})
    if table:
        rows = table.find('tbody').find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 5:
                symbol = cols[0].text.strip()
                name = cols[1].text.strip()
                price = float(cols[2].text.strip().replace(' ', '').replace(',', '.'))
                change = float(cols[3].text.strip().replace('%', '').replace(',', '.'))
                volume = int(cols[4].text.strip().replace(' ', ''))

                stock = {
                    'symbol': symbol,
                    'name': name,
                    'price': price,
                    'change': change,
                    'volume': volume
                }
                stocks.append(stock)

    # Si le tableau n'est pas trouvé, on utilise des données d'exemple
    if not stocks:
        print("Aucune donnée trouvée, utilisation de données d'exemple.")
        stocks = [
            {
                "symbol": "SGBC",
                "name": "Société Générale Bénin",
                "price": 14500,
                "change": 1.2,
                "volume": 12500
            },
            {
                "symbol": "ETIT",
                "name": "Ecobank Transnational Inc",
                "price": 12000,
                "change": -0.5,
                "volume": 8900
            },
            {
                "symbol": "BOAB",
                "name": "Bank of Africa Bénin",
                "price": 9800,
                "change": 2.1,
                "volume": 7500
            }
        ]

    # Sauvegarde dans le fichier JSON
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    with open(os.path.join(data_dir, 'stocks.json'), 'w', encoding='utf-8') as f:
        json.dump(stocks, f, ensure_ascii=False, indent=2)

    print(f"{len(stocks)} titres mis à jour.")

if __name__ == "__main__":
    scrape_brvm()
